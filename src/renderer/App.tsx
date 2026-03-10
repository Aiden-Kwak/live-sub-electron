import { useCallback, useEffect, useRef, useState } from "react";
import type { Language, TranslateEngine, LlmModel, TokenUsage, TranslationEntry } from "./lib/types";
import { translate, getLanguages } from "./lib/electron-api";
import { useSpeechRecognition } from "./hooks/useSpeechRecognition";
import { useSettings } from "./hooks/useSettings";
import { LanguageSelector } from "./components/LanguageSelector";
import { MicButton } from "./components/MicButton";
import { StatusIndicator } from "./components/StatusIndicator";
import { TranslationDisplay } from "./components/TranslationDisplay";
import { SettingsPanel } from "./components/SettingsPanel";
import { ToastContainer, useToasts } from "./components/Toast";

const SPEECH_LANGUAGES: Language[] = [
  { code: "ko-KR", name: "Korean" },
  { code: "en-US", name: "English (US)" },
  { code: "en-GB", name: "English (UK)" },
  { code: "ja-JP", name: "Japanese" },
  { code: "zh-CN", name: "Chinese (Simplified)" },
  { code: "zh-TW", name: "Chinese (Traditional)" },
  { code: "es-ES", name: "Spanish" },
  { code: "fr-FR", name: "French" },
  { code: "de-DE", name: "German" },
  { code: "pt-BR", name: "Portuguese (Brazil)" },
  { code: "ru-RU", name: "Russian" },
  { code: "ar-SA", name: "Arabic" },
  { code: "hi-IN", name: "Hindi" },
  { code: "vi-VN", name: "Vietnamese" },
  { code: "th-TH", name: "Thai" },
  { code: "it-IT", name: "Italian" },
];

export default function App() {
  const [targetLanguages, setTargetLanguages] = useState<Language[]>([]);
  const [isLoadingLanguages, setIsLoadingLanguages] = useState(true);

  const [isTranslating, setIsTranslating] = useState(false);

  const [interimText, setInterimText] = useState("");
  const [entries, setEntries] = useState<TranslationEntry[]>([]);

  // Token usage tracking
  const [totalTokens, setTotalTokens] = useState<TokenUsage>({
    prompt_tokens: 0,
    completion_tokens: 0,
    total_tokens: 0,
  });
  const [requestCount, setRequestCount] = useState(0);

  const [isOnline, setIsOnline] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const { toasts, addToast, dismissToast } = useToasts();
  const { config, isLoaded, setFontSize, toggleShowOriginal, updateConfig } = useSettings();

  // Derived state from config
  const sourceLanguage = config.sourceLanguage;
  const targetLanguage = config.targetLanguage;
  const engine = config.engine;
  const model = config.model;
  const context = config.context;

  // Refs for stable callback access
  const sourceLanguageRef = useRef(sourceLanguage);
  const targetLanguageRef = useRef(targetLanguage);
  const engineRef = useRef(engine);
  const modelRef = useRef(model);
  const contextRef = useRef(context);
  const entriesRef = useRef(entries);

  useEffect(() => { sourceLanguageRef.current = sourceLanguage; }, [sourceLanguage]);
  useEffect(() => { targetLanguageRef.current = targetLanguage; }, [targetLanguage]);
  useEffect(() => { engineRef.current = engine; }, [engine]);
  useEffect(() => { modelRef.current = model; }, [model]);
  useEffect(() => { contextRef.current = context; }, [context]);
  useEffect(() => { entriesRef.current = entries; }, [entries]);

  // Fetch target languages via IPC
  useEffect(() => {
    let cancelled = false;
    async function fetchLanguages() {
      try {
        const data = await getLanguages();
        if (!cancelled) {
          setTargetLanguages(data.languages);
          setIsLoadingLanguages(false);
        }
      } catch {
        if (!cancelled) {
          setTargetLanguages([
            { code: "en", name: "English" },
            { code: "ko", name: "Korean" },
            { code: "ja", name: "Japanese" },
            { code: "zh", name: "Chinese" },
            { code: "es", name: "Spanish" },
            { code: "fr", name: "French" },
            { code: "de", name: "German" },
          ]);
          setIsLoadingLanguages(false);
          addToast("Could not fetch languages. Using defaults.");
        }
      }
    }
    fetchLanguages();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Online/offline detection
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      addToast("Network connection lost. Translation may not work.", "error");
    };
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Track the latest provisional entry ID so final results can replace it
  const provisionalIdRef = useRef<string | null>(null);

  const handleSpeechResult = useCallback(
    async (result: { transcript: string; isFinal: boolean; confidence: number; isForced?: boolean }) => {
      if (!result.isFinal) {
        setInterimText(result.transcript);
        return;
      }
      // Keep showing recognized text as interim while translating (don't clear yet)
      const text = result.transcript.trim();
      if (!text) return;

      const isForced = result.isForced ?? false;
      const sourceLangCode = sourceLanguageRef.current.split("-")[0];
      const currentEngine = engineRef.current;
      const currentModel = modelRef.current;
      const currentContext = contextRef.current;
      const recentEntries = entriesRef.current.slice(-5).map(
        (e) => `${e.originalText} -> ${e.translatedText}`
      );

      try {
        const translated = await translate({
          text,
          source_language: sourceLangCode,
          target_language: targetLanguageRef.current,
          engine: currentEngine,
          model: currentEngine === "llm" ? currentModel : undefined,
          context: currentEngine === "llm" ? currentContext : undefined,
          previous_translations: currentEngine === "llm" ? recentEntries : undefined,
        });

        setInterimText(""); // Clear recognized text now that translation is ready

        if (isForced) {
          // Forced interim: add as provisional entry
          const entryId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
          provisionalIdRef.current = entryId;
          const entry: TranslationEntry = {
            id: entryId,
            originalText: text,
            translatedText: translated.translated_text,
            confidence: result.confidence,
            timestamp: Date.now(),
            provisional: true,
          };
          setEntries((prev) => [...prev, entry]);
        } else {
          // Real final: replace provisional entries or add new
          const prevProvisionalId = provisionalIdRef.current;
          provisionalIdRef.current = null;

          const entry: TranslationEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            originalText: text,
            translatedText: translated.translated_text,
            confidence: result.confidence,
            timestamp: Date.now(),
          };

          setEntries((prev) => {
            if (prevProvisionalId) {
              // Remove all provisional entries and add the final one
              const filtered = prev.filter((e) => !e.provisional);
              return [...filtered, entry];
            }
            return [...prev, entry];
          });
        }

        if (translated.token_usage) {
          setTotalTokens((prev) => ({
            prompt_tokens: prev.prompt_tokens + translated.token_usage!.prompt_tokens,
            completion_tokens: prev.completion_tokens + translated.token_usage!.completion_tokens,
            total_tokens: prev.total_tokens + translated.token_usage!.total_tokens,
          }));
          setRequestCount((prev) => prev + 1);
        }
      } catch (err) {
        setInterimText(""); // Clear on error too
        if (!isForced) {
          const entry: TranslationEntry = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            originalText: text,
            translatedText: `[Translation failed] ${text}`,
            confidence: result.confidence,
            timestamp: Date.now(),
          };
          setEntries((prev) => [...prev, entry]);
        }
        const message = err instanceof Error ? err.message : "Translation request failed";
        addToast(message, "error");
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const handleSpeechError = useCallback(
    (error: string) => { addToast(error, "error"); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const { start: startRecognition, stop: stopRecognition, micStatus } =
    useSpeechRecognition({
      language: sourceLanguage,
      onResult: handleSpeechResult,
      onError: handleSpeechError,
    });

  const handleToggle = useCallback(() => {
    if (isTranslating) {
      stopRecognition();
      setIsTranslating(false);
      setInterimText("");
    } else {
      setIsTranslating(true);
      setEntries([]);
      setInterimText("");
      setTotalTokens({ prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 });
      setRequestCount(0);
      startRecognition();
    }
  }, [isTranslating, startRecognition, stopRecognition]);

  const handleSourceLanguageChange = useCallback(
    (code: string) => { updateConfig({ sourceLanguage: code }); },
    [updateConfig]
  );

  const handleTargetLanguageChange = useCallback(
    (code: string) => { updateConfig({ targetLanguage: code }); },
    [updateConfig]
  );

  const handleEngineChange = useCallback(
    (eng: TranslateEngine) => { updateConfig({ engine: eng }); },
    [updateConfig]
  );

  const handleModelChange = useCallback(
    (m: LlmModel) => { updateConfig({ model: m }); },
    [updateConfig]
  );

  const handleContextChange = useCallback(
    (ctx: string) => { updateConfig({ context: ctx }); },
    [updateConfig]
  );

  return (
    <main className="h-screen bg-gray-950 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950/80 backdrop-blur-sm shrink-0">
        <h1 className="text-lg font-bold text-white tracking-tight">LiveSub</h1>
        <div className="flex items-center gap-3">
          <StatusIndicator micStatus={micStatus} isOnline={isOnline} />
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-gray-800"
            aria-label="Open settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Controls */}
      <section className="px-4 py-3 border-b border-gray-800/50 shrink-0">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center gap-3">
          <div className="flex gap-3 flex-1 w-full sm:w-auto">
            <div className="flex-1">
              <LanguageSelector label="Source" languages={SPEECH_LANGUAGES} value={sourceLanguage} onChange={handleSourceLanguageChange} disabled={isTranslating} />
            </div>
            <div className="flex items-end pb-2.5 text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="flex-1">
              <LanguageSelector label="Target" languages={isLoadingLanguages ? [{ code: "en", name: "Loading..." }] : targetLanguages} value={targetLanguage} onChange={handleTargetLanguageChange} disabled={isTranslating || isLoadingLanguages} />
            </div>
          </div>

          <div className="flex items-end gap-3">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Engine</label>
              <div className="flex rounded-lg overflow-hidden border border-gray-700">
                <button onClick={() => handleEngineChange("google")} disabled={isTranslating} className={`px-3 py-1.5 text-xs font-medium transition-colors ${engine === "google" ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"} ${isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}>Google</button>
                <button onClick={() => handleEngineChange("llm")} disabled={isTranslating} className={`px-3 py-1.5 text-xs font-medium transition-colors ${engine === "llm" ? "bg-purple-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"} ${isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}>LLM</button>
              </div>
            </div>
            {engine === "llm" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Model</label>
                <select
                  value={model}
                  onChange={(e) => handleModelChange(e.target.value as LlmModel)}
                  disabled={isTranslating}
                  className={`bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500 ${isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <option value="gpt-5-nano">5-nano</option>
                  <option value="gpt-4.1-nano">4.1-nano</option>
                  <option value="gpt-4.1-mini">4.1-mini</option>
                  <option value="gpt-4o-mini">4o-mini</option>
                </select>
              </div>
            )}
            <MicButton micStatus={isTranslating ? micStatus : (micStatus === "listening" ? "listening" : "idle")} onToggle={handleToggle} />
          </div>
        </div>

        {/* Context input (LLM only) */}
        {engine === "llm" && (
          <div className="max-w-5xl mx-auto mt-3">
            <label className="text-xs text-gray-500 mb-1 block">
              Context (helps LLM correct STT errors & choose right terminology)
            </label>
            <input
              type="text"
              value={context}
              onChange={(e) => handleContextChange(e.target.value)}
              disabled={isTranslating}
              placeholder="e.g. Medical conference about cardiology, Game development talk about Unity..."
              className={`w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500 ${isTranslating ? "opacity-50 cursor-not-allowed" : ""}`}
              maxLength={500}
            />
          </div>
        )}
      </section>

      {/* Main content: translation + dashboard */}
      <div className="flex-1 flex min-h-0">
        {/* Translation display (center) */}
        <section className="flex-1 min-h-0">
          {isLoaded && (
            <TranslationDisplay
              entries={entries}
              interimText={interimText}
              showOriginal={config.showOriginal}
              fontSize={config.fontSize}
            />
          )}
        </section>

        {/* Token dashboard (right sidebar, LLM only) */}
        {engine === "llm" && (
          <aside className="w-48 border-l border-gray-800 p-3 shrink-0 flex flex-col gap-3">
            <h3 className="text-xs text-gray-500 uppercase tracking-wide">Token Usage</h3>

            <div className="space-y-2">
              <div className="bg-gray-900 rounded-lg p-2.5">
                <p className="text-xs text-gray-500">Requests</p>
                <p className="text-lg font-mono text-white">{requestCount}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-2.5">
                <p className="text-xs text-gray-500">Prompt</p>
                <p className="text-lg font-mono text-blue-400">{totalTokens.prompt_tokens.toLocaleString()}</p>
              </div>
              <div className="bg-gray-900 rounded-lg p-2.5">
                <p className="text-xs text-gray-500">Completion</p>
                <p className="text-lg font-mono text-green-400">{totalTokens.completion_tokens.toLocaleString()}</p>
              </div>
              <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-2.5">
                <p className="text-xs text-purple-400">Total</p>
                <p className="text-lg font-mono text-purple-300 font-bold">{totalTokens.total_tokens.toLocaleString()}</p>
              </div>
            </div>

            <div className="mt-auto text-xs text-gray-600">
              <p>Model: {model}</p>
              {totalTokens.total_tokens > 0 && (
                <p className="mt-1">
                  ~${((totalTokens.prompt_tokens * 0.00000015) + (totalTokens.completion_tokens * 0.0000006)).toFixed(4)}
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      <SettingsPanel
        config={config}
        onFontSizeChange={setFontSize}
        onToggleShowOriginal={toggleShowOriginal}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
      />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </main>
  );
}

import { useEffect, useState } from "react";
import type { AppConfig, FontSize } from "../lib/types";
import { testApiKey, setConfig } from "../lib/electron-api";

type SettingsPanelProps = {
  config: AppConfig;
  onFontSizeChange: (size: FontSize) => void;
  onToggleShowOriginal: () => void;
  isOpen: boolean;
  onClose: () => void;
};

const FONT_SIZE_OPTIONS: { value: FontSize; label: string }[] = [
  { value: 14, label: "S" },
  { value: 20, label: "M" },
  { value: 28, label: "L" },
  { value: 40, label: "XL" },
];

type KeyStatus = "idle" | "testing" | "ok" | "error";

export function SettingsPanel({
  config,
  onFontSizeChange,
  onToggleShowOriginal,
  isOpen,
  onClose,
}: SettingsPanelProps) {
  const [googleKey, setGoogleKey] = useState("");
  const [openaiKey, setOpenaiKey] = useState("");
  const [googleStatus, setGoogleStatus] = useState<KeyStatus>("idle");
  const [openaiStatus, setOpenaiStatus] = useState<KeyStatus>("idle");
  const [googleMsg, setGoogleMsg] = useState("");
  const [openaiMsg, setOpenaiMsg] = useState("");

  useEffect(() => {
    if (isOpen) {
      // Load current keys from config (they come from electron-store via IPC)
      setGoogleKey(config.googleApiKey);
      setOpenaiKey(config.openaiApiKey);
      setGoogleStatus("idle");
      setOpenaiStatus("idle");
      setGoogleMsg("");
      setOpenaiMsg("");
    }
  }, [isOpen, config.googleApiKey, config.openaiApiKey]);

  const handleSaveGoogle = async () => {
    const key = googleKey.trim();
    try {
      await setConfig({ googleApiKey: key });
      setGoogleStatus("idle");
      setGoogleMsg("Saved");
      setTimeout(() => setGoogleMsg(""), 2000);
    } catch {
      setGoogleMsg("Save failed");
    }
  };

  const handleSaveOpenai = async () => {
    const key = openaiKey.trim();
    try {
      await setConfig({ openaiApiKey: key });
      setOpenaiStatus("idle");
      setOpenaiMsg("Saved");
      setTimeout(() => setOpenaiMsg(""), 2000);
    } catch {
      setOpenaiMsg("Save failed");
    }
  };

  const handleTestGoogle = async () => {
    const key = googleKey.trim();
    if (!key) { setGoogleMsg("Enter a key first"); return; }
    setGoogleStatus("testing");
    setGoogleMsg("");
    try {
      const res = await testApiKey({ provider: "google", key });
      if (res.status === "ok") {
        setGoogleStatus("ok");
        setGoogleMsg("Valid");
        // Auto-save on successful test
        await setConfig({ googleApiKey: key });
      } else {
        setGoogleStatus("error");
        setGoogleMsg(res.message ?? "Invalid key");
      }
    } catch {
      setGoogleStatus("error");
      setGoogleMsg("Test failed");
    }
  };

  const handleTestOpenai = async () => {
    const key = openaiKey.trim();
    if (!key) { setOpenaiMsg("Enter a key first"); return; }
    setOpenaiStatus("testing");
    setOpenaiMsg("");
    try {
      const res = await testApiKey({ provider: "openai", key });
      if (res.status === "ok") {
        setOpenaiStatus("ok");
        setOpenaiMsg("Valid");
        // Auto-save on successful test
        await setConfig({ openaiApiKey: key });
      } else {
        setOpenaiStatus("error");
        setOpenaiMsg(res.message ?? "Invalid key");
      }
    } catch {
      setOpenaiStatus("error");
      setOpenaiMsg("Test failed");
    }
  };

  if (!isOpen) return null;

  const statusColor = (s: KeyStatus) => {
    if (s === "ok") return "text-emerald-400";
    if (s === "error") return "text-red-400";
    if (s === "testing") return "text-yellow-400";
    return "text-gray-500";
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md p-6 border border-gray-700 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-white">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors p-1"
            aria-label="Close settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="space-y-6">
          {/* API Keys */}
          <div>
            <label className="text-sm text-gray-400 mb-3 block font-medium">API Keys</label>

            {/* Google */}
            <div className="mb-3">
              <label className="text-xs text-gray-500 mb-1 block">Google Cloud API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={googleKey}
                  onChange={(e) => { setGoogleKey(e.target.value); setGoogleStatus("idle"); setGoogleMsg(""); }}
                  placeholder="AIza..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-blue-500"
                />
                <button
                  onClick={handleSaveGoogle}
                  className="px-3 py-2 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleTestGoogle}
                  disabled={googleStatus === "testing"}
                  className="px-3 py-2 text-xs font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors disabled:opacity-50"
                >
                  {googleStatus === "testing" ? "..." : "Test"}
                </button>
              </div>
              {googleMsg && (
                <p className={`text-xs mt-1 ${statusColor(googleStatus)}`}>{googleMsg}</p>
              )}
            </div>

            {/* OpenAI */}
            <div>
              <label className="text-xs text-gray-500 mb-1 block">OpenAI API Key</label>
              <div className="flex gap-2">
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => { setOpenaiKey(e.target.value); setOpenaiStatus("idle"); setOpenaiMsg(""); }}
                  placeholder="sk-..."
                  className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500"
                />
                <button
                  onClick={handleSaveOpenai}
                  className="px-3 py-2 text-xs font-medium bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={handleTestOpenai}
                  disabled={openaiStatus === "testing"}
                  className="px-3 py-2 text-xs font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-500 transition-colors disabled:opacity-50"
                >
                  {openaiStatus === "testing" ? "..." : "Test"}
                </button>
              </div>
              {openaiMsg && (
                <p className={`text-xs mt-1 ${statusColor(openaiStatus)}`}>{openaiMsg}</p>
              )}
            </div>

            <p className="text-xs text-gray-600 mt-2">
              Keys are stored securely in the app's local config. They never leave your machine except for API calls.
            </p>
          </div>

          {/* Font size */}
          <div>
            <label className="text-sm text-gray-400 mb-2 block">Font Size</label>
            <div className="flex gap-2">
              {FONT_SIZE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onFontSizeChange(opt.value)}
                  className={`
                    flex-1 py-2 rounded-lg text-sm font-medium transition-all
                    ${
                      config.fontSize === opt.value
                        ? "bg-blue-600 text-white"
                        : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Current: {config.fontSize}px
            </p>
          </div>

          {/* Show original toggle */}
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm text-gray-300">
                Show Original Text
              </label>
              <p className="text-xs text-gray-500">
                Display the recognized speech text
              </p>
            </div>
            <button
              onClick={onToggleShowOriginal}
              className={`
                relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                ${config.showOriginal ? "bg-blue-600" : "bg-gray-600"}
              `}
              role="switch"
              aria-checked={config.showOriginal}
            >
              <span
                className={`
                  inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                  ${config.showOriginal ? "translate-x-6" : "translate-x-1"}
                `}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

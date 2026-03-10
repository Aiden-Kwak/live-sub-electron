import { useEffect, useRef } from "react";
import type { TranslationEntry, FontSize } from "../lib/types";

type TranslationDisplayProps = {
  entries: TranslationEntry[];
  interimText: string;
  showOriginal: boolean;
  fontSize: FontSize;
};

export function TranslationDisplay({
  entries,
  interimText,
  showOriginal,
  fontSize,
}: TranslationDisplayProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [entries.length, interimText]);

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;
  const previous = entries.length > 1 ? entries[entries.length - 2] : null;
  const olderHistory = entries.slice(0, -2);

  return (
    <div className="h-full overflow-y-auto flex flex-col">
      {/* Top spacer */}
      <div className="flex-1 min-h-[30%]" />

      {/* Older history entries — original + translation always shown */}
      {olderHistory.map((entry) => (
        <div key={entry.id} className="px-6 py-3 text-center opacity-60 hover:opacity-80 transition-opacity">
          <p
            className="text-gray-500 mb-1"
            style={{ fontSize: `${Math.max(fontSize - 6, 11)}px` }}
          >
            {entry.originalText}
          </p>
          <p
            className="text-gray-400"
            style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
          >
            {entry.translatedText}
          </p>
        </div>
      ))}

      {/* Previous (second-to-last) translation -- soft blue tone */}
      {previous && (
        <div className="px-6 py-4 text-center opacity-80">
          <p
            className="text-slate-500 mb-1"
            style={{ fontSize: `${Math.max(fontSize - 5, 11)}px` }}
          >
            {previous.originalText}
          </p>
          <p
            className="text-sky-300/70"
            style={{ fontSize: `${Math.max(fontSize - 1, 15)}px` }}
          >
            {previous.translatedText}
          </p>
        </div>
      )}

      {/* Latest translation -- always visible in green until replaced */}
      {latest && (
        <div className="px-6 py-8 text-center">
          <div className="max-w-2xl mx-auto transition-all duration-300">
            <p
              className="text-gray-400 mb-3"
              style={{ fontSize: `${Math.max(fontSize - 4, 12)}px` }}
            >
              {latest.originalText}
            </p>
            <p
              className={`font-semibold leading-relaxed ${latest.provisional ? "text-yellow-400/80" : "text-emerald-400"}`}
              style={{ fontSize: `${fontSize}px` }}
            >
              {latest.translatedText}
              {latest.provisional && (
                <span className="inline-block ml-2 text-xs text-yellow-500/60 font-normal align-middle">...</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Interim text / status indicator */}
      <div ref={bottomRef} className="px-6 py-4 text-center min-h-[3em]">
        {interimText ? (
          <div className="max-w-2xl mx-auto">
            {(interimText === "Listening..." || interimText === "Transcribing...") ? (
              <div className="flex items-center justify-center gap-2">
                <span className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </span>
                <p className="text-gray-500 text-sm">
                  {interimText}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-600 mb-1">Recognized</p>
                <p
                  className="text-sky-400/80 italic"
                  style={{ fontSize: `${Math.max(fontSize - 2, 14)}px` }}
                >
                  {interimText}
                </p>
                <p className="text-xs text-gray-600 mt-1 animate-pulse">Translating...</p>
              </div>
            )}
          </div>
        ) : !latest ? (
          <p className="text-gray-600 text-lg">
            Translations will appear here
          </p>
        ) : null}
      </div>

      {/* Bottom spacer */}
      <div className="flex-1 min-h-[30%]" />
    </div>
  );
}

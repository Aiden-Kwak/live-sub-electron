import type { MicStatus } from "../lib/types";

type MicButtonProps = {
  micStatus: MicStatus;
  onToggle: () => void;
  disabled?: boolean;
};

const STATUS_LABELS: Record<MicStatus, string> = {
  idle: "Start Translation",
  listening: "Stop Translation",
  stopped: "Start Translation",
  error: "Start Translation",
};

export function MicButton({ micStatus, onToggle, disabled = false }: MicButtonProps) {
  const isListening = micStatus === "listening";

  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`
        relative flex items-center gap-3 px-6 py-3 rounded-full font-medium text-sm transition-all
        disabled:opacity-50 disabled:cursor-not-allowed
        ${
          isListening
            ? "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/30"
            : "bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/30"
        }
      `}
      aria-label={STATUS_LABELS[micStatus]}
    >
      {/* Mic icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {isListening ? (
          <>
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
            <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .87-.16 1.71-.46 2.49" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </>
        ) : (
          <>
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
            <line x1="12" y1="19" x2="12" y2="23" />
            <line x1="8" y1="23" x2="16" y2="23" />
          </>
        )}
      </svg>

      <span>{STATUS_LABELS[micStatus]}</span>

      {/* Pulsing dot when listening */}
      {isListening && (
        <span className="absolute top-1 right-1 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-400" />
        </span>
      )}
    </button>
  );
}

import type { MicStatus } from "../lib/types";

type StatusIndicatorProps = {
  micStatus: MicStatus;
  isOnline: boolean;
};

export function StatusIndicator({ micStatus, isOnline }: StatusIndicatorProps) {
  const statusConfig: Record<MicStatus, { text: string; color: string }> = {
    idle: { text: "Ready", color: "bg-gray-500" },
    listening: { text: "Listening...", color: "bg-green-500" },
    stopped: { text: "Stopped", color: "bg-yellow-500" },
    error: { text: "Error", color: "bg-red-500" },
  };

  const { text, color } = statusConfig[micStatus];

  return (
    <div className="flex items-center gap-3 text-sm">
      <div className="flex items-center gap-1.5">
        <span className={`inline-block w-2 h-2 rounded-full ${color}`} />
        <span className="text-gray-300">{text}</span>
      </div>

      {!isOnline && (
        <div className="flex items-center gap-1.5 text-orange-400">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="1" y1="1" x2="23" y2="23" />
            <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
            <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
            <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
            <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
            <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
            <line x1="12" y1="20" x2="12.01" y2="20" />
          </svg>
          <span>Offline</span>
        </div>
      )}
    </div>
  );
}

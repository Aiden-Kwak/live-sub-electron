import type { Language } from "../lib/types";

type LanguageSelectorProps = {
  label: string;
  languages: Language[];
  value: string;
  onChange: (code: string) => void;
  disabled?: boolean;
};

export function LanguageSelector({
  label,
  languages,
  value,
  onChange,
  disabled = false,
}: LanguageSelectorProps) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-gray-400 uppercase tracking-wide">
        {label}
      </label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="bg-gray-800 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {languages.map((lang) => (
          <option key={lang.code} value={lang.code}>
            {lang.name} ({lang.code})
          </option>
        ))}
      </select>
    </div>
  );
}

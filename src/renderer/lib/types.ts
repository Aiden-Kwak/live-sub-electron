// ============================================================
// Shared types for LiveSub Desktop (Electron renderer)
// Based on docs/api-spec.json and docs/data-model.json
// Session/Log types removed (not in Electron MVP scope)
// ============================================================

// --- AppConfig (electron-store schema) ---

export type TranslateEngine = "google" | "llm";

export type LlmModel = "gpt-4o-mini" | "gpt-4.1-mini" | "gpt-4.1-nano" | "gpt-5-nano";

export type FontSize = 14 | 20 | 28 | 40;

export type ContextPreset = {
  id: string;
  name: string;
  value: string;
};

export type AppConfig = {
  googleApiKey: string;
  openaiApiKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: TranslateEngine;
  model: LlmModel;
  fontSize: FontSize;
  showOriginal: boolean;
  context: string;
  contextPresets: ContextPreset[];
};

// --- Translate IPC ---

export type TranslateRequest = {
  text: string;
  source_language: string;
  target_language: string;
  engine?: TranslateEngine;
  model?: LlmModel;
  context?: string;
  previous_translations?: string[];
};

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type TranslateResponse = {
  translated_text: string;
  token_usage: TokenUsage | null;
};

// --- Languages IPC ---

export type Language = {
  code: string;
  name: string;
};

export type LanguagesRequest = {
  apiKey?: string;
};

export type LanguagesResponse = {
  languages: Language[];
};

// --- Test API Key IPC ---

export type TestApiKeyRequest = {
  provider: "google" | "openai";
  key: string;
};

export type TestApiKeyResponse = {
  status: "ok" | "error";
  message?: string;
};

// --- Frontend-only types ---

export type MicStatus = "idle" | "listening" | "stopped" | "error";

export type TranslationEntry = {
  id: string;
  originalText: string;
  translatedText: string;
  confidence: number | null;
  timestamp: number;
  provisional?: boolean;
};

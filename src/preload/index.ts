/**
 * Preload script for Electron.
 * Exposes electronAPI to the renderer via contextBridge.
 */

import { contextBridge, ipcRenderer } from "electron";

type TranslateRequest = {
  text: string;
  source_language: string;
  target_language: string;
  engine?: "google" | "llm";
  model?: string;
  context?: string;
  previous_translations?: string[];
};

type TranslateResponse = {
  translated_text?: string;
  token_usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  } | null;
  error?: string;
};

type TestApiKeyRequest = {
  provider: "google" | "openai";
  key: string;
};

type TestApiKeyResponse = {
  status: "ok" | "error";
  message?: string;
};

type GetLanguagesRequest = {
  apiKey?: string;
};

type GetLanguagesResponse = {
  languages: Array<{ code: string; name: string }>;
};

type ContextPreset = {
  id: string;
  name: string;
  value: string;
};

type AppConfig = {
  googleApiKey: string;
  openaiApiKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: "google" | "llm";
  model: "gpt-4o-mini" | "gpt-4.1-mini" | "gpt-4.1-nano" | "gpt-5-nano";
  fontSize: 14 | 20 | 28 | 40;
  showOriginal: boolean;
  context: string;
  contextPresets: ContextPreset[];
};

type TranscribeAudioResponse = {
  text?: string;
  error?: string;
};

const electronAPI = {
  translate: (req: TranslateRequest): Promise<TranslateResponse> =>
    ipcRenderer.invoke("translate", req),

  testApiKey: (req: TestApiKeyRequest): Promise<TestApiKeyResponse> =>
    ipcRenderer.invoke("test-api-key", req),

  getLanguages: (req?: GetLanguagesRequest): Promise<GetLanguagesResponse> =>
    ipcRenderer.invoke("get-languages", req),

  getConfig: (): Promise<AppConfig> =>
    ipcRenderer.invoke("get-config"),

  setConfig: (partial: Partial<AppConfig>): Promise<{ ok: true }> =>
    ipcRenderer.invoke("set-config", partial),

  transcribeAudio: (audioData: ArrayBuffer, language: string): Promise<TranscribeAudioResponse> =>
    ipcRenderer.invoke("transcribe-audio", audioData, language),
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);

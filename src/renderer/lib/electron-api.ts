// ============================================================
// Electron IPC API wrapper
// Wraps window.electronAPI calls exposed by preload script
// ============================================================

import type {
  AppConfig,
  TranslateRequest,
  TranslateResponse,
  TestApiKeyRequest,
  TestApiKeyResponse,
  LanguagesRequest,
  LanguagesResponse,
} from "./types";

export type TranscribeAudioResponse = {
  text?: string;
  error?: string;
};

// Type definition for the electronAPI exposed via contextBridge
type ElectronAPI = {
  translate: (req: TranslateRequest) => Promise<TranslateResponse>;
  testApiKey: (req: TestApiKeyRequest) => Promise<TestApiKeyResponse>;
  getLanguages: (req?: LanguagesRequest) => Promise<LanguagesResponse>;
  getConfig: () => Promise<AppConfig>;
  setConfig: (partial: Partial<AppConfig>) => Promise<{ ok: true }>;
  transcribeAudio: (audioData: ArrayBuffer, language: string) => Promise<TranscribeAudioResponse>;
};

// Augment the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

function getAPI(): ElectronAPI {
  if (!window.electronAPI) {
    throw new Error("electronAPI is not available. Ensure preload script is loaded.");
  }
  return window.electronAPI;
}

// --- Wrapper functions ---

export async function translate(req: TranslateRequest): Promise<TranslateResponse> {
  const result = await getAPI().translate(req);
  if ("error" in result && typeof (result as Record<string, unknown>).error === "string") {
    throw new Error((result as Record<string, unknown>).error as string);
  }
  return result;
}

export async function testApiKey(req: TestApiKeyRequest): Promise<TestApiKeyResponse> {
  return getAPI().testApiKey(req);
}

export async function getLanguages(req?: LanguagesRequest): Promise<LanguagesResponse> {
  return getAPI().getLanguages(req);
}

export async function getConfig(): Promise<AppConfig> {
  return getAPI().getConfig();
}

export async function setConfig(partial: Partial<AppConfig>): Promise<{ ok: true }> {
  return getAPI().setConfig(partial);
}

export async function transcribeAudio(audioData: ArrayBuffer, language: string): Promise<string> {
  const result = await getAPI().transcribeAudio(audioData, language);
  if (result.error) {
    throw new Error(result.error);
  }
  return result.text ?? "";
}

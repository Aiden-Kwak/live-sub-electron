/**
 * IPC handlers for Electron main process.
 * Registers 5 IPC channels: translate, test-api-key, get-languages, get-config, set-config.
 */

import { ipcMain } from "electron";
import { getConfig, setConfig, type AppConfig } from "./store";
import {
  translateGoogle,
  translateLlm,
  testGoogleKey,
  testOpenaiKey,
  getLanguages,
  transcribeAudio,
} from "./translator";

type TranslateRequest = {
  text: string;
  source_language: string;
  target_language: string;
  engine?: "google" | "llm";
  model?: string;
  context?: string;
  previous_translations?: string[];
};

type TestApiKeyRequest = {
  provider: "google" | "openai";
  key: string;
};

type GetLanguagesRequest = {
  apiKey?: string;
};

export function registerIpcHandlers(): void {
  ipcMain.handle("translate", async (_event, req: TranslateRequest) => {
    const { text, source_language, target_language, engine = "google", model, context, previous_translations } = req;

    // Validation
    if (!text || !text.trim()) {
      return { error: "text must not be empty" };
    }
    if (!source_language) {
      return { error: "source_language must not be empty" };
    }
    if (!target_language) {
      return { error: "target_language must not be empty" };
    }

    const config = getConfig();

    try {
      if (engine === "llm") {
        const apiKey = config.openaiApiKey;
        if (!apiKey) {
          return { error: "OpenAI API key is not configured. Please set it in Settings." };
        }
        const result = await translateLlm(
          text,
          source_language,
          target_language,
          apiKey,
          model ?? config.model,
          context ?? config.context,
          previous_translations ?? []
        );
        return result;
      } else {
        const apiKey = config.googleApiKey;
        if (!apiKey) {
          return { error: "Google API key is not configured. Please set it in Settings." };
        }
        const result = await translateGoogle(text, source_language, target_language, apiKey);
        return result;
      }
    } catch (err) {
      return { error: `Translation API error: ${(err as Error).message}` };
    }
  });

  ipcMain.handle("test-api-key", async (_event, req: TestApiKeyRequest) => {
    const { provider, key } = req;

    if (provider === "google") {
      return await testGoogleKey(key);
    } else if (provider === "openai") {
      return await testOpenaiKey(key);
    }

    return { status: "error", message: "Unknown provider" };
  });

  ipcMain.handle("get-languages", async (_event, req?: GetLanguagesRequest) => {
    const config = getConfig();
    const apiKey = req?.apiKey ?? config.googleApiKey;
    return await getLanguages(apiKey || undefined);
  });

  ipcMain.handle("transcribe-audio", async (_event, audioData: ArrayBuffer, language: string) => {
    const config = getConfig();
    const keys = {
      openaiApiKey: config.openaiApiKey || undefined,
      googleApiKey: config.googleApiKey || undefined,
    };
    try {
      const text = await transcribeAudio(Buffer.from(audioData), language, keys);
      return { text };
    } catch (err) {
      return { error: (err as Error).message };
    }
  });

  ipcMain.handle("get-config", async () => {
    return getConfig();
  });

  ipcMain.handle("set-config", async (_event, partial: Partial<AppConfig>) => {
    return setConfig(partial);
  });
}

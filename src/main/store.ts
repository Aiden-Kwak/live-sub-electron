/**
 * electron-store configuration management.
 * Manages AppConfig with JSON Schema validation.
 */

import Store from "electron-store";

export type AppConfig = {
  googleApiKey: string;
  openaiApiKey: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: "google" | "llm";
  model: "gpt-4o-mini" | "gpt-4.1-mini" | "gpt-4.1-nano" | "gpt-5-nano";
  fontSize: 14 | 20 | 28 | 40;
  showOriginal: boolean;
  context: string;
};

const VALID_FONT_SIZES: readonly number[] = [14, 20, 28, 40];
const VALID_ENGINES: readonly string[] = ["google", "llm"];
const VALID_MODELS: readonly string[] = ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-5-nano"];

const schema: Record<string, unknown> = {
  googleApiKey: { type: "string", default: "" },
  openaiApiKey: { type: "string", default: "" },
  sourceLanguage: { type: "string", default: "en-US" },
  targetLanguage: { type: "string", default: "ko" },
  engine: { type: "string", enum: ["google", "llm"], default: "google" },
  model: {
    type: "string",
    enum: ["gpt-4o-mini", "gpt-4.1-mini", "gpt-4.1-nano", "gpt-5-nano"],
    default: "gpt-4.1-nano",
  },
  fontSize: { type: "number", enum: [14, 20, 28, 40], default: 20 },
  showOriginal: { type: "boolean", default: false },
  context: { type: "string", default: "" },
};

const DEFAULT_CONFIG: AppConfig = {
  googleApiKey: "",
  openaiApiKey: "",
  sourceLanguage: "en-US",
  targetLanguage: "ko",
  engine: "google",
  model: "gpt-4.1-nano",
  fontSize: 20,
  showOriginal: false,
  context: "",
};

const store = new Store<AppConfig>({
  name: "config",
  schema: schema as any,
  defaults: DEFAULT_CONFIG,
});

export function getConfig(): AppConfig {
  return { ...DEFAULT_CONFIG, ...store.store };
}

export function setConfig(partial: Partial<AppConfig>): { ok: true } {
  for (const [key, value] of Object.entries(partial)) {
    if (value === undefined) continue;

    switch (key) {
      case "fontSize":
        if (VALID_FONT_SIZES.includes(value as number)) {
          store.set(key, value);
        }
        break;
      case "engine":
        if (VALID_ENGINES.includes(value as string)) {
          store.set(key, value);
        }
        break;
      case "model":
        if (VALID_MODELS.includes(value as string)) {
          store.set(key, value);
        }
        break;
      case "googleApiKey":
      case "openaiApiKey":
      case "sourceLanguage":
      case "targetLanguage":
      case "context":
        if (typeof value === "string") {
          store.set(key, value);
        }
        break;
      case "showOriginal":
        if (typeof value === "boolean") {
          store.set(key, value);
        }
        break;
      default:
        // Unknown keys are silently ignored
        break;
    }
  }

  return { ok: true };
}

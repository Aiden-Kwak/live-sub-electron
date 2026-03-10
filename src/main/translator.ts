/**
 * Translation API call module.
 * Handles Google Cloud Translation API v2 and OpenAI Chat Completions API.
 */

const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
const GOOGLE_LANGUAGES_URL = "https://translation.googleapis.com/language/translate/v2/languages";
const OPENAI_CHAT_URL = "https://api.openai.com/v1/chat/completions";

export type TokenUsage = {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
};

export type TranslateResult = {
  translated_text: string;
  token_usage: TokenUsage | null;
};

type LanguageItem = {
  code: string;
  name: string;
};

const FALLBACK_LANGUAGES: LanguageItem[] = [
  { code: "en", name: "English" },
  { code: "ko", name: "Korean" },
  { code: "ja", name: "Japanese" },
  { code: "zh", name: "Chinese" },
  { code: "es", name: "Spanish" },
  { code: "fr", name: "French" },
  { code: "de", name: "German" },
];

export async function translateGoogle(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string
): Promise<TranslateResult> {
  const url = `${GOOGLE_TRANSLATE_URL}?key=${encodeURIComponent(apiKey)}`;
  const payload = {
    q: text,
    source: sourceLanguage,
    target: targetLanguage,
    format: "text",
  };

  let data: Record<string, unknown>;
  try {
    const resp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10_000),
    });

    data = (await resp.json()) as Record<string, unknown>;

    if (!resp.ok) {
      const errorData = data as { error?: { message?: string } };
      const errorMsg = errorData?.error?.message ?? `HTTP ${resp.status}`;
      throw new Error(`Translation API error: ${errorMsg}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Translation API error:")) {
      throw err;
    }
    throw new Error(`Translation API error: ${(err as Error).message}`);
  }

  try {
    const translatedText = (
      (data as { data: { translations: Array<{ translatedText: string }> } }).data
        .translations[0].translatedText
    );
    return { translated_text: translatedText, token_usage: null };
  } catch {
    throw new Error("Translation API error: unexpected response format");
  }
}

export async function translateLlm(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  apiKey: string,
  model: string = "gpt-4.1-nano",
  context: string = "",
  previousTranslations: string[] = []
): Promise<TranslateResult> {
  let systemContent =
    `You are a professional translator. ` +
    `Translate the following text from ${sourceLanguage} to ${targetLanguage}. ` +
    `Output ONLY the translated text, nothing else. ` +
    `Preserve the original tone and nuance.`;

  if (context) {
    systemContent +=
      `\n\nIMPORTANT CONTEXT: The speech is about: ${context}. ` +
      `Use this context to correct any speech recognition errors ` +
      `and choose the most appropriate terminology and translation.`;
  }

  if (previousTranslations.length > 0) {
    const recent = previousTranslations.slice(-5);
    const historyText = recent.map((t) => `- ${t}`).join("\n");
    systemContent +=
      `\n\nRECENT CONVERSATION for context continuity:\n${historyText}\n` +
      `Use this conversation history to maintain consistency in terminology, ` +
      `resolve ambiguous speech recognition, and understand the ongoing topic.`;
  }

  const messages = [
    { role: "system", content: systemContent },
    { role: "user", content: text },
  ];

  const payload = {
    model,
    messages,
    temperature: 0.3,
    max_tokens: 1024,
  };

  let data: Record<string, unknown>;
  try {
    const resp = await fetch(OPENAI_CHAT_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30_000),
    });

    data = (await resp.json()) as Record<string, unknown>;

    if (!resp.ok) {
      const errorData = data as { error?: { message?: string } };
      const errorMsg = errorData?.error?.message ?? `HTTP ${resp.status}`;
      throw new Error(`LLM Translation error: ${errorMsg}`);
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("LLM Translation error:")) {
      throw err;
    }
    throw new Error(`LLM Translation error: ${(err as Error).message}`);
  }

  let translatedText: string;
  try {
    const choices = (data as { choices: Array<{ message: { content: string } }> }).choices;
    translatedText = choices[0].message.content.trim();
  } catch {
    throw new Error("LLM Translation error: unexpected response format");
  }

  const usage = (data as { usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number } }).usage ?? {};
  const tokenUsage: TokenUsage = {
    prompt_tokens: usage.prompt_tokens ?? 0,
    completion_tokens: usage.completion_tokens ?? 0,
    total_tokens: usage.total_tokens ?? 0,
  };

  return { translated_text: translatedText, token_usage: tokenUsage };
}

export async function testGoogleKey(key: string): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    await translateGoogle("hello", "en", "ko", key);
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

export async function testOpenaiKey(key: string): Promise<{ status: "ok" } | { status: "error"; message: string }> {
  try {
    await translateLlm("hello", "en", "ko", key);
    return { status: "ok" };
  } catch (err) {
    return { status: "error", message: (err as Error).message };
  }
}

// --- Speech-to-Text (Whisper / Google Cloud Speech) ---

const OPENAI_WHISPER_URL = "https://api.openai.com/v1/audio/transcriptions";
const GOOGLE_SPEECH_URL = "https://speech.googleapis.com/v1/speech:recognize";

function buildMultipartBody(
  audioBuffer: Buffer,
  fields: Record<string, string>
): { body: Buffer; contentType: string } {
  const boundary = `----FormBoundary${Date.now()}${Math.random().toString(36).slice(2)}`;
  const CRLF = "\r\n";

  const parts: Buffer[] = [];

  // File part
  parts.push(Buffer.from(
    `--${boundary}${CRLF}` +
    `Content-Disposition: form-data; name="file"; filename="audio.webm"${CRLF}` +
    `Content-Type: audio/webm;codecs=opus${CRLF}${CRLF}`
  ));
  parts.push(audioBuffer);
  parts.push(Buffer.from(CRLF));

  // Text fields
  for (const [key, value] of Object.entries(fields)) {
    parts.push(Buffer.from(
      `--${boundary}${CRLF}` +
      `Content-Disposition: form-data; name="${key}"${CRLF}${CRLF}` +
      `${value}${CRLF}`
    ));
  }

  parts.push(Buffer.from(`--${boundary}--${CRLF}`));

  return {
    body: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

async function transcribeWithWhisper(
  audioBuffer: Buffer,
  language: string,
  apiKey: string
): Promise<string> {
  const langCode = language.split("-")[0]; // "en-US" → "en"
  const { body, contentType } = buildMultipartBody(audioBuffer, {
    model: "whisper-1",
    language: langCode,
  });

  const resp = await fetch(OPENAI_WHISPER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": contentType,
    },
    body: body as unknown as BodyInit,
    signal: AbortSignal.timeout(15_000),
  });

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Whisper API error: ${errBody?.error?.message ?? `HTTP ${resp.status}`}`);
  }

  const data = (await resp.json()) as { text?: string };
  return data.text ?? "";
}

async function transcribeWithGoogle(
  audioBuffer: Buffer,
  language: string,
  apiKey: string
): Promise<string> {
  const base64Audio = audioBuffer.toString("base64");

  const resp = await fetch(
    `${GOOGLE_SPEECH_URL}?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config: {
          encoding: "WEBM_OPUS",
          sampleRateHertz: 48000,
          languageCode: language,
        },
        audio: { content: base64Audio },
      }),
      signal: AbortSignal.timeout(15_000),
    }
  );

  if (!resp.ok) {
    const errBody = await resp.json().catch(() => ({})) as { error?: { message?: string } };
    throw new Error(`Google Speech API error: ${errBody?.error?.message ?? `HTTP ${resp.status}`}`);
  }

  type GoogleSpeechResult = {
    results?: Array<{ alternatives?: Array<{ transcript?: string }> }>;
  };
  const data = (await resp.json()) as GoogleSpeechResult;
  return data.results?.[0]?.alternatives?.[0]?.transcript ?? "";
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  language: string,
  keys: { openaiApiKey?: string; googleApiKey?: string }
): Promise<string> {
  if (keys.openaiApiKey) {
    return transcribeWithWhisper(audioBuffer, language, keys.openaiApiKey);
  }
  if (keys.googleApiKey) {
    return transcribeWithGoogle(audioBuffer, language, keys.googleApiKey);
  }
  throw new Error("No API key configured. Set an OpenAI or Google API key in Settings.");
}

export async function getLanguages(apiKey?: string): Promise<{ languages: LanguageItem[] }> {
  if (!apiKey) {
    return { languages: FALLBACK_LANGUAGES };
  }

  try {
    const url = `${GOOGLE_LANGUAGES_URL}?target=en&key=${encodeURIComponent(apiKey)}`;
    const resp = await fetch(url, {
      method: "GET",
      signal: AbortSignal.timeout(10_000),
    });

    if (!resp.ok) {
      return { languages: FALLBACK_LANGUAGES };
    }

    const data = (await resp.json()) as {
      data: { languages: Array<{ language: string; name?: string }> };
    };

    const languages: LanguageItem[] = data.data.languages.map((lang) => ({
      code: lang.language,
      name: lang.name ?? lang.language,
    }));

    return { languages };
  } catch {
    return { languages: FALLBACK_LANGUAGES };
  }
}

import { GoogleGenAI } from "@google/genai";

import { buildMetaPrompt } from "./meta-prompt";
import type { CompileMode } from "./types";

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_OUTPUT_TOKENS = 4096;

/** Distinct error class so the route can map "no key" to 503 instead of 500. */
export class GeminiNotConfiguredError extends Error {
  constructor() {
    super(
      "GEMINI_API_KEY is not set. Add it to .env.local (dev) and Vercel project env vars (prod)."
    );
    this.name = "GeminiNotConfiguredError";
  }
}

let client: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (client) return client;
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new GeminiNotConfiguredError();
  client = new GoogleGenAI({ apiKey });
  return client;
}

export type GeminiUsage = {
  /** Non-cached input tokens (Gemini reports promptTokenCount as total, we split). */
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
};

export type GeminiLLMResult = {
  raw: string;
  usage: GeminiUsage;
  model: string;
};

export type GeminiCallOptions = {
  previousAttempt?: { raw: string; parseError: string };
};

type GeminiContent = {
  role: "user" | "model";
  parts: Array<{ text: string }>;
};

/**
 * Single round-trip to Gemini 2.5 Flash. responseMimeType: "application/json"
 * forces valid JSON output — same belt-and-suspenders idea as OpenAI's
 * json_object response_format.
 *
 * Gemini context caching is explicit but heavyweight (you create a cache,
 * reuse it by name, set a TTL). The implicit prefix cache fires for
 * frequently-repeated content with no setup; we lean on that for v1.
 * usageMetadata.cachedContentTokenCount surfaces what got cached.
 *
 * Gemini's message format uses role: "model" instead of "assistant" and
 * wraps text in { parts: [{ text }] } — translated here so the retry
 * semantics mirror the other providers.
 */
export async function callGemini(
  source: string,
  mode: CompileMode,
  options: GeminiCallOptions = {}
): Promise<GeminiLLMResult> {
  const system = buildMetaPrompt({ mode });
  const c = getClient();

  const contents: GeminiContent[] = [{ role: "user", parts: [{ text: source }] }];

  if (options.previousAttempt) {
    contents.push(
      { role: "model", parts: [{ text: options.previousAttempt.raw }] },
      {
        role: "user",
        parts: [
          {
            text:
              `Your previous output failed JSON validation: ${options.previousAttempt.parseError}\n\n` +
              `Output ONLY a valid JSON object matching the schema. No prose, no Markdown fences, ` +
              `no explanation. The first character must be '{' and the last must be '}'.`,
          },
        ],
      }
    );
  }

  const response = await c.models.generateContent({
    model: GEMINI_MODEL,
    contents,
    config: {
      systemInstruction: system,
      responseMimeType: "application/json",
      maxOutputTokens: MAX_OUTPUT_TOKENS,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini response contained no text content.");

  const promptTotal = response.usageMetadata?.promptTokenCount ?? 0;
  const cached = response.usageMetadata?.cachedContentTokenCount ?? 0;

  return {
    raw: text,
    model: GEMINI_MODEL,
    usage: {
      input_tokens: Math.max(0, promptTotal - cached),
      output_tokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      cached_input_tokens: cached,
    },
  };
}

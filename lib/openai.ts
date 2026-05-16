import OpenAI from "openai";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

import { buildMetaPrompt } from "./meta-prompt";
import type { CompileMode } from "./types";

const OPENAI_MODEL = "gpt-4o";
const MAX_TOKENS = 4096;

/** Distinct error class so the route can map "no key" to 503 instead of 500. */
export class OpenAINotConfiguredError extends Error {
  constructor() {
    super(
      "OPENAI_API_KEY is not set. Add it to .env.local (dev) and Vercel project env vars (prod)."
    );
    this.name = "OpenAINotConfiguredError";
  }
}

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (client) return client;
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new OpenAINotConfiguredError();
  client = new OpenAI({ apiKey });
  return client;
}

export type OpenAIUsage = {
  /** Non-cached input tokens (cached portion separated out so cost math is uniform with Anthropic). */
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
};

export type OpenAILLMResult = {
  raw: string;
  usage: OpenAIUsage;
  model: string;
};

export type OpenAICallOptions = {
  previousAttempt?: { raw: string; parseError: string };
};

/**
 * Single round-trip to GPT-4o. response_format: { type: "json_object" }
 * forces valid JSON output — the Meta-Prompt already requires it, so this
 * is belt-and-suspenders for the openai-mode happy path.
 *
 * OpenAI auto-caches prompts ≥1024 input tokens. There is no explicit
 * cache_control marker (unlike Anthropic). usage.prompt_tokens_details
 * .cached_tokens tells us how much was served from cache.
 */
export async function callOpenAI(
  source: string,
  mode: CompileMode,
  options: OpenAICallOptions = {}
): Promise<OpenAILLMResult> {
  const system = buildMetaPrompt({ mode });
  const c = getClient();

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: source },
  ];

  if (options.previousAttempt) {
    messages.push(
      { role: "assistant", content: options.previousAttempt.raw },
      {
        role: "user",
        content:
          `Your previous output failed JSON validation: ${options.previousAttempt.parseError}\n\n` +
          `Output ONLY a valid JSON object matching the schema. No prose, no Markdown fences, ` +
          `no explanation. The first character must be '{' and the last must be '}'.`,
      }
    );
  }

  const response = await c.chat.completions.create({
    model: OPENAI_MODEL,
    max_tokens: MAX_TOKENS,
    response_format: { type: "json_object" },
    messages,
  });

  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("OpenAI response contained no text content.");

  const promptTotal = response.usage?.prompt_tokens ?? 0;
  const cached = response.usage?.prompt_tokens_details?.cached_tokens ?? 0;

  return {
    raw: text,
    model: response.model,
    usage: {
      input_tokens: Math.max(0, promptTotal - cached),
      output_tokens: response.usage?.completion_tokens ?? 0,
      cached_input_tokens: cached,
    },
  };
}

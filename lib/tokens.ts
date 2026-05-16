import { getEncoding, type Tiktoken } from "js-tiktoken";

import type { ModelKey } from "./pricing";

// All models map to o200k_base. It is exact for GPT-4o; an approximation
// for Claude (Anthropic does not publish a client-side tokenizer,
// o200k_base lands within ~5% on English prose); and a rough proxy for
// Gemini (Google's tokenizer is unicode-based and tends to count slightly
// fewer tokens, so the meter is conservative). Treat non-GPT-4o counts as
// a signal, not an exact match.
const ENCODING_FOR_MODEL: Record<ModelKey, "o200k_base"> = {
  "claude-sonnet": "o200k_base",
  "gpt-4o": "o200k_base",
  "gemini-flash": "o200k_base",
};

const encoderCache = new Map<string, Tiktoken>();

function getEncoder(name: "o200k_base"): Tiktoken {
  const cached = encoderCache.get(name);
  if (cached) return cached;
  const enc = getEncoding(name);
  encoderCache.set(name, enc);
  return enc;
}

export function countTokens(text: string, model: ModelKey): number {
  if (!text) return 0;
  return getEncoder(ENCODING_FOR_MODEL[model]).encode(text).length;
}

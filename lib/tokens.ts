import { getEncoding, type Tiktoken } from "js-tiktoken";

import type { ModelKey } from "./pricing";

// Both models map to o200k_base. It is exact for GPT-4o. For Claude it is
// an approximation — Anthropic does not publish a client-side tokenizer,
// and o200k_base typically lands within ~5% of Anthropic's count for
// English prose. Treat the Claude count as a signal, not an exact match.
const ENCODING_FOR_MODEL: Record<ModelKey, "o200k_base"> = {
  "claude-sonnet": "o200k_base",
  "gpt-4o": "o200k_base",
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

import {
  AnthropicNotConfiguredError,
  callCompiler as callAnthropic,
  type CompileCallOptions,
} from "./anthropic";
import { GeminiNotConfiguredError, callGemini } from "./gemini";
import { OpenAINotConfiguredError, callOpenAI } from "./openai";
import type { CompileMode } from "./types";

export { AnthropicNotConfiguredError, GeminiNotConfiguredError, OpenAINotConfiguredError };

export type Provider = "anthropic" | "openai" | "gemini";

/**
 * Provider-neutral token usage. Both Anthropic and OpenAI report cached
 * vs non-cached input tokens differently — this shape gives the route a
 * single thing to log and price against.
 *
 * - input_tokens: non-cached input only
 * - cached_input_tokens: served from the provider's prefix cache
 * - cache_write_tokens: tokens written to cache this call (Anthropic only;
 *   OpenAI's cache is automatic with no explicit write step, so always 0)
 */
export type UnifiedUsage = {
  input_tokens: number;
  output_tokens: number;
  cached_input_tokens: number;
  cache_write_tokens: number;
};

export type CompileResult = {
  raw: string;
  usage: UnifiedUsage;
  model: string;
  provider: Provider;
};

/**
 * Dispatch to the right SDK based on mode. claude → Anthropic Claude 3.5
 * Sonnet with explicit cache_control. openai → GPT-4o with automatic
 * prefix caching. gemini → Gemini 2.5 Flash with implicit prefix caching.
 * All three return the same provider-neutral shape.
 */
export async function callCompiler(
  source: string,
  mode: CompileMode,
  options: CompileCallOptions = {}
): Promise<CompileResult> {
  if (mode === "openai") {
    const result = await callOpenAI(source, mode, options);
    return {
      raw: result.raw,
      model: result.model,
      provider: "openai",
      usage: {
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        cached_input_tokens: result.usage.cached_input_tokens,
        cache_write_tokens: 0,
      },
    };
  }

  if (mode === "gemini") {
    const result = await callGemini(source, mode, options);
    return {
      raw: result.raw,
      model: result.model,
      provider: "gemini",
      usage: {
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        cached_input_tokens: result.usage.cached_input_tokens,
        cache_write_tokens: 0,
      },
    };
  }

  const result = await callAnthropic(source, mode, options);
  return {
    raw: result.raw,
    model: result.model,
    provider: "anthropic",
    usage: {
      input_tokens: result.usage.input_tokens,
      output_tokens: result.usage.output_tokens,
      cached_input_tokens: result.usage.cache_read_input_tokens,
      cache_write_tokens: result.usage.cache_creation_input_tokens,
    },
  };
}

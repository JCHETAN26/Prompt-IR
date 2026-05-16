import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";

import { buildMetaPrompt } from "./meta-prompt";
import type { CompileMode } from "./types";

const COMPILER_MODEL = "claude-3-5-sonnet-20241022";
const MAX_TOKENS = 4096;

/** Distinct error class so the route can map "no key" to 503 instead of 500. */
export class AnthropicNotConfiguredError extends Error {
  constructor() {
    super(
      "ANTHROPIC_API_KEY is not set. Add it to .env.local (dev) and Vercel project env vars (prod)."
    );
    this.name = "AnthropicNotConfiguredError";
  }
}

let client: Anthropic | null = null;

export function getClient(): Anthropic {
  if (client) return client;
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new AnthropicNotConfiguredError();
  client = new Anthropic({ apiKey });
  return client;
}

export type CompileUsage = {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens: number;
  cache_read_input_tokens: number;
};

export type CompileLLMResult = {
  /** Raw text the model emitted — should be a JSON object, but unparsed. */
  raw: string;
  usage: CompileUsage;
  model: string;
};

export type CompileCallOptions = {
  /**
   * If set, this is a retry after a failed parse. The prior raw output and
   * the parser's error message are added as in-conversation context so the
   * model knows what went wrong. The system prompt is unchanged so the
   * cache prefix stays intact and the retry still hits the cache read path.
   */
  previousAttempt?: {
    raw: string;
    parseError: string;
  };
};

/**
 * Single round-trip to the compiler model. The Meta-Prompt is marked
 * cache_control: ephemeral so Anthropic's prefix cache absorbs it within
 * the 5-minute TTL — subsequent compiles on the same mode hit the cache
 * read path (≈90% off the static portion).
 */
export async function callCompiler(
  source: string,
  mode: CompileMode,
  options: CompileCallOptions = {}
): Promise<CompileLLMResult> {
  const system = buildMetaPrompt({ mode });
  const c = getClient();

  const messages: MessageParam[] = [{ role: "user", content: source }];

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

  const response = await c.messages.create({
    model: COMPILER_MODEL,
    max_tokens: MAX_TOKENS,
    system: [
      {
        type: "text",
        text: system,
        cache_control: { type: "ephemeral" },
      },
    ],
    messages,
  });

  const textBlock = response.content.find((block) => block.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Anthropic response contained no text content.");
  }

  return {
    raw: textBlock.text,
    model: response.model,
    usage: {
      input_tokens: response.usage.input_tokens,
      output_tokens: response.usage.output_tokens,
      cache_creation_input_tokens: response.usage.cache_creation_input_tokens ?? 0,
      cache_read_input_tokens: response.usage.cache_read_input_tokens ?? 0,
    },
  };
}

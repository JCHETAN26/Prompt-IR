export type ModelKey = "claude-sonnet" | "gpt-4o";

export type ModelPricing = {
  /** Dollars per 1M input tokens, uncached. */
  input: number;
  /** Dollars per 1M cached input tokens (Anthropic ephemeral / OpenAI auto). */
  cachedInput: number;
  /** Dollars per 1M output tokens. */
  output: number;
};

export const PRICING: Record<ModelKey, ModelPricing> = {
  "claude-sonnet": {
    input: 3.0,
    cachedInput: 0.3,
    output: 15.0,
  },
  "gpt-4o": {
    input: 2.5,
    cachedInput: 1.25,
    output: 10.0,
  },
};

export const MODEL_LABELS: Record<ModelKey, string> = {
  "claude-sonnet": "Claude 3.5 Sonnet",
  "gpt-4o": "GPT-4o",
};

export const MODEL_SHORT_LABELS: Record<ModelKey, string> = {
  "claude-sonnet": "claude",
  "gpt-4o": "openai",
};

export const MODELS: ModelKey[] = ["claude-sonnet", "gpt-4o"];

export function dollarsFor(
  tokens: number,
  model: ModelKey,
  kind: keyof ModelPricing = "input"
): number {
  return (tokens / 1_000_000) * PRICING[model][kind];
}

export function formatDollars(amount: number): string {
  return `$${amount.toFixed(4)}`;
}

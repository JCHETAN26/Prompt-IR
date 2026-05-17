import { AnthropicNotConfiguredError, getClient } from "./anthropic";

const DRY_RUN_MODEL = "claude-3-5-haiku-20241022";
const MAX_TOKENS = 100;
const TIMEOUT_MS = 6_000;

const SUMMARY_SYSTEM = `You are a careful reader. Read the prompt below and summarize in ONE sentence what the user wants. State the request, not your assessment. Do not add advice, caveats, or formatting. Plain prose only.`;

export type DryRunUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type DryRunResult = {
  source_summary: string;
  ir_summary: string;
  usage: DryRunUsage;
};

export class DryRunNotConfiguredError extends Error {
  constructor() {
    super(
      "Dry Run requires ANTHROPIC_API_KEY for the judge model. Add it to .env.local / Vercel env."
    );
    this.name = "DryRunNotConfiguredError";
  }
}

async function summarize(
  client: ReturnType<typeof getClient>,
  text: string,
  signal: AbortSignal
): Promise<{ text: string; input: number; output: number }> {
  const response = await client.messages.create(
    {
      model: DRY_RUN_MODEL,
      max_tokens: MAX_TOKENS,
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: text }],
    },
    { signal }
  );

  const block = response.content.find((b) => b.type === "text");
  if (!block || block.type !== "text") {
    throw new Error("Judge response contained no text.");
  }
  return {
    text: block.text.trim(),
    input: response.usage.input_tokens,
    output: response.usage.output_tokens,
  };
}

/**
 * Run two parallel Haiku summaries — one on the source, one on the IR —
 * so the user can compare what the judge model thinks each says.
 *
 * Hard 6s shared timeout (both calls share the AbortSignal). On any
 * failure the function returns null; the route surfaces a clean error.
 * If the API key is missing it throws DryRunNotConfiguredError so the
 * route can map it to a 503 with a useful message.
 */
export async function callDryRun(source: string, ir: string): Promise<DryRunResult | null> {
  let client: ReturnType<typeof getClient>;
  try {
    client = getClient();
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) throw new DryRunNotConfiguredError();
    throw err;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const [src, irOut] = await Promise.all([
      summarize(client, source, controller.signal),
      summarize(client, ir, controller.signal),
    ]);

    return {
      source_summary: src.text,
      ir_summary: irOut.text,
      usage: {
        input_tokens: src.input + irOut.input,
        output_tokens: src.output + irOut.output,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

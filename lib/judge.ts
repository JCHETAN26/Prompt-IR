import { z } from "zod";

import { getClient } from "./anthropic";
import type { ConfidenceScore } from "./types";

const JUDGE_MODEL = "claude-3-5-haiku-20241022";
const MAX_TOKENS = 200;
const TIMEOUT_MS = 5_000;

const JUDGE_SYSTEM = `You are a strict prompt-quality judge for an LLM compiler.

You will see [SOURCE] (the user's raw prompt) and [IR] (the compiled,
structured version). Score the IR on three dimensions, integer 0-10:

  - specificity: how specific are the instructions vs vague?
  - constraint_clarity: how clearly stated are the rules and limits?
  - formatting: how well-structured is the prompt for an LLM to parse?

Output ONLY a JSON object. No prose, no fences, no preamble:

{"specificity": <0-10>, "constraint_clarity": <0-10>, "formatting": <0-10>}

Scores must be integers. The first character of your output must be '{'.`;

const judgeResponseSchema = z.object({
  specificity: z.number(),
  constraint_clarity: z.number(),
  formatting: z.number(),
});

function clampInt(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, Math.round(n)));
}

export type JudgeUsage = {
  input_tokens: number;
  output_tokens: number;
};

export type JudgeResult = {
  score: ConfidenceScore;
  usage: JudgeUsage;
};

/**
 * Score IR quality with Claude 3.5 Haiku. Always returns null on any
 * failure — no key, network error, timeout, malformed output, schema
 * mismatch. The route degrades gracefully by surfacing
 * confidence_score: null instead of failing the whole compile.
 *
 * Hard 5s timeout via AbortController keeps the total compile +
 * judge round-trip under the 6s acceptance target.
 */
export async function callJudge(source: string, irText: string): Promise<JudgeResult | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const client = getClient();
    const response = await client.messages.create(
      {
        model: JUDGE_MODEL,
        max_tokens: MAX_TOKENS,
        system: JUDGE_SYSTEM,
        messages: [
          {
            role: "user",
            content: `[SOURCE]\n${source}\n\n[IR]\n${irText}`,
          },
        ],
      },
      { signal: controller.signal }
    );

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    let parsed: unknown;
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return null;
    }

    const validated = judgeResponseSchema.safeParse(parsed);
    if (!validated.success) return null;

    return {
      score: {
        specificity: clampInt(validated.data.specificity, 0, 10),
        constraint_clarity: clampInt(validated.data.constraint_clarity, 0, 10),
        formatting: clampInt(validated.data.formatting, 0, 10),
      },
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

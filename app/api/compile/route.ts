import { NextResponse } from "next/server";

import { AnthropicNotConfiguredError, callCompiler, type CompileUsage } from "@/lib/anthropic";
import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
import { PRICING } from "@/lib/pricing";
import type { CompileError, CompileRequest, CompileResponse } from "@/lib/types";

export const runtime = "nodejs";

const MAX_SOURCE_CHARS = 50_000;

type Validated = { ok: true; data: CompileRequest } | { ok: false; status: number; error: string };

function validate(body: unknown): Validated {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.source !== "string") {
    return { ok: false, status: 400, error: "Field 'source' must be a string." };
  }
  if (b.source.trim().length === 0) {
    return { ok: false, status: 400, error: "Field 'source' must not be empty." };
  }
  if (b.source.length > MAX_SOURCE_CHARS) {
    return {
      ok: false,
      status: 413,
      error: `Field 'source' exceeds the ${MAX_SOURCE_CHARS}-char limit for v1.`,
    };
  }
  if (b.mode !== "claude" && b.mode !== "openai") {
    return { ok: false, status: 400, error: "Field 'mode' must be 'claude' or 'openai'." };
  }

  return { ok: true, data: { source: b.source, mode: b.mode } };
}

function logCompile(model: string, usage: CompileUsage): void {
  // Sonnet cached-input is ~10% of base; cache creation is ~125%.
  const sonnet = PRICING["claude-sonnet"];
  const baseInputRate = sonnet.input / 1_000_000;
  const cacheReadRate = sonnet.cachedInput / 1_000_000;
  const cacheWriteRate = baseInputRate * 1.25;
  const outputRate = sonnet.output / 1_000_000;

  const baseInputCost = usage.input_tokens * baseInputRate;
  const cacheReadCost = usage.cache_read_input_tokens * cacheReadRate;
  const cacheWriteCost = usage.cache_creation_input_tokens * cacheWriteRate;
  const outputCost = usage.output_tokens * outputRate;
  const total = baseInputCost + cacheReadCost + cacheWriteCost + outputCost;

  const cacheState =
    usage.cache_read_input_tokens > 0
      ? `HIT (${usage.cache_read_input_tokens} tok cached)`
      : usage.cache_creation_input_tokens > 0
        ? `MISS (${usage.cache_creation_input_tokens} tok cached for next call)`
        : "none";

  console.log(
    `[compile] model=${model} in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cache=${cacheState} cost=$${total.toFixed(5)}`
  );
}

export async function POST(req: Request): Promise<NextResponse<CompileResponse | CompileError>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON in request body." }, { status: 400 });
  }

  const result = validate(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  let llmResult;
  try {
    llmResult = await callCompiler(result.data.source, result.data.mode);
  } catch (err) {
    if (err instanceof AnthropicNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unknown error from the compiler.";
    return NextResponse.json({ error: "Compiler call failed.", details: message }, { status: 502 });
  }

  logCompile(llmResult.model, llmResult.usage);

  let parsed: unknown;
  try {
    parsed = JSON.parse(llmResult.raw);
  } catch {
    return NextResponse.json(
      {
        error: "Compiler returned malformed JSON.",
        details:
          "The model's output was not valid JSON. Task 2.4 will add a retry pass with stricter framing.",
      },
      { status: 502 }
    );
  }

  // The Meta-Prompt deliberately doesn't ask the model to populate the
  // version (it shouldn't know its own version). We inject server-side so
  // every response carries the version that produced it.
  const response: CompileResponse = {
    ...(parsed as Omit<CompileResponse, "meta_prompt_version">),
    meta_prompt_version: META_PROMPT_VERSION,
  };

  return NextResponse.json(response);
}

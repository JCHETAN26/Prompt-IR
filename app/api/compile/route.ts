import { NextResponse } from "next/server";

import {
  AnthropicNotConfiguredError,
  GeminiNotConfiguredError,
  OpenAINotConfiguredError,
  callCompiler,
  type CompileResult,
  type Provider,
  type UnifiedUsage,
} from "@/lib/compile";
import { formatIR } from "@/lib/format-ir";
import { callJudge } from "@/lib/judge";
import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
import { parseIR, type CompilerOutput } from "@/lib/parse-ir";
import { PRICING, type ModelKey } from "@/lib/pricing";
import type { CompileError, CompileMode, CompileRequest, CompileResponse } from "@/lib/types";

export const runtime = "nodejs";

// Vercel Hobby plan caps function duration at 60s. A compile on a large
// (5k+ token) source can run 20-30s for Sonnet + up to 5s for the Haiku
// judge + a potential retry on parse failure — all well over the default
// 10s ceiling. 60s gives breathing room without inviting runaway jobs.
export const maxDuration = 60;

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
  if (b.mode !== "claude" && b.mode !== "openai" && b.mode !== "gemini") {
    return {
      ok: false,
      status: 400,
      error: "Field 'mode' must be 'claude', 'openai', or 'gemini'.",
    };
  }

  return { ok: true, data: { source: b.source, mode: b.mode } };
}

function pricingKeyFor(provider: Provider): ModelKey {
  if (provider === "openai") return "gpt-4o";
  if (provider === "gemini") return "gemini-flash";
  return "claude-sonnet";
}

function logCompile(provider: Provider, model: string, usage: UnifiedUsage): void {
  const rates = PRICING[pricingKeyFor(provider)];

  const baseInputCost = (usage.input_tokens * rates.input) / 1_000_000;
  const cachedInputCost = (usage.cached_input_tokens * rates.cachedInput) / 1_000_000;
  // Anthropic-only: 25% premium for cache writes. OpenAI auto-caches with
  // no write surcharge, so this term is 0 for them.
  const cacheWriteCost = (usage.cache_write_tokens * rates.input * 1.25) / 1_000_000;
  const outputCost = (usage.output_tokens * rates.output) / 1_000_000;
  const total = baseInputCost + cachedInputCost + cacheWriteCost + outputCost;

  let cacheState = "none";
  if (usage.cached_input_tokens > 0) {
    cacheState = `HIT (${usage.cached_input_tokens} tok cached)`;
  } else if (usage.cache_write_tokens > 0) {
    cacheState = `MISS (${usage.cache_write_tokens} tok cached for next call)`;
  }

  console.log(
    `[compile] provider=${provider} model=${model} in=${usage.input_tokens} out=${usage.output_tokens} ` +
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

  const compileResult = await compileWithRetry(result.data.source, result.data.mode);

  if (!compileResult.ok) {
    return NextResponse.json(
      { error: compileResult.error, details: compileResult.details },
      {
        status: compileResult.status,
      }
    );
  }

  // Judge runs sequentially after a successful compile. It has its own
  // 5s timeout and returns null on any failure, so we never block the
  // user on a slow / unavailable Haiku.
  const irText = formatIR(compileResult.data.ir, result.data.mode);
  const judgeResult = await callJudge(result.data.source, irText);
  if (judgeResult) {
    const judgeCost =
      (judgeResult.usage.input_tokens * PRICING["claude-sonnet"].input * (1 / 60)) / 1_000_000 +
      (judgeResult.usage.output_tokens * PRICING["claude-sonnet"].output * (1 / 60)) / 1_000_000;
    // Haiku is ~1/60 the price of Sonnet on the input/output split; rough
    // estimate is fine for logging. Real per-model rates would need a Haiku
    // entry in pricing.ts — out of scope here.
    console.log(
      `[judge] in=${judgeResult.usage.input_tokens} out=${judgeResult.usage.output_tokens} ` +
        `score=${judgeResult.score.specificity}/${judgeResult.score.constraint_clarity}/${judgeResult.score.formatting} ` +
        `cost≈$${judgeCost.toFixed(5)}`
    );
  } else {
    console.log(`[judge] failed; confidence_score will be null`);
  }

  const response: CompileResponse = {
    ...compileResult.data,
    metrics: {
      ...compileResult.data.metrics,
      confidence_score: judgeResult?.score ?? null,
    },
    meta_prompt_version: META_PROMPT_VERSION,
  };

  return NextResponse.json(response);
}

type CompileWithRetryResult =
  | { ok: true; data: CompilerOutput }
  | { ok: false; status: number; error: string; details?: string };

async function compileWithRetry(
  source: string,
  mode: CompileMode
): Promise<CompileWithRetryResult> {
  let llmResult: CompileResult;
  try {
    llmResult = await callCompiler(source, mode);
  } catch (err) {
    return mapCompilerError(err);
  }
  logCompile(llmResult.provider, llmResult.model, llmResult.usage);

  let parse = parseIR(llmResult.raw);
  if (parse.ok) {
    return { ok: true, data: parse.data };
  }

  console.log(`[compile] parse failed (${parse.error}); retrying once`);

  try {
    llmResult = await callCompiler(source, mode, {
      previousAttempt: { raw: llmResult.raw, parseError: parse.error },
    });
  } catch (err) {
    return mapCompilerError(err);
  }
  logCompile(llmResult.provider, llmResult.model, llmResult.usage);

  parse = parseIR(llmResult.raw);
  if (parse.ok) {
    return { ok: true, data: parse.data };
  }

  return {
    ok: false,
    status: 502,
    error: "Compiler returned malformed output twice.",
    details: parse.error,
  };
}

function mapCompilerError(err: unknown): CompileWithRetryResult {
  if (
    err instanceof AnthropicNotConfiguredError ||
    err instanceof OpenAINotConfiguredError ||
    err instanceof GeminiNotConfiguredError
  ) {
    return { ok: false, status: 503, error: err.message };
  }
  const message = err instanceof Error ? err.message : "Unknown error from the compiler.";
  return { ok: false, status: 502, error: "Compiler call failed.", details: message };
}

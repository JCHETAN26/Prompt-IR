import { NextResponse } from "next/server";

import {
  AnthropicNotConfiguredError,
  callCompiler,
  type CompileLLMResult,
  type CompileUsage,
} from "@/lib/anthropic";
import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
import { parseIR, type CompilerOutput } from "@/lib/parse-ir";
import { PRICING } from "@/lib/pricing";
import type { CompileError, CompileMode, CompileRequest, CompileResponse } from "@/lib/types";

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

  const compileResult = await compileWithRetry(result.data.source, result.data.mode);

  if (!compileResult.ok) {
    return NextResponse.json(
      { error: compileResult.error, details: compileResult.details },
      {
        status: compileResult.status,
      }
    );
  }

  const response: CompileResponse = {
    ...compileResult.data,
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
  let llmResult: CompileLLMResult;
  try {
    llmResult = await callCompiler(source, mode);
  } catch (err) {
    return mapCompilerError(err);
  }
  logCompile(llmResult.model, llmResult.usage);

  let parse = parseIR(llmResult.raw);
  if (parse.ok) {
    return { ok: true, data: parse.data };
  }

  // One retry with the prior attempt + parse error as in-conversation
  // context. The cached system prompt stays the same, so this retry still
  // hits the cache read path on the static portion.
  console.log(`[compile] parse failed (${parse.error}); retrying once`);

  try {
    llmResult = await callCompiler(source, mode, {
      previousAttempt: { raw: llmResult.raw, parseError: parse.error },
    });
  } catch (err) {
    return mapCompilerError(err);
  }
  logCompile(llmResult.model, llmResult.usage);

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
  if (err instanceof AnthropicNotConfiguredError) {
    return { ok: false, status: 503, error: err.message };
  }
  const message = err instanceof Error ? err.message : "Unknown error from the compiler.";
  return { ok: false, status: 502, error: "Compiler call failed.", details: message };
}

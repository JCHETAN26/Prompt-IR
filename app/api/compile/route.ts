import { NextResponse } from "next/server";

import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
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

function buildStub({ source }: CompileRequest): CompileResponse {
  const trimmed = source.trim();
  return {
    ir: {
      context: trimmed,
      constraints: "// stub: real constraints arrive in Task 2.3",
      rules: "// stub: real rules arrive in Task 2.3",
      task: "// stub: real task block arrives in Task 2.3",
    },
    diff: [
      {
        original: "(stub diff entry)",
        replacement: null,
        reason: "Stub response. Real refinements land when the Anthropic SDK is wired in Task 2.3.",
        tokens_saved: 0,
        category: "filler",
      },
    ],
    metrics: {
      compression_pct: 0,
      density_score: 0,
      confidence_score: {
        specificity: 0,
        constraint_clarity: 0,
        formatting: 0,
      },
    },
    rationale: {
      context: "stub: rationale arrives in Task 2.3",
      constraints: "stub: rationale arrives in Task 2.3",
      rules: "stub: rationale arrives in Task 2.3",
      task: "stub: rationale arrives in Task 2.3",
    },
    meta_prompt_version: META_PROMPT_VERSION,
  };
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

  return NextResponse.json(buildStub(result.data));
}

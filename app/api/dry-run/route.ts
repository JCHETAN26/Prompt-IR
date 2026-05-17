import { NextResponse } from "next/server";

import { DryRunNotConfiguredError, callDryRun } from "@/lib/dry-run";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_TEXT_CHARS = 50_000;

type DryRunRequest = {
  source: string;
  ir: string;
};

type Validated = { ok: true; data: DryRunRequest } | { ok: false; status: number; error: string };

function validate(body: unknown): Validated {
  if (typeof body !== "object" || body === null) {
    return { ok: false, status: 400, error: "Request body must be a JSON object." };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.source !== "string" || b.source.trim().length === 0) {
    return { ok: false, status: 400, error: "Field 'source' must be a non-empty string." };
  }
  if (typeof b.ir !== "string" || b.ir.trim().length === 0) {
    return { ok: false, status: 400, error: "Field 'ir' must be a non-empty string." };
  }
  if (b.source.length > MAX_TEXT_CHARS || b.ir.length > MAX_TEXT_CHARS) {
    return {
      ok: false,
      status: 413,
      error: `'source' and 'ir' each must be under ${MAX_TEXT_CHARS} chars.`,
    };
  }

  return { ok: true, data: { source: b.source, ir: b.ir } };
}

export async function POST(req: Request) {
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

  try {
    const dryRun = await callDryRun(result.data.source, result.data.ir);
    if (!dryRun) {
      return NextResponse.json(
        {
          error: "Dry Run failed.",
          details:
            "The judge model timed out or returned no usable output. Try again, or compile a tighter IR.",
        },
        { status: 502 }
      );
    }
    console.log(`[dry-run] in=${dryRun.usage.input_tokens} out=${dryRun.usage.output_tokens}`);
    return NextResponse.json(dryRun);
  } catch (err) {
    if (err instanceof DryRunNotConfiguredError) {
      return NextResponse.json({ error: err.message }, { status: 503 });
    }
    const message = err instanceof Error ? err.message : "Unknown error.";
    return NextResponse.json({ error: "Dry Run failed.", details: message }, { status: 502 });
  }
}

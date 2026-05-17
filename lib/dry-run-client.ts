"use client";

export type DryRunResponse = {
  source_summary: string;
  ir_summary: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
};

export type DryRunClientResult =
  | { ok: true; data: DryRunResponse }
  | { ok: false; error: string; details?: string };

export async function runDryRun(source: string, ir: string): Promise<DryRunClientResult> {
  let res: Response;
  try {
    res = await fetch("/api/dry-run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source, ir }),
    });
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }

  let payload: unknown;
  try {
    payload = await res.json();
  } catch {
    return {
      ok: false,
      error: "Server returned a non-JSON response.",
      details: `HTTP ${res.status}`,
    };
  }

  if (!res.ok) {
    const obj = (typeof payload === "object" && payload !== null ? payload : {}) as Record<
      string,
      unknown
    >;
    const error =
      typeof obj.error === "string" ? obj.error : `Request failed with status ${res.status}.`;
    const details = typeof obj.details === "string" ? obj.details : undefined;
    return { ok: false, error, details };
  }

  return { ok: true, data: payload as DryRunResponse };
}

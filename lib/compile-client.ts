"use client";

import type { CompileMode, CompileRequest, CompileResponse } from "./types";

export type CompileClientResult =
  | { ok: true; data: CompileResponse }
  | { ok: false; error: string; details?: string };

export async function compileSource(
  source: string,
  mode: CompileMode
): Promise<CompileClientResult> {
  const body: CompileRequest = { source, mode };

  let res: Response;
  try {
    res = await fetch("/api/compile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  return { ok: true, data: payload as CompileResponse };
}

export function modeForModel(model: string): CompileMode {
  if (model === "gpt-4o") return "openai";
  if (model === "gemini-flash") return "gemini";
  return "claude";
}

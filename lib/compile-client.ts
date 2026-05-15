"use client";

import type { CompileMode, CompileRequest, CompileResponse } from "./types";

export type CompileClientResult =
  | { ok: true; data: CompileResponse }
  | { ok: false; error: string };

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
    return { ok: false, error: "Server returned a non-JSON response." };
  }

  if (!res.ok) {
    const message =
      typeof payload === "object" && payload !== null && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Request failed with status ${res.status}.`;
    return { ok: false, error: message };
  }

  return { ok: true, data: payload as CompileResponse };
}

export function modeForModel(model: string): CompileMode {
  return model === "gpt-4o" ? "openai" : "claude";
}

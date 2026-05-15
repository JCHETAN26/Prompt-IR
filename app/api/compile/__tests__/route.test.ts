import { describe, expect, it } from "vitest";

import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
import type { CompileResponse } from "@/lib/types";

import { POST } from "../route";

function makeRequest(body: unknown, opts: { malformed?: boolean } = {}) {
  return new Request("http://localhost/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts.malformed ? "{not json" : JSON.stringify(body),
  });
}

describe("POST /api/compile", () => {
  it("returns 200 + a CompileResponse-shaped stub for a valid request", async () => {
    const res = await POST(makeRequest({ source: "build me a thing", mode: "claude" }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as CompileResponse;

    expect(body.ir).toEqual({
      context: "build me a thing",
      constraints: expect.any(String),
      rules: expect.any(String),
      task: expect.any(String),
    });
    expect(Array.isArray(body.diff)).toBe(true);
    expect(body.metrics.confidence_score).toEqual({
      specificity: 0,
      constraint_clarity: 0,
      formatting: 0,
    });
    expect(body.rationale).toEqual({
      context: expect.any(String),
      constraints: expect.any(String),
      rules: expect.any(String),
      task: expect.any(String),
    });
    expect(body.meta_prompt_version).toBe(META_PROMPT_VERSION);
  });

  it("trims surrounding whitespace from source before placing it in context", async () => {
    const res = await POST(makeRequest({ source: "   hello world   ", mode: "openai" }));
    const body = (await res.json()) as CompileResponse;
    expect(body.ir.context).toBe("hello world");
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(makeRequest(null, { malformed: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/JSON/i);
  });

  it("rejects an empty source with 400", async () => {
    const res = await POST(makeRequest({ source: "   ", mode: "claude" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/empty/i);
  });

  it("rejects a missing source with 400", async () => {
    const res = await POST(makeRequest({ mode: "claude" }));
    expect(res.status).toBe(400);
  });

  it("rejects an invalid mode with 400", async () => {
    const res = await POST(makeRequest({ source: "ok", mode: "gemini" }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/mode/i);
  });

  it("rejects an oversized source with 413", async () => {
    const huge = "a".repeat(50_001);
    const res = await POST(makeRequest({ source: huge, mode: "claude" }));
    expect(res.status).toBe(413);
  });
});

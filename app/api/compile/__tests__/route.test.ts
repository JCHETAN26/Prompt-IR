import { beforeEach, describe, expect, it, vi } from "vitest";

import { AnthropicNotConfiguredError } from "@/lib/anthropic";
import { META_PROMPT_VERSION } from "@/lib/meta-prompt";
import type { CompileResponse } from "@/lib/types";

import { POST } from "../route";

// Mock the SDK wrapper so tests never hit the real API.
vi.mock("@/lib/anthropic", async () => {
  const actual = await vi.importActual<typeof import("@/lib/anthropic")>("@/lib/anthropic");
  return {
    ...actual,
    callCompiler: vi.fn(),
  };
});

const { callCompiler } = await import("@/lib/anthropic");
const mockedCallCompiler = vi.mocked(callCompiler);

function fullStubBody(source: string) {
  return JSON.stringify({
    ir: {
      context: source.trim(),
      constraints: "no external deps",
      rules: "always exit 0",
      task: "ship a binary named 'cli'",
    },
    diff: [
      {
        original: "please",
        replacement: null,
        reason: "Politeness removed.",
        tokens_saved: 1,
        category: "politeness",
      },
    ],
    metrics: {
      compression_pct: 42,
      density_score: 0.7,
      confidence_score: { specificity: 0, constraint_clarity: 0, formatting: 0 },
    },
    rationale: {
      context: "test rationale",
      constraints: "test rationale",
      rules: "test rationale",
      task: "test rationale",
    },
  });
}

function makeRequest(body: unknown, opts: { malformed?: boolean } = {}) {
  return new Request("http://localhost/api/compile", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts.malformed ? "{not json" : JSON.stringify(body),
  });
}

function mockSuccess(raw: string) {
  mockedCallCompiler.mockResolvedValueOnce({
    raw,
    model: "claude-3-5-sonnet-20241022",
    usage: {
      input_tokens: 100,
      output_tokens: 50,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  });
}

function badShape(): string {
  // Missing ir.task — passes JSON.parse but fails Zod schema.
  return JSON.stringify({
    ir: { context: "x", constraints: "y", rules: "z" },
    diff: [],
    metrics: {
      compression_pct: 0,
      density_score: 0,
      confidence_score: { specificity: 0, constraint_clarity: 0, formatting: 0 },
    },
    rationale: { context: "", constraints: "", rules: "", task: "" },
  });
}

describe("POST /api/compile", () => {
  beforeEach(() => {
    mockedCallCompiler.mockReset();
  });

  it("returns 200 + parsed CompileResponse with injected meta_prompt_version", async () => {
    mockSuccess(fullStubBody("build me a thing"));

    const res = await POST(makeRequest({ source: "build me a thing", mode: "claude" }));
    expect(res.status).toBe(200);

    const body = (await res.json()) as CompileResponse;
    expect(body.ir.context).toBe("build me a thing");
    expect(body.diff).toHaveLength(1);
    expect(body.meta_prompt_version).toBe(META_PROMPT_VERSION);
  });

  it("returns 503 when ANTHROPIC_API_KEY is not configured", async () => {
    mockedCallCompiler.mockRejectedValueOnce(new AnthropicNotConfiguredError());

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 502 when the SDK throws an unexpected error", async () => {
    mockedCallCompiler.mockRejectedValueOnce(new Error("rate limit"));

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; details?: string };
    expect(body.error).toMatch(/Compiler call failed/);
    expect(body.details).toMatch(/rate limit/);
  });

  it("retries once when the first response is non-JSON and succeeds on retry", async () => {
    mockSuccess("This is not JSON at all.");
    mockSuccess(fullStubBody("anything"));

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(200);
    expect(mockedCallCompiler).toHaveBeenCalledTimes(2);

    // The second call receives previousAttempt with the bad raw + parse error.
    const secondCallArgs = mockedCallCompiler.mock.calls[1];
    expect(secondCallArgs[0]).toBe("anything");
    expect(secondCallArgs[1]).toBe("claude");
    expect(secondCallArgs[2]?.previousAttempt?.raw).toBe("This is not JSON at all.");
    expect(secondCallArgs[2]?.previousAttempt?.parseError).toMatch(/Invalid JSON/);
  });

  it("retries when the first response has wrong shape and succeeds on retry", async () => {
    mockSuccess(badShape());
    mockSuccess(fullStubBody("anything"));

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(200);
    expect(mockedCallCompiler).toHaveBeenCalledTimes(2);

    const secondCallArgs = mockedCallCompiler.mock.calls[1];
    expect(secondCallArgs[2]?.previousAttempt?.parseError).toMatch(/Schema mismatch/);
  });

  it("returns 502 when both attempts return malformed output", async () => {
    mockSuccess("not json");
    mockSuccess("still not json");

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(502);
    expect(mockedCallCompiler).toHaveBeenCalledTimes(2);
    const body = (await res.json()) as { error: string; details?: string };
    expect(body.error).toMatch(/twice/i);
    expect(body.details).toBeDefined();
  });

  it("does not retry when the first response parses successfully", async () => {
    mockSuccess(fullStubBody("anything"));

    const res = await POST(makeRequest({ source: "anything", mode: "claude" }));
    expect(res.status).toBe(200);
    expect(mockedCallCompiler).toHaveBeenCalledTimes(1);
  });

  it("rejects malformed request JSON with 400", async () => {
    const res = await POST(makeRequest(null, { malformed: true }));
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/JSON/i);
  });

  it("rejects empty source with 400 (before calling the SDK)", async () => {
    const res = await POST(makeRequest({ source: "   ", mode: "claude" }));
    expect(res.status).toBe(400);
    expect(mockedCallCompiler).not.toHaveBeenCalled();
  });

  it("rejects missing source with 400", async () => {
    const res = await POST(makeRequest({ mode: "claude" }));
    expect(res.status).toBe(400);
    expect(mockedCallCompiler).not.toHaveBeenCalled();
  });

  it("rejects invalid mode with 400", async () => {
    const res = await POST(makeRequest({ source: "ok", mode: "gemini" }));
    expect(res.status).toBe(400);
    expect(mockedCallCompiler).not.toHaveBeenCalled();
  });

  it("rejects oversized source with 413", async () => {
    const huge = "a".repeat(50_001);
    const res = await POST(makeRequest({ source: huge, mode: "claude" }));
    expect(res.status).toBe(413);
    expect(mockedCallCompiler).not.toHaveBeenCalled();
  });

  it("passes the requested mode through to the SDK wrapper", async () => {
    mockSuccess(fullStubBody("hello"));
    await POST(makeRequest({ source: "hello", mode: "openai" }));
    expect(mockedCallCompiler).toHaveBeenCalledWith("hello", "openai");
  });
});

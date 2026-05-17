import { beforeEach, describe, expect, it, vi } from "vitest";

import { DryRunNotConfiguredError } from "@/lib/dry-run";

import { POST } from "../route";

vi.mock("@/lib/dry-run", async () => {
  const actual = await vi.importActual<typeof import("@/lib/dry-run")>("@/lib/dry-run");
  return {
    ...actual,
    callDryRun: vi.fn(),
  };
});

const { callDryRun } = await import("@/lib/dry-run");
const mockedCallDryRun = vi.mocked(callDryRun);

function makeRequest(body: unknown, opts: { malformed?: boolean } = {}) {
  return new Request("http://localhost/api/dry-run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: opts.malformed ? "{not json" : JSON.stringify(body),
  });
}

describe("POST /api/dry-run", () => {
  beforeEach(() => {
    mockedCallDryRun.mockReset();
  });

  it("returns 200 + both summaries on success", async () => {
    mockedCallDryRun.mockResolvedValueOnce({
      source_summary: "User wants a chatbot.",
      ir_summary: "Build a chatbot.",
      usage: { input_tokens: 200, output_tokens: 60 },
    });

    const res = await POST(makeRequest({ source: "raw source text", ir: "compiled ir text" }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      source_summary: string;
      ir_summary: string;
    };
    expect(body.source_summary).toBe("User wants a chatbot.");
    expect(body.ir_summary).toBe("Build a chatbot.");
  });

  it("returns 503 when ANTHROPIC_API_KEY is missing", async () => {
    mockedCallDryRun.mockRejectedValueOnce(new DryRunNotConfiguredError());

    const res = await POST(makeRequest({ source: "x", ir: "y" }));
    expect(res.status).toBe(503);
    const body = (await res.json()) as { error: string };
    expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
  });

  it("returns 502 when the judge call returns null (timeout / no output)", async () => {
    mockedCallDryRun.mockResolvedValueOnce(null);

    const res = await POST(makeRequest({ source: "x", ir: "y" }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; details?: string };
    expect(body.error).toMatch(/Dry Run failed/);
    expect(body.details).toMatch(/timed out|no usable output/);
  });

  it("returns 502 on an unexpected SDK error", async () => {
    mockedCallDryRun.mockRejectedValueOnce(new Error("rate limit"));

    const res = await POST(makeRequest({ source: "x", ir: "y" }));
    expect(res.status).toBe(502);
    const body = (await res.json()) as { error: string; details?: string };
    expect(body.error).toMatch(/Dry Run failed/);
    expect(body.details).toMatch(/rate limit/);
  });

  it("rejects malformed JSON with 400", async () => {
    const res = await POST(makeRequest(null, { malformed: true }));
    expect(res.status).toBe(400);
    expect(mockedCallDryRun).not.toHaveBeenCalled();
  });

  it("rejects empty source with 400", async () => {
    const res = await POST(makeRequest({ source: "  ", ir: "ok" }));
    expect(res.status).toBe(400);
    expect(mockedCallDryRun).not.toHaveBeenCalled();
  });

  it("rejects empty ir with 400", async () => {
    const res = await POST(makeRequest({ source: "ok", ir: "" }));
    expect(res.status).toBe(400);
    expect(mockedCallDryRun).not.toHaveBeenCalled();
  });

  it("rejects oversized source with 413", async () => {
    const huge = "a".repeat(50_001);
    const res = await POST(makeRequest({ source: huge, ir: "ok" }));
    expect(res.status).toBe(413);
    expect(mockedCallDryRun).not.toHaveBeenCalled();
  });
});

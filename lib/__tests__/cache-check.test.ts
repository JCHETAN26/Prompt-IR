import { describe, expect, it } from "vitest";

import { CACHE_THRESHOLD, isCacheReady } from "../cache-check";

// Build an IR string with all four sections, padded to N tokens worth of
// repeated content. Used to test the threshold branch without depending
// on any specific encoder behavior beyond "longer string → more tokens."
function bigIR(format: "xml" | "md", contentRepetitions: number): string {
  const filler = "the quick brown fox jumps over the lazy dog. ".repeat(contentRepetitions);
  if (format === "xml") {
    return [
      `<context>\n${filler}\n</context>`,
      `<constraints>\n${filler}\n</constraints>`,
      `<rules>\n${filler}\n</rules>`,
      `<task>\n${filler}\n</task>`,
    ].join("\n\n");
  }
  return [
    `## Context\n\n${filler}`,
    `## Constraints\n\n${filler}`,
    `## Rules\n\n${filler}`,
    `## Task\n\n${filler}`,
  ].join("\n\n");
}

describe("isCacheReady", () => {
  it("returns ready=false with 'no IR yet' on empty input", () => {
    const r = isCacheReady("", "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/no IR/);
    expect(r.tokens).toBe(0);
  });

  it("returns ready=false with 'no IR yet' on whitespace-only input", () => {
    const r = isCacheReady("   \n   ", "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/no IR/);
  });

  it("flags missing sections by name (XML form)", () => {
    const partial = "<context>x</context>\n<rules>y</rules>\n<task>z</task>";
    const r = isCacheReady(partial, "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/missing/);
    expect(r.reason).toMatch(/constraints/);
  });

  it("flags missing sections by name (Markdown form)", () => {
    const partial = "## Context\n\nx\n\n## Rules\n\ny\n\n## Task\n\nz";
    const r = isCacheReady(partial, "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/missing/);
    expect(r.reason).toMatch(/constraints/);
  });

  it("flags out-of-order sections", () => {
    const reordered =
      "<task>z</task>\n<context>x</context>\n<constraints>y</constraints>\n<rules>q</rules>";
    const r = isCacheReady(reordered, "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/out of canonical order/);
  });

  it("returns 'below cache threshold' when all sections present but token count is too low", () => {
    const tiny =
      "<context>x</context>\n<constraints>y</constraints>\n<rules>z</rules>\n<task>q</task>";
    const r = isCacheReady(tiny, "claude-sonnet");
    expect(r.ready).toBe(false);
    expect(r.reason).toMatch(/below cache threshold/);
    expect(r.reason).toMatch(new RegExp(`${CACHE_THRESHOLD}`));
    expect(r.tokens).toBeGreaterThan(0);
    expect(r.tokens).toBeLessThan(CACHE_THRESHOLD);
  });

  it("returns ready=true when all four sections are in order AND tokens >= threshold (XML)", () => {
    // ~80 repetitions of a 10-token sentence ~ ~800 tokens of filler per
    // section × 4 sections ~ comfortably above 1024.
    const r = isCacheReady(bigIR("xml", 80), "claude-sonnet");
    expect(r.tokens).toBeGreaterThanOrEqual(CACHE_THRESHOLD);
    expect(r.ready).toBe(true);
    expect(r.reason).toMatch(/canonical order/);
  });

  it("returns ready=true for the Markdown form too", () => {
    const r = isCacheReady(bigIR("md", 80), "claude-sonnet");
    expect(r.tokens).toBeGreaterThanOrEqual(CACHE_THRESHOLD);
    expect(r.ready).toBe(true);
  });

  it("respects model parameter (different encoders could in theory yield different counts)", () => {
    // o200k_base is shared across our three models today, so the result is
    // identical here — but the contract is "honest per-model" and the call
    // shape should preserve that even if encoders diverge later.
    const ir = bigIR("xml", 80);
    expect(isCacheReady(ir, "claude-sonnet").ready).toBe(true);
    expect(isCacheReady(ir, "gpt-4o").ready).toBe(true);
    expect(isCacheReady(ir, "gemini-flash").ready).toBe(true);
  });
});

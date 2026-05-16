import { describe, expect, it } from "vitest";

import { parseIR } from "../parse-ir";

const VALID = {
  ir: {
    context: "build a CLI",
    constraints: "no external deps",
    rules: "exit 0 on success",
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
    context: "r1",
    constraints: "r2",
    rules: "r3",
    task: "r4",
  },
};

describe("parseIR", () => {
  it("accepts a fully-valid response", () => {
    const result = parseIR(JSON.stringify(VALID));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.ir.context).toBe("build a CLI");
      expect(result.data.diff).toHaveLength(1);
    }
  });

  it("rejects non-JSON text", () => {
    const result = parseIR("This is just prose, not JSON.");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Invalid JSON/);
  });

  it("rejects when a required field is missing", () => {
    const broken = { ...VALID, ir: { context: "x", constraints: "y", rules: "z" } };
    const result = parseIR(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(/Schema mismatch/);
      expect(result.error).toMatch(/ir\.task/);
    }
  });

  it("rejects when a field has the wrong type", () => {
    const broken = {
      ...VALID,
      diff: [{ ...VALID.diff[0], tokens_saved: "five" }],
    };
    const result = parseIR(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/diff\.0\.tokens_saved/);
  });

  it("rejects an invalid diff category enum", () => {
    const broken = { ...VALID, diff: [{ ...VALID.diff[0], category: "bogus" }] };
    const result = parseIR(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/diff\.0\.category/);
  });

  it("tolerates extra unknown fields (strip mode)", () => {
    const withExtras = {
      ...VALID,
      ir: { ...VALID.ir, _llm_notes: "I felt like adding context here" },
      _model_chatter: "anthropic was here",
    };
    const result = parseIR(JSON.stringify(withExtras));
    expect(result.ok).toBe(true);
    if (result.ok) {
      // Extras are silently stripped, not preserved.
      expect((result.data.ir as Record<string, unknown>)._llm_notes).toBeUndefined();
    }
  });

  it("accepts replacement: null as a pure-removal diff entry", () => {
    const result = parseIR(JSON.stringify(VALID));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.diff[0].replacement).toBeNull();
  });

  it("rejects when confidence_score is missing a subfield", () => {
    const broken = {
      ...VALID,
      metrics: {
        ...VALID.metrics,
        confidence_score: { specificity: 0, formatting: 0 },
      },
    };
    const result = parseIR(JSON.stringify(broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/constraint_clarity/);
  });
});

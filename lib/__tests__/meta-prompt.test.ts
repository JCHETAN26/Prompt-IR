import { describe, expect, it } from "vitest";

import { META_PROMPT_VERSION, buildMetaPrompt } from "../meta-prompt";

describe("META_PROMPT_VERSION", () => {
  it("is a semver string", () => {
    expect(META_PROMPT_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe("buildMetaPrompt", () => {
  it("emits the JSON-only directive in both modes", () => {
    expect(buildMetaPrompt({ mode: "claude" })).toMatch(/JSON ONLY/i);
    expect(buildMetaPrompt({ mode: "openai" })).toMatch(/JSON ONLY/i);
  });

  it("declares the canonical tag order in both modes", () => {
    const claude = buildMetaPrompt({ mode: "claude" });
    const openai = buildMetaPrompt({ mode: "openai" });
    expect(claude).toMatch(/context → constraints → rules → task/);
    expect(openai).toMatch(/context → constraints → rules → task/);
  });

  it("forbids self-wrapping ir.* fields in both modes", () => {
    expect(buildMetaPrompt({ mode: "claude" })).toMatch(/Do NOT wrap them in tags/);
    expect(buildMetaPrompt({ mode: "openai" })).toMatch(/Do NOT wrap them in tags/);
  });

  it("includes the full JSON schema with all required keys", () => {
    const out = buildMetaPrompt({ mode: "claude" });
    for (const key of [
      `"ir"`,
      `"context"`,
      `"constraints"`,
      `"rules"`,
      `"task"`,
      `"diff"`,
      `"metrics"`,
      `"compression_pct"`,
      `"density_score"`,
      `"confidence_score"`,
      `"specificity"`,
      `"constraint_clarity"`,
      `"formatting"`,
      `"rationale"`,
    ]) {
      expect(out).toContain(key);
    }
  });

  it("enumerates all five diff categories", () => {
    const out = buildMetaPrompt({ mode: "claude" });
    for (const category of ["filler", "politeness", "vague", "restructure", "tag"]) {
      expect(out).toMatch(new RegExp(`"${category}"`));
    }
  });

  it("emits a claude-specific note referencing XML tags", () => {
    const out = buildMetaPrompt({ mode: "claude" });
    expect(out).toMatch(/MODE: claude/);
    expect(out).toMatch(/XML tags/);
  });

  it("emits an openai-specific note referencing Markdown headings", () => {
    const out = buildMetaPrompt({ mode: "openai" });
    expect(out).toMatch(/MODE: openai/);
    expect(out).toMatch(/Markdown headings/);
  });

  it("emits a gemini-specific note referencing response_mime_type", () => {
    const out = buildMetaPrompt({ mode: "gemini" });
    expect(out).toMatch(/MODE: gemini/);
    expect(out).toMatch(/response_mime_type/);
    expect(out).toMatch(/Markdown headings/);
  });

  it("differs between modes only in the mode-specific block", () => {
    const claude = buildMetaPrompt({ mode: "claude" });
    const openai = buildMetaPrompt({ mode: "openai" });
    const gemini = buildMetaPrompt({ mode: "gemini" });
    expect(claude).not.toBe(openai);
    expect(claude).not.toBe(gemini);
    expect(openai).not.toBe(gemini);

    const stripMode = (s: string, mode: string) =>
      s.replace(new RegExp(`MODE: ${mode}[\\s\\S]*?(?=\\n\\nNow compile)`), "");
    expect(stripMode(claude, "claude")).toBe(stripMode(openai, "openai"));
    expect(stripMode(claude, "claude")).toBe(stripMode(gemini, "gemini"));
  });
});

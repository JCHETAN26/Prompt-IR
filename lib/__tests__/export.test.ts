import { describe, expect, it } from "vitest";

import { toCursorPrompt, toMarkdown, toText } from "../export";

const XML_IR = "<context>\nbuild a thing\n</context>\n\n<task>\nship it\n</task>";
const MD_IR = "## Context\n\nbuild a thing\n\n## Task\n\nship it";

describe("toMarkdown", () => {
  it("wraps XML IR in a ```xml code fence", () => {
    const out = toMarkdown(XML_IR, "claude");
    expect(out.startsWith("```xml\n")).toBe(true);
    expect(out.endsWith("\n```\n")).toBe(true);
    expect(out).toContain("<context>");
    expect(out).toContain("<task>");
  });

  it("passes Markdown IR through unwrapped for OpenAI mode", () => {
    const out = toMarkdown(MD_IR, "openai");
    expect(out).not.toContain("```");
    expect(out.startsWith("## Context")).toBe(true);
    expect(out.endsWith("\n")).toBe(true);
  });

  it("passes Markdown IR through unwrapped for Gemini mode", () => {
    const out = toMarkdown(MD_IR, "gemini");
    expect(out).not.toContain("```");
    expect(out).toContain("## Task");
  });
});

describe("toText", () => {
  it("returns the IR verbatim with a trailing newline", () => {
    expect(toText(XML_IR)).toBe(XML_IR + "\n");
    expect(toText(MD_IR)).toBe(MD_IR + "\n");
  });
});

describe("toCursorPrompt", () => {
  it("prefixes a comment header naming the mode", () => {
    const out = toCursorPrompt(XML_IR, "claude");
    expect(out.startsWith("// === Prompt-IR compiled prompt ===")).toBe(true);
    expect(out).toContain("// mode: claude");
    expect(out).toContain("// Paste this as the user message");
  });

  it("preserves the IR body after the header", () => {
    const out = toCursorPrompt(MD_IR, "gemini");
    expect(out).toContain("// mode: gemini");
    expect(out).toContain("## Context");
    expect(out).toContain("## Task");
  });

  it("ends with a trailing newline", () => {
    expect(toCursorPrompt(XML_IR, "claude").endsWith("\n")).toBe(true);
  });
});

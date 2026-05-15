import { describe, expect, it } from "vitest";

import { formatIR } from "../format-ir";
import type { CompileResponse } from "../types";

const ir: CompileResponse["ir"] = {
  context: "build a CLI",
  constraints: "no external deps",
  rules: "must exit 0 on success",
  task: "ship a binary named 'cli'",
};

describe("formatIR", () => {
  it("emits XML in canonical order for claude mode", () => {
    const out = formatIR(ir, "claude");
    expect(out).toContain("<context>\nbuild a CLI\n</context>");
    expect(out).toContain("<constraints>\nno external deps\n</constraints>");
    expect(out).toContain("<rules>\nmust exit 0 on success\n</rules>");
    expect(out).toContain("<task>\nship a binary named 'cli'\n</task>");
    expect(out.indexOf("<context>")).toBeLessThan(out.indexOf("<constraints>"));
    expect(out.indexOf("<constraints>")).toBeLessThan(out.indexOf("<rules>"));
    expect(out.indexOf("<rules>")).toBeLessThan(out.indexOf("<task>"));
  });

  it("emits Markdown sections in canonical order for openai mode", () => {
    const out = formatIR(ir, "openai");
    expect(out).toContain("## Context");
    expect(out).toContain("## Constraints");
    expect(out).toContain("## Rules");
    expect(out).toContain("## Task");
    expect(out).not.toContain("<context>");
    expect(out.indexOf("## Context")).toBeLessThan(out.indexOf("## Constraints"));
    expect(out.indexOf("## Constraints")).toBeLessThan(out.indexOf("## Rules"));
    expect(out.indexOf("## Rules")).toBeLessThan(out.indexOf("## Task"));
  });
});

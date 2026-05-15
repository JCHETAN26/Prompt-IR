import type { CompileMode, CompileResponse } from "./types";

export function formatIR(ir: CompileResponse["ir"], mode: CompileMode): string {
  if (mode === "claude") {
    return formatXml(ir);
  }
  return formatMarkdown(ir);
}

function formatXml(ir: CompileResponse["ir"]): string {
  return [
    `<context>\n${ir.context}\n</context>`,
    `<constraints>\n${ir.constraints}\n</constraints>`,
    `<rules>\n${ir.rules}\n</rules>`,
    `<task>\n${ir.task}\n</task>`,
  ].join("\n\n");
}

function formatMarkdown(ir: CompileResponse["ir"]): string {
  return [
    `## Context\n\n${ir.context}`,
    `## Constraints\n\n${ir.constraints}`,
    `## Rules\n\n${ir.rules}`,
    `## Task\n\n${ir.task}`,
  ].join("\n\n");
}

import type { CompileMode } from "./types";

/**
 * Markdown export. Claude mode emits XML, which renders as literal angle
 * brackets in Markdown — so we wrap it in a ```xml code fence to keep
 * the structure visible when the .md file is opened in a viewer. OpenAI
 * and Gemini modes already emit Markdown, so we hand them through.
 */
export function toMarkdown(ir: string, mode: CompileMode): string {
  if (mode === "claude") {
    return "```xml\n" + ir + "\n```\n";
  }
  return ir + "\n";
}

/** Plain-text export. The IR is already formatted; just append a newline. */
export function toText(ir: string): string {
  return ir + "\n";
}

/**
 * Cursor-friendly framing. Prefixes the IR with a self-describing comment
 * block so a user pasting it into Cursor (or any IDE chat) knows what
 * they're looking at without context.
 */
export function toCursorPrompt(ir: string, mode: CompileMode): string {
  const header = [
    "// === Prompt-IR compiled prompt ===",
    `// mode: ${mode}`,
    "// Paste this as the user message for Cursor / your AI editor.",
    "",
    "",
  ].join("\n");
  return header + ir + "\n";
}

/**
 * Trigger a file download in the browser. Pure side effect; not unit-tested
 * because it depends on the DOM. Use download(name, content, mime).
 */
export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Promise resolves on success, throws on failure (insecure-context, denied, etc.). */
export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

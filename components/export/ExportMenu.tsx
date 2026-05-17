"use client";

import { useState } from "react";

import { copyToClipboard, download, toCursorPrompt, toMarkdown, toText } from "@/lib/export";
import type { CompileMode } from "@/lib/types";

type ExportMenuProps = {
  ir: string;
  mode: CompileMode;
};

type FlashKind = "saved" | "copied" | "error";

type Flash = { kind: FlashKind; message: string };

const FLASH_MS = 1800;

export function ExportMenu({ ir, mode }: ExportMenuProps) {
  const [flash, setFlash] = useState<Flash | null>(null);

  function showFlash(next: Flash) {
    setFlash(next);
    setTimeout(() => setFlash((cur) => (cur === next ? null : cur)), FLASH_MS);
  }

  function handleDownloadMd() {
    try {
      download("prompt-ir.md", toMarkdown(ir, mode), "text/markdown");
      showFlash({ kind: "saved", message: "prompt-ir.md saved" });
    } catch {
      showFlash({ kind: "error", message: "download failed" });
    }
  }

  function handleDownloadTxt() {
    try {
      download("prompt-ir.txt", toText(ir), "text/plain");
      showFlash({ kind: "saved", message: "prompt-ir.txt saved" });
    } catch {
      showFlash({ kind: "error", message: "download failed" });
    }
  }

  async function handleCopyCursor() {
    try {
      await copyToClipboard(toCursorPrompt(ir, mode));
      showFlash({ kind: "copied", message: "copied for cursor" });
    } catch {
      showFlash({ kind: "error", message: "clipboard blocked" });
    }
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between px-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          export
        </span>
        {flash && (
          <span
            className={
              "font-mono text-[10px] " +
              (flash.kind === "error" ? "text-destructive" : "text-success")
            }
            role="status"
          >
            {flash.message}
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
        <ExportButton onClick={handleDownloadMd}>download .md</ExportButton>
        <ExportButton onClick={handleDownloadTxt}>download .txt</ExportButton>
        <ExportButton onClick={handleCopyCursor}>copy for cursor</ExportButton>
      </div>
    </div>
  );
}

function ExportButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="rounded border border-border bg-background px-2.5 py-1 text-foreground transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {children}
    </button>
  );
}

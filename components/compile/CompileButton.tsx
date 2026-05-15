"use client";

import type { CompileState } from "@/lib/types";

type CompileButtonProps = {
  state: CompileState;
  onCompile: () => void;
  disabled?: boolean;
};

export function CompileButton({ state, onCompile, disabled }: CompileButtonProps) {
  const isCompiling = state === "compiling";
  const isDisabled = disabled || isCompiling;

  return (
    <button
      type="button"
      onClick={onCompile}
      disabled={isDisabled}
      aria-label="Compile prompt"
      className="group inline-flex h-8 items-center gap-2 rounded-md border border-border bg-background px-3 font-mono text-xs text-foreground shadow-sm transition-all hover:border-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-border focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      <span>{isCompiling ? "compiling…" : "compile"}</span>
      <kbd className="font-mono text-[10px] text-muted-foreground transition-colors group-hover:text-foreground/70">
        ⌘↵
      </kbd>
    </button>
  );
}

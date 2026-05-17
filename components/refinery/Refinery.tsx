"use client";

import { useMemo } from "react";

import { CompileButton } from "@/components/compile/CompileButton";
import { DensityBadge } from "@/components/meters/DensityBadge";
import { TokenMeter } from "@/components/meters/TokenMeter";
import { densityScore } from "@/lib/density";
import { countTokens } from "@/lib/tokens";
import type { ModelKey } from "@/lib/pricing";
import type { CompileState } from "@/lib/types";

type RefineryProps = {
  value: string;
  onChange: (next: string) => void;
  model: ModelKey;
  compileState: CompileState;
  onCompile: () => void;
};

// Empirical thresholds from the testing matrix (filler-heavy / rambling /
// imperative / decision prompts measured against the same model). Above this
// density at a non-trivial token count, the IR's structural scaffolding tends
// to outweigh the gains and can inflate the downstream output. We surface a
// quiet hint rather than block — the user can still compile, just informed.
const TIGHT_DENSITY_THRESHOLD = 0.85;
const TIGHT_MIN_TOKENS = 10;

export function Refinery({ value, onChange, model, compileState, onCompile }: RefineryProps) {
  const tokens = useMemo(() => countTokens(value, model), [value, model]);
  const density = useMemo(() => densityScore(value), [value]);
  const hasContent = value.trim().length > 0;
  const isTight = density.score >= TIGHT_DENSITY_THRESHOLD && tokens >= TIGHT_MIN_TOKENS;

  return (
    <section className="flex flex-col">
      <div className="flex h-10 items-center justify-between gap-4 border-b border-border px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          source
        </span>
        <div className="flex items-center gap-3">
          <DensityBadge score={density.score} hasContent={hasContent} />
          <span className="text-muted-foreground/40">·</span>
          <TokenMeter tokens={tokens} model={model} />
        </div>
      </div>
      <div className="relative flex flex-1 flex-col">
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          spellCheck={false}
          autoCapitalize="off"
          autoComplete="off"
          autoCorrect="off"
          placeholder="Drop your messy logic, context, and requirements here..."
          className="flex-1 resize-none bg-transparent px-6 pb-20 pt-5 font-mono text-sm leading-relaxed text-foreground caret-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background via-background/85 to-transparent" />
        {isTight && (
          <div className="pointer-events-none absolute bottom-5 left-6 max-w-md font-mono text-[11px] leading-relaxed text-muted-foreground/80">
            already tight ({Math.round(density.score * 100)}% · {tokens} tok) — compiling may
            inflate the output
          </div>
        )}
        <div className="pointer-events-none absolute bottom-4 right-4">
          <div className="pointer-events-auto">
            <CompileButton state={compileState} onCompile={onCompile} disabled={!hasContent} />
          </div>
        </div>
      </div>
    </section>
  );
}

"use client";

import { useMemo } from "react";

import { DensityBadge } from "@/components/meters/DensityBadge";
import { TokenMeter } from "@/components/meters/TokenMeter";
import { densityScore } from "@/lib/density";
import { countTokens } from "@/lib/tokens";
import type { ModelKey } from "@/lib/pricing";

type RefineryProps = {
  value: string;
  onChange: (next: string) => void;
  model: ModelKey;
};

export function Refinery({ value, onChange, model }: RefineryProps) {
  const tokens = useMemo(() => countTokens(value, model), [value, model]);
  const density = useMemo(() => densityScore(value), [value]);

  return (
    <section className="flex flex-col">
      <div className="flex h-10 items-center justify-between gap-4 border-b border-border px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          source
        </span>
        <div className="flex items-center gap-3">
          <DensityBadge score={density.score} />
          <span className="text-muted-foreground/40">·</span>
          <TokenMeter tokens={tokens} model={model} />
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        placeholder="Drop your messy logic, context, and requirements here..."
        className="flex-1 resize-none bg-transparent px-6 py-5 font-mono text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
      />
    </section>
  );
}

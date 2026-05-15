"use client";

import { useMemo } from "react";

import { TokenMeter } from "@/components/meters/TokenMeter";
import { countTokens } from "@/lib/tokens";
import type { ModelKey } from "@/lib/pricing";

type IROutputProps = {
  ir: string | null;
  model: ModelKey;
};

export function IROutput({ ir, model }: IROutputProps) {
  const isEmpty = ir === null || ir.trim().length === 0;
  const tokens = useMemo(() => (isEmpty ? 0 : countTokens(ir!, model)), [ir, model, isEmpty]);

  return (
    <section className="flex flex-col">
      <div className="flex h-10 items-center justify-between border-b border-border px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ir
        </span>
        <TokenMeter tokens={tokens} model={model} />
      </div>
      <div className="flex-1 overflow-auto px-6 py-5 font-mono text-sm leading-relaxed">
        {isEmpty ? (
          <span className="text-muted-foreground/50">Compile to see the IR.</span>
        ) : (
          <pre className="whitespace-pre-wrap text-foreground">{ir}</pre>
        )}
      </div>
    </section>
  );
}

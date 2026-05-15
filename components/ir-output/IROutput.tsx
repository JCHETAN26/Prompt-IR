"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

import { TokenMeter } from "@/components/meters/TokenMeter";
import { countTokens } from "@/lib/tokens";
import type { ModelKey } from "@/lib/pricing";
import type { CompileState } from "@/lib/types";

type IROutputProps = {
  ir: string | null;
  model: ModelKey;
  compileState: CompileState;
};

export function IROutput({ ir, model, compileState }: IROutputProps) {
  const isEmpty = ir === null || ir.trim().length === 0;
  const tokens = useMemo(() => (isEmpty ? 0 : countTokens(ir!, model)), [ir, model, isEmpty]);
  const isCompiling = compileState === "compiling";

  return (
    <motion.section
      className="flex flex-col"
      animate={{
        boxShadow: isCompiling
          ? "inset 0 0 120px -30px rgba(150, 200, 255, 0.18)"
          : "inset 0 0 0px 0px rgba(150, 200, 255, 0)",
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex h-10 items-center justify-between border-b border-border px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ir
        </span>
        <TokenMeter tokens={tokens} model={model} />
      </div>
      <div className="flex-1 overflow-auto px-6 py-5 font-mono text-sm leading-relaxed">
        {isCompiling ? (
          <span className="animate-pulse text-muted-foreground/60">Compiling…</span>
        ) : isEmpty ? (
          <span className="text-muted-foreground/50">Compile to see the IR.</span>
        ) : (
          <pre className="whitespace-pre-wrap text-foreground">{ir}</pre>
        )}
      </div>
    </motion.section>
  );
}

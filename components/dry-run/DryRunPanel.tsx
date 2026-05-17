"use client";

import { AnimatePresence, motion } from "framer-motion";

import type { DryRunResponse } from "@/lib/dry-run-client";

export type DryRunState = "idle" | "running" | "done" | "error";

type DryRunPanelProps = {
  state: DryRunState;
  result: DryRunResponse | null;
  error: string | null;
  estimatedCost: number;
  onRun: () => void;
  onDismiss: () => void;
};

function formatCost(cost: number): string {
  if (cost < 0.0001) return "<$0.0001";
  return `≈ $${cost.toFixed(4)}`;
}

/**
 * Very rough similarity heuristic — if the two summaries share less than
 * half of their non-stopword tokens, we flag a divergence. Not a real
 * semantic comparison; it's a low-cost client-side hint that the user
 * should read both carefully before trusting the IR.
 */
function approximateDivergence(a: string, b: string): boolean {
  const tokens = (s: string) =>
    new Set(
      s
        .toLowerCase()
        .replace(/[^\w\s]/g, "")
        .split(/\s+/)
        .filter((w) => w.length > 3)
    );
  const sa = tokens(a);
  const sb = tokens(b);
  if (sa.size === 0 || sb.size === 0) return false;
  let overlap = 0;
  for (const w of sa) if (sb.has(w)) overlap++;
  const jaccard = overlap / (sa.size + sb.size - overlap);
  return jaccard < 0.4;
}

export function DryRunPanel({
  state,
  result,
  error,
  estimatedCost,
  onRun,
  onDismiss,
}: DryRunPanelProps) {
  const diverged = result ? approximateDivergence(result.source_summary, result.ir_summary) : false;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between px-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          dry run
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/70">
          {state === "idle" && (
            <button
              type="button"
              onClick={onRun}
              className="rounded border border-border bg-background px-2.5 py-1 text-[11px] text-foreground transition-colors hover:border-muted-foreground/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              run ({formatCost(estimatedCost)})
            </button>
          )}
          {state === "running" && <span>summarizing both…</span>}
          {(state === "done" || state === "error") && (
            <button
              type="button"
              onClick={onDismiss}
              className="text-muted-foreground/60 transition-colors hover:text-foreground"
            >
              dismiss
            </button>
          )}
        </div>
      </div>

      <AnimatePresence>
        {state === "running" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="font-mono text-[12px] text-muted-foreground/70"
          >
            asking the judge what each prompt says…
          </motion.div>
        )}

        {state === "error" && error && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="rounded border border-border bg-card/40 px-3 py-2 font-mono text-[11px] text-muted-foreground"
          >
            <span className="text-destructive">dry run failed.</span> {error}
          </motion.div>
        )}

        {state === "done" && result && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="flex flex-col gap-3"
          >
            {diverged && (
              <div className="rounded border border-destructive/40 bg-destructive/5 px-3 py-1.5 font-mono text-[11px] text-destructive">
                summaries diverge — read both before trusting the IR
              </div>
            )}
            <div className="grid grid-cols-2 gap-3 text-[12px]">
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  source says
                </span>
                <p className="font-mono leading-relaxed text-foreground/90">
                  {result.source_summary}
                </p>
              </div>
              <div className="flex flex-col gap-1.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
                  ir says
                </span>
                <p className="font-mono leading-relaxed text-foreground/90">{result.ir_summary}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

import { DiffView } from "@/components/diff/DiffView";
import { DryRunPanel, type DryRunState } from "@/components/dry-run/DryRunPanel";
import { CacheReadyBadge } from "@/components/meters/CacheReadyBadge";
import { TokenMeter } from "@/components/meters/TokenMeter";
import { isCacheReady } from "@/lib/cache-check";
import type { DryRunResponse } from "@/lib/dry-run-client";
import { countTokens } from "@/lib/tokens";
import type { ModelKey } from "@/lib/pricing";
import type { CompileState, DiffEntry } from "@/lib/types";

type IROutputProps = {
  ir: string | null;
  diff: DiffEntry[] | null;
  errorMessage: string | null;
  errorDetails: string | null;
  model: ModelKey;
  compileState: CompileState;
  /** True when the IR was produced by a provider different from the active toggle. */
  isStale: boolean;
  dryRun: {
    state: DryRunState;
    result: DryRunResponse | null;
    error: string | null;
    estimatedCost: number;
    onRun: () => void;
    onDismiss: () => void;
  };
};

const EMPTY_PREVIEW_TAGS = ["context", "constraints", "rules", "task"] as const;

export function IROutput({
  ir,
  diff,
  errorMessage,
  errorDetails,
  model,
  compileState,
  isStale,
  dryRun,
}: IROutputProps) {
  const isEmpty = ir === null || ir.trim().length === 0;
  const tokens = useMemo(() => (isEmpty ? 0 : countTokens(ir!, model)), [ir, model, isEmpty]);
  const cacheCheck = useMemo(() => isCacheReady(ir ?? "", model), [ir, model]);
  const isCompiling = compileState === "compiling";
  const isError = compileState === "error";

  return (
    <motion.section
      className="relative flex flex-col"
      animate={{
        boxShadow: isCompiling
          ? "inset 0 0 120px -30px rgba(150, 200, 255, 0.18)"
          : "inset 0 0 0px 0px rgba(150, 200, 255, 0)",
      }}
      transition={{ duration: 0.4, ease: "easeOut" }}
    >
      <div className="flex h-10 items-center justify-between gap-3 border-b border-border px-6">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          ir
        </span>
        <div className="flex items-center gap-3">
          {isStale && !isEmpty && (
            <span className="font-mono text-[11px] text-foreground/70">recompile to apply</span>
          )}
          {isError ? (
            <span className="font-mono text-[11px] text-destructive">compile failed</span>
          ) : isEmpty ? (
            <span className="font-mono text-[11px] text-muted-foreground/60">awaiting compile</span>
          ) : (
            <>
              <CacheReadyBadge result={cacheCheck} />
              <span className="text-muted-foreground/40">·</span>
              <TokenMeter tokens={tokens} model={model} />
            </>
          )}
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-5 font-mono text-sm leading-relaxed">
        {isError ? (
          <ErrorState message={errorMessage} details={errorDetails} />
        ) : isCompiling ? (
          <CompilingState />
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <FilledState ir={ir!} diff={diff} dryRun={dryRun} />
        )}
      </div>
    </motion.section>
  );
}

function CompilingState() {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span
        aria-hidden
        className="inline-block size-1.5 animate-pulse rounded-full bg-foreground/70"
      />
      <span>compiling…</span>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1 text-muted-foreground/30 select-none">
        {EMPTY_PREVIEW_TAGS.map((tag) => (
          <div key={tag}>
            <span>&lt;{tag}&gt;</span>
            <span className="ml-2 text-muted-foreground/20">…</span>
            <div>&lt;/{tag}&gt;</div>
          </div>
        ))}
      </div>
      <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground/60">
        <span>compile to populate</span>
        <kbd className="rounded border border-border bg-card/40 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">
          ⌘↵
        </kbd>
      </div>
    </div>
  );
}

function ErrorState({ message, details }: { message: string | null; details: string | null }) {
  return (
    <div className="flex flex-col gap-2 text-sm">
      <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-destructive">
        error
      </span>
      <span className="text-muted-foreground">{message ?? "Unknown error."}</span>
      {details && (
        <pre className="whitespace-pre-wrap break-words rounded border border-border bg-card/40 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground/80">
          {details}
        </pre>
      )}
      <span className="text-[11px] text-muted-foreground/60">
        Press ⌘↵ to retry, or adjust the source and recompile.
      </span>
    </div>
  );
}

function FilledState({
  ir,
  diff,
  dryRun,
}: {
  ir: string;
  diff: DiffEntry[] | null;
  dryRun: IROutputProps["dryRun"];
}) {
  return (
    <div className="flex flex-col gap-6">
      <pre className="whitespace-pre-wrap text-foreground">{ir}</pre>
      {diff && diff.length > 0 && <DiffView diff={diff} />}
      <DryRunPanel
        state={dryRun.state}
        result={dryRun.result}
        error={dryRun.error}
        estimatedCost={dryRun.estimatedCost}
        onRun={dryRun.onRun}
        onDismiss={dryRun.onDismiss}
      />
    </div>
  );
}

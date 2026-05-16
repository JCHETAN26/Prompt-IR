"use client";

import { WhyTooltip } from "./WhyTooltip";
import type { DiffEntry } from "@/lib/types";

type DiffViewProps = {
  diff: DiffEntry[];
};

export function DiffView({ diff }: DiffViewProps) {
  if (diff.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between px-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          diff
        </span>
        <span className="font-mono text-[10px] text-muted-foreground/60">hover or tab for why</span>
      </div>
      <ul className="flex flex-col gap-0.5">
        {diff.map((entry, i) => (
          <li key={i}>
            <WhyTooltip entry={entry}>
              <span className="flex flex-col gap-0.5 font-mono text-[12px]">
                <span className="text-muted-foreground/80">
                  <span className="text-muted-foreground/60">[{entry.category}]</span>{" "}
                  <span className="line-through decoration-destructive/60">{entry.original}</span>
                  {entry.replacement && (
                    <>
                      <span className="px-1.5 text-muted-foreground/40">→</span>
                      <span className="text-success">{entry.replacement}</span>
                    </>
                  )}
                </span>
              </span>
            </WhyTooltip>
          </li>
        ))}
      </ul>
    </div>
  );
}

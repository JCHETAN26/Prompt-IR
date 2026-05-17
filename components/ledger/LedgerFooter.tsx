"use client";

import { clearLedger } from "@/lib/ledger";
import { useLedger } from "@/lib/use-ledger";

function formatTokens(n: number): string {
  if (n === 0) return "0";
  const sign = n < 0 ? "−" : "";
  return sign + Math.abs(n).toLocaleString();
}

function formatDollars(n: number): string {
  // Sub-cent precision: four decimals are honest for LLM-cost scales. We
  // show "<$0.0001" when |n| is non-zero but rounds to zero at 4 decimals —
  // saying "$0.0000 saved" would imply the meter is broken, not honest.
  if (n === 0) return "$0.0000";
  const abs = Math.abs(n);
  if (abs > 0 && abs < 0.0001) return n < 0 ? "−<$0.0001" : "<$0.0001";
  return (n < 0 ? "−$" : "$") + abs.toFixed(4);
}

export function LedgerFooter() {
  const ledger = useLedger();
  const hasActivity = ledger.compiles_count > 0;

  function handleClear() {
    if (typeof window === "undefined") return;
    const confirmed = window.confirm("Reset the savings ledger? This can't be undone.");
    if (confirmed) clearLedger();
  }

  return (
    <span className="flex items-center gap-2">
      <span className="text-muted-foreground/60">ledger:</span>
      <span className="tabular-nums">{formatTokens(ledger.tokens_saved)} tokens</span>
      <span className="px-1 text-muted-foreground/40">·</span>
      <span className="tabular-nums">{formatDollars(ledger.dollars_saved)} saved</span>
      <span className="px-1 text-muted-foreground/40">·</span>
      <span className="tabular-nums text-muted-foreground/60">
        {ledger.compiles_count} compile{ledger.compiles_count === 1 ? "" : "s"}
      </span>
      {hasActivity && (
        <>
          <span className="px-1 text-muted-foreground/40">·</span>
          <button
            type="button"
            onClick={handleClear}
            className="text-muted-foreground/60 transition-colors hover:text-foreground focus-visible:outline-none focus-visible:underline"
          >
            clear
          </button>
        </>
      )}
    </span>
  );
}

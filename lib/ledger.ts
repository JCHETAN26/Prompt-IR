const STORAGE_KEY = "prompt-ir.ledger";

/** Custom DOM event so same-tab subscribers re-read; "storage" only fires cross-tab. */
export const LEDGER_CHANGED_EVENT = "prompt-ir.ledger.changed";

export type LedgerEntry = {
  /** Cumulative input tokens saved across all compiles. Can be negative — IR sometimes inflates. */
  tokens_saved: number;
  /** Cumulative dollars saved (raw input savings, no compile-cost subtraction). Can be negative. */
  dollars_saved: number;
  compiles_count: number;
};

const EMPTY: LedgerEntry = { tokens_saved: 0, dollars_saved: 0, compiles_count: 0 };

function isLedgerEntry(value: unknown): value is LedgerEntry {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.tokens_saved === "number" &&
    typeof v.dollars_saved === "number" &&
    typeof v.compiles_count === "number"
  );
}

export function getLedger(): LedgerEntry {
  if (typeof window === "undefined") return EMPTY;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed: unknown = JSON.parse(raw);
    return isLedgerEntry(parsed) ? parsed : EMPTY;
  } catch {
    return EMPTY;
  }
}

export function recordCompile(delta: { saved_tokens: number; saved_dollars: number }): LedgerEntry {
  const current = getLedger();
  const next: LedgerEntry = {
    tokens_saved: current.tokens_saved + delta.saved_tokens,
    dollars_saved: current.dollars_saved + delta.saved_dollars,
    compiles_count: current.compiles_count + 1,
  };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      window.dispatchEvent(new Event(LEDGER_CHANGED_EVENT));
    } catch {
      // localStorage disabled / quota — caller still gets the in-memory result.
    }
  }
  return next;
}

export function clearLedger(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event(LEDGER_CHANGED_EVENT));
  } catch {
    // ignore
  }
}

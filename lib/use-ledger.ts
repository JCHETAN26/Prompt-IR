"use client";

import { useEffect, useState } from "react";

import { LEDGER_CHANGED_EVENT, getLedger, type LedgerEntry } from "./ledger";

const EMPTY: LedgerEntry = { tokens_saved: 0, dollars_saved: 0, compiles_count: 0 };

/**
 * Subscribe to the ledger across both same-tab writes (custom event) and
 * cross-tab writes (browser "storage" event). SSR returns the EMPTY state;
 * post-mount we hydrate from localStorage.
 */
export function useLedger(): LedgerEntry {
  const [ledger, setLedger] = useState<LedgerEntry>(EMPTY);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLedger(getLedger());

    const handler = () => setLedger(getLedger());
    window.addEventListener("storage", handler);
    window.addEventListener(LEDGER_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener(LEDGER_CHANGED_EVENT, handler);
    };
  }, []);

  return ledger;
}

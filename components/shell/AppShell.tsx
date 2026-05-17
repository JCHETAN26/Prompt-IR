"use client";

import { Settings } from "lucide-react";

import { LedgerFooter } from "@/components/ledger/LedgerFooter";
import { MODEL_SHORT_LABELS, MODELS, type ModelKey } from "@/lib/pricing";

type AppShellProps = {
  children: React.ReactNode;
  model: ModelKey;
  onModelChange: (next: ModelKey) => void;
};

export function AppShell({ children, model, onModelChange }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid h-14 grid-cols-3 items-center border-b border-border px-6">
        <div className="font-mono text-sm tracking-tight">
          <span className="text-foreground">prompt</span>
          <span className="text-muted-foreground">-ir</span>
        </div>
        <div
          role="radiogroup"
          aria-label="Compiler target model"
          className="inline-flex h-7 items-center gap-0.5 justify-self-center rounded-md border border-border bg-card/40 p-0.5 font-mono text-[11px] tracking-wide"
        >
          {MODELS.map((m) => {
            const active = model === m;
            return (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onModelChange(m)}
                className={
                  active
                    ? "rounded-[5px] bg-muted px-2.5 py-1 text-foreground transition-colors"
                    : "rounded-[5px] px-2.5 py-1 text-muted-foreground transition-colors hover:text-foreground"
                }
              >
                {MODEL_SHORT_LABELS[m]}
              </button>
            );
          })}
        </div>
        <div className="justify-self-end">
          <button
            type="button"
            aria-label="Settings"
            className="-mr-1 rounded-md p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <Settings size={16} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="flex h-10 items-center justify-between border-t border-border px-6 font-mono text-[11px] text-muted-foreground">
        <LedgerFooter />
        <span className="text-muted-foreground/60">v0.1.0-dev</span>
      </footer>
    </div>
  );
}

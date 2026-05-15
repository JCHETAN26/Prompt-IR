import { Settings } from "lucide-react";

type AppShellProps = {
  children: React.ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="grid h-14 grid-cols-3 items-center border-b border-border px-6">
        <div className="font-mono text-sm tracking-tight">
          <span className="text-foreground">prompt</span>
          <span className="text-muted-foreground">-ir</span>
        </div>
        <div className="justify-self-center font-mono text-xs tracking-wide">
          <span className="text-foreground">claude</span>
          <span className="px-2 text-muted-foreground/40">|</span>
          <span className="text-muted-foreground">openai</span>
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

      <footer className="flex h-10 items-center justify-between border-t border-border px-6 font-mono text-xs text-muted-foreground">
        <span>
          <span className="text-muted-foreground/60">ledger:</span>{" "}
          <span className="tabular-nums">0 tokens</span>
          <span className="px-2 text-muted-foreground/40">·</span>
          <span className="tabular-nums">$0.00 saved</span>
        </span>
        <span className="text-muted-foreground/60">v0.1.0-dev</span>
      </footer>
    </div>
  );
}

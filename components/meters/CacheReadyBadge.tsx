import type { CacheReadyResult } from "@/lib/cache-check";

type CacheReadyBadgeProps = {
  result: CacheReadyResult;
};

export function CacheReadyBadge({ result }: CacheReadyBadgeProps) {
  return (
    <div
      className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground"
      title={result.reason}
      aria-label={result.reason}
    >
      {result.ready ? (
        <span className="text-success">cache-ready ✓</span>
      ) : (
        <span className="text-muted-foreground/60">{shortLabel(result.reason)}</span>
      )}
    </div>
  );
}

/** Compact form of the reason string for the badge label itself; full reason stays in the tooltip. */
function shortLabel(reason: string): string {
  if (reason.startsWith("no IR")) return "—";
  if (reason.startsWith("below cache threshold")) return "below cache threshold";
  if (reason.startsWith("missing")) return "missing canonical section";
  if (reason.startsWith("sections present")) return "sections out of order";
  return "not cache-ready";
}

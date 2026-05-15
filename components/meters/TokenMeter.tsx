import { dollarsFor, formatDollars, type ModelKey } from "@/lib/pricing";

type TokenMeterProps = {
  tokens: number;
  model: ModelKey;
};

export function TokenMeter({ tokens, model }: TokenMeterProps) {
  const cost = dollarsFor(tokens, model);
  return (
    <div className="flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
      <span>
        <span className="tabular-nums text-foreground">{tokens.toLocaleString()}</span>
        <span className="ml-1 text-muted-foreground/60">tokens</span>
      </span>
      <span className="text-muted-foreground/40">·</span>
      <span className="tabular-nums text-foreground">{formatDollars(cost)}</span>
    </div>
  );
}

type DensityBadgeProps = {
  score: number;
};

export function DensityBadge({ score }: DensityBadgeProps) {
  const pct = Math.round(score * 100);

  const tone =
    score >= 0.7 ? "text-success" : score >= 0.4 ? "text-foreground" : "text-muted-foreground";

  return (
    <div className="flex items-center gap-1 font-mono text-[11px] text-muted-foreground">
      <span className={`tabular-nums ${tone}`}>{pct}%</span>
      <span className="text-muted-foreground/60">density</span>
    </div>
  );
}

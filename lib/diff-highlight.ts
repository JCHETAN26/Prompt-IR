export type Needle = {
  needle: string;
  className: string;
  /** Tooltip text shown on hover; surfaces the per-span reason. */
  title?: string;
};

export type Span = {
  start: number;
  end: number;
  className: string;
  title?: string;
};

/**
 * Find the first occurrence of each needle in `text` and return non-overlapping
 * spans sorted by start position. Greedy first-match — if two needles overlap,
 * the earlier-positioned one wins and the later is dropped. Empty needles are
 * skipped. Search is case-sensitive (the IR and source we're comparing are
 * verbatim-aligned, so case-fuzzing would only mask real issues).
 */
export function findFirstSpans(text: string, needles: Needle[]): Span[] {
  const found: Span[] = [];
  for (const n of needles) {
    if (!n.needle) continue;
    const idx = text.indexOf(n.needle);
    if (idx < 0) continue;
    found.push({
      start: idx,
      end: idx + n.needle.length,
      className: n.className,
      title: n.title,
    });
  }
  found.sort((a, b) => a.start - b.start);

  // Drop overlaps (keep the earlier span).
  const out: Span[] = [];
  let cursor = -1;
  for (const span of found) {
    if (span.start < cursor) continue;
    out.push(span);
    cursor = span.end;
  }
  return out;
}

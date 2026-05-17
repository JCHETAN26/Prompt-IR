"use client";

import { useMemo, useState } from "react";

import { findFirstSpans, type Needle } from "@/lib/diff-highlight";
import type { DiffEntry } from "@/lib/types";

import { WhyTooltip } from "./WhyTooltip";

type DiffViewProps = {
  diff: DiffEntry[];
  source: string;
  ir: string;
};

type ViewMode = "unified" | "split";

const CANONICAL_TAGS = [
  // XML form
  "<context>",
  "</context>",
  "<constraints>",
  "</constraints>",
  "<rules>",
  "</rules>",
  "<task>",
  "</task>",
  // Markdown form
  "## Context",
  "## Constraints",
  "## Rules",
  "## Task",
];

export function DiffView({ diff, source, ir }: DiffViewProps) {
  const [mode, setMode] = useState<ViewMode>("unified");
  if (diff.length === 0) return null;

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex items-center justify-between px-2">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          diff
        </span>
        <div className="flex items-center gap-3 font-mono text-[10px] text-muted-foreground/60">
          <ViewToggle mode={mode} onChange={setMode} />
          {mode === "unified" && <span>hover or tab for why</span>}
        </div>
      </div>
      {mode === "unified" ? (
        <UnifiedDiff diff={diff} />
      ) : (
        <SplitDiff diff={diff} source={source} ir={ir} />
      )}
    </div>
  );
}

function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (m: ViewMode) => void }) {
  return (
    <div role="radiogroup" aria-label="Diff view mode" className="flex items-center">
      {(["unified", "split"] as const).map((m, i) => (
        <span key={m}>
          {i > 0 && <span className="px-1.5 text-muted-foreground/40">|</span>}
          <button
            type="button"
            role="radio"
            aria-checked={mode === m}
            onClick={() => onChange(m)}
            className={
              mode === m
                ? "text-foreground"
                : "text-muted-foreground transition-colors hover:text-foreground"
            }
          >
            {m}
          </button>
        </span>
      ))}
    </div>
  );
}

function UnifiedDiff({ diff }: { diff: DiffEntry[] }) {
  return (
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
  );
}

function SplitDiff({ diff, source, ir }: { diff: DiffEntry[]; source: string; ir: string }) {
  // Source: highlight what was REMOVED — the `original` text of every diff
  // entry. Strikethrough + destructive tone.
  const sourceSpans = useMemo(() => {
    const needles: Needle[] = diff
      .filter((e) => e.original.length > 0)
      .map((e) => ({
        needle: e.original,
        className: "bg-destructive/10 text-foreground/90 line-through decoration-destructive/70",
        title: e.reason,
      }));
    return findFirstSpans(source, needles);
  }, [diff, source]);

  // IR: highlight what was ADDED — the canonical section tags themselves
  // (structural anchors) PLUS the `replacement` text of each entry that has
  // one. Success tone.
  const irSpans = useMemo(() => {
    const tagNeedles: Needle[] = CANONICAL_TAGS.map((tag) => ({
      needle: tag,
      className: "text-success",
      title: "structural anchor",
    }));
    const replacementNeedles: Needle[] = diff
      .filter((e) => e.replacement && e.replacement.length > 0)
      .map((e) => ({
        needle: e.replacement!,
        className: "bg-success/10 text-foreground/90",
        title: e.reason,
      }));
    return findFirstSpans(ir, [...tagNeedles, ...replacementNeedles]);
  }, [diff, ir]);

  return (
    <div className="grid grid-cols-2 gap-3">
      <Pane title="source" text={source} spans={sourceSpans} />
      <Pane title="ir" text={ir} spans={irSpans} />
    </div>
  );
}

type Span = {
  start: number;
  end: number;
  className: string;
  title?: string;
};

function Pane({ title, text, spans }: { title: string; text: string; spans: Span[] }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground/70">
        {title}
      </span>
      <pre className="whitespace-pre-wrap break-words font-mono text-[12px] leading-relaxed text-foreground/90">
        {renderSegments(text, spans)}
      </pre>
    </div>
  );
}

function renderSegments(text: string, spans: Span[]) {
  if (spans.length === 0) return text;
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  spans.forEach((span, i) => {
    if (span.start < cursor) return;
    if (cursor < span.start) nodes.push(text.slice(cursor, span.start));
    nodes.push(
      <span key={i} className={span.className} title={span.title}>
        {text.slice(span.start, span.end)}
      </span>
    );
    cursor = span.end;
  });
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes;
}

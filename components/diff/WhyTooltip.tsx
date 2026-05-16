"use client";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { DiffEntry } from "@/lib/types";

type WhyTooltipProps = {
  entry: DiffEntry;
  children: React.ReactNode;
};

/**
 * Wrap a diff row in a Why-tooltip. Hover or keyboard-focus the row;
 * after the global 200ms delay (set in app/layout.tsx) a popup explains
 * why the change was made and how many tokens it saved.
 *
 * The trigger renders as a div with role="button" + tabIndex so it can
 * legally contain block content (a button can't, semantically) while
 * still being keyboard-focusable and labeled.
 */
export function WhyTooltip({ entry, children }: WhyTooltipProps) {
  const label = `Why: ${entry.reason}`;
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <div
            role="button"
            tabIndex={0}
            aria-label={label}
            className="cursor-help rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent/40 focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        }
      >
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-xs whitespace-normal px-3 py-2 text-left font-mono text-xs leading-relaxed">
        <span>{entry.reason}</span>
        {entry.tokens_saved > 0 && (
          <span className="mt-1.5 block text-[10px] uppercase tracking-wide opacity-60">
            −{entry.tokens_saved} tokens saved
          </span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

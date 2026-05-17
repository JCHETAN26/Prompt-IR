import { countTokens } from "./tokens";
import type { ModelKey } from "./pricing";

/**
 * The minimum number of input tokens at which prefix caching becomes
 * possible across Anthropic (Claude 3.5+, ephemeral cache), OpenAI
 * (automatic prefix cache), and Gemini (implicit prefix cache). All three
 * land at roughly the same 1024-token floor; below it, the prefix is too
 * short to be worth caching.
 */
export const CACHE_THRESHOLD = 1024;

/** Canonical IR section order, matching the Meta-Prompt's logical sequence. */
const CANONICAL_SECTIONS = ["context", "constraints", "rules", "task"] as const;

export type CacheReadyResult = {
  ready: boolean;
  /** Human-readable reason; surfaced as the badge label or in a tooltip. */
  reason: string;
  /** Current token count of the IR, for the deterministic readout. */
  tokens: number;
};

/**
 * Deterministic check, not a guess. Returns ready: true only when the IR
 *
 *   (a) contains the four canonical sections in canonical order
 *       (XML `<context>`/`<constraints>`/`<rules>`/`<task>` OR Markdown
 *       `## Context`/`## Constraints`/`## Rules`/`## Task`),
 *   (b) has at least CACHE_THRESHOLD tokens at the active model's encoding.
 *
 * Both conditions matter. A 5,000-token IR that's missing `<constraints>`
 * is not cache-ready; a 200-token IR in canonical order is not either —
 * it's below the prefix-cache floor of every provider we target.
 */
export function isCacheReady(ir: string, model: ModelKey): CacheReadyResult {
  const trimmed = ir?.trim() ?? "";
  if (trimmed.length === 0) {
    return { ready: false, reason: "no IR yet", tokens: 0 };
  }

  const tokens = countTokens(trimmed, model);
  const lower = trimmed.toLowerCase();

  // Find each section in either XML or Markdown form. -1 means not found.
  const positions = CANONICAL_SECTIONS.map((section) => {
    const xmlPos = lower.indexOf(`<${section}>`);
    if (xmlPos >= 0) return xmlPos;
    const mdPos = lower.indexOf(`## ${section}`);
    return mdPos;
  });

  const missing = CANONICAL_SECTIONS.filter((_, i) => positions[i] < 0);
  if (missing.length > 0) {
    return {
      ready: false,
      reason: `missing section${missing.length > 1 ? "s" : ""}: ${missing.join(", ")}`,
      tokens,
    };
  }

  for (let i = 1; i < positions.length; i++) {
    if (positions[i] <= positions[i - 1]) {
      return {
        ready: false,
        reason: "sections present but out of canonical order",
        tokens,
      };
    }
  }

  if (tokens < CACHE_THRESHOLD) {
    return {
      ready: false,
      reason: `below cache threshold (${tokens} / ${CACHE_THRESHOLD} tok)`,
      tokens,
    };
  }

  return {
    ready: true,
    reason: `≥ ${CACHE_THRESHOLD} tok, canonical order intact — wrap with cache_control: ephemeral for ~90% off`,
    tokens,
  };
}

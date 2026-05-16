import { z } from "zod";

const irSchema = z.object({
  context: z.string(),
  constraints: z.string(),
  rules: z.string(),
  task: z.string(),
});

const diffCategorySchema = z.enum(["filler", "politeness", "vague", "restructure", "tag"]);

const diffEntrySchema = z.object({
  original: z.string(),
  replacement: z.string().nullable(),
  reason: z.string(),
  tokens_saved: z.number(),
  category: diffCategorySchema,
});

const metricsSchema = z.object({
  compression_pct: z.number(),
  density_score: z.number(),
  confidence_score: z.object({
    specificity: z.number(),
    constraint_clarity: z.number(),
    formatting: z.number(),
  }),
});

const rationaleSchema = z.object({
  context: z.string(),
  constraints: z.string(),
  rules: z.string(),
  task: z.string(),
});

// Mirrors CompileResponse minus meta_prompt_version — the LLM is deliberately
// kept ignorant of its own version, which is injected server-side after
// successful parse. Default Zod object mode strips unknown keys: LLMs are
// noisy and a stray field shouldn't fail an otherwise correct response.
export const compilerOutputSchema = z.object({
  ir: irSchema,
  diff: z.array(diffEntrySchema),
  metrics: metricsSchema,
  rationale: rationaleSchema,
});

export type CompilerOutput = z.infer<typeof compilerOutputSchema>;

export type ParseResult = { ok: true; data: CompilerOutput } | { ok: false; error: string };

function formatIssue(issue: z.core.$ZodIssue): string {
  const path = issue.path.length > 0 ? issue.path.join(".") : "(root)";
  return `${path}: ${issue.message}`;
}

export function parseIR(raw: string): ParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    const detail = e instanceof Error ? e.message : "unknown JSON parse error";
    return { ok: false, error: `Invalid JSON: ${detail}` };
  }

  const result = compilerOutputSchema.safeParse(parsed);
  if (!result.success) {
    const issues = result.error.issues.map(formatIssue).join("; ");
    return { ok: false, error: `Schema mismatch: ${issues}` };
  }

  return { ok: true, data: result.data };
}

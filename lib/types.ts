export type CompileState = "idle" | "compiling" | "done" | "error";

export type CompileMode = "claude" | "openai" | "gemini";

export type CompileRequest = {
  source: string;
  mode: CompileMode;
};

export type DiffCategory = "filler" | "politeness" | "vague" | "restructure" | "tag";

export type DiffEntry = {
  original: string;
  replacement: string | null;
  reason: string;
  tokens_saved: number;
  category: DiffCategory;
};

export type ConfidenceScore = {
  specificity: number;
  constraint_clarity: number;
  formatting: number;
};

export type CompileResponse = {
  ir: {
    context: string;
    constraints: string;
    rules: string;
    task: string;
  };
  diff: DiffEntry[];
  metrics: {
    compression_pct: number;
    density_score: number;
    /** Null when the Haiku judge failed (timeout, missing key, schema mismatch). UI must degrade gracefully. */
    confidence_score: ConfidenceScore | null;
  };
  rationale: {
    context: string;
    constraints: string;
    rules: string;
    task: string;
  };
  /** Version of the Meta-Prompt that produced this response. Surfaced for debuggability. */
  meta_prompt_version: string;
};

export type CompileError = {
  error: string;
  details?: string;
};

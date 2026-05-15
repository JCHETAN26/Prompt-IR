export type CompileState = "idle" | "compiling" | "done" | "error";

export type CompileMode = "claude" | "openai";

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
    confidence_score: ConfidenceScore;
  };
  rationale: {
    context: string;
    constraints: string;
    rules: string;
    task: string;
  };
};

export type CompileError = {
  error: string;
  details?: string;
};

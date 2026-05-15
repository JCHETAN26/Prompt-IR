import nlp from "compromise";

export type DensityResult = {
  verbs: number;
  constraints: number;
  filler: number;
  score: number;
};

// Constraint markers: words and phrases that signal hard rules to an LLM.
// "Never return null." carries far more directive weight than "Return null
// sometimes." Treat each hit as worth two regular verbs in the signal sum.
const CONSTRAINT_PHRASES = [
  "never",
  "always",
  "must",
  "only",
  "exactly",
  "cannot",
  "can't",
  "do not",
  "don't",
  "no more than",
  "at most",
  "at least",
];

// Filler: politeness markers, hedges, meta-phrases, and vague nouns that
// don't carry instruction. Each hit pulls the score down — it represents
// tokens the model has to read but cannot act on.
const FILLER_PHRASES = [
  "please",
  "thanks",
  "thank you",
  "sorry",
  "hey",
  "hi",
  "just",
  "maybe",
  "kind of",
  "sort of",
  "basically",
  "actually",
  "really",
  "i was wondering",
  "could you",
  "would you mind",
  "if you could",
  "so much",
  "stuff",
  "somehow",
  "i think",
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function countPhraseMatches(text: string, phrases: string[]): number {
  const lower = text.toLowerCase();
  let total = 0;
  for (const phrase of phrases) {
    const re = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, "g");
    const matches = lower.match(re);
    if (matches) total += matches.length;
  }
  return total;
}

export function densityScore(text: string): DensityResult {
  if (!text || !text.trim()) {
    return { verbs: 0, constraints: 0, filler: 0, score: 0 };
  }

  const doc = nlp(text);
  const verbs = doc.verbs().length;
  const nouns = doc.nouns().length;
  const constraints = countPhraseMatches(text, CONSTRAINT_PHRASES);
  const filler = countPhraseMatches(text, FILLER_PHRASES);

  // Signal: directive verbs and explicit constraints. Nouns count lightly —
  // a prompt full of noun phrases without action is descriptive, not
  // directive.
  const signal = verbs + constraints * 2 + nouns * 0.3;

  // Noise: each filler hit subtracts twice its weight from the ratio.
  const noise = filler * 2;

  // +1 in the denominator prevents division by zero on signal-free input
  // and softly damps tiny prompts (where 1 verb / 0 noise would otherwise
  // be 1.0 — misleading for "do it.").
  const score = Math.max(0, Math.min(1, signal / (signal + noise + 1)));

  return { verbs, constraints, filler, score };
}

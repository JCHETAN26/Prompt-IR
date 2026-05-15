# Prompt-IR

> The Compiler for LLM Intent.
> We don't make your prompt better. We make it machine-readable.

Prompt-IR is a high-performance web utility that compiles natural-language "vibes" into machine-readable, XML-tagged instructions for LLMs. The compile pass is deterministic in structure, quantified in diff, and validated by a judge model. Token density and API cost savings come along for the ride.

---

## Table of Contents

- [Positioning](#positioning)
- [Why not just ask Claude to do this?](#why-not-just-ask-claude-to-do-this)
- [Competitive Landscape](#competitive-landscape)
- [Core Features](#core-features)
- [Trust Stack](#trust-stack)
- [Tech Stack](#tech-stack)
- [Architectural Decisions](#architectural-decisions)
- [Engineering Practices](#engineering-practices)
- [Roadmap](#roadmap)
- [Honest Caveats](#honest-caveats)
- [Open Decisions](#open-decisions)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)

---

## Positioning

| Axis | Most prompt tools | Prompt-IR |
| --- | --- | --- |
| Frame | "Editor" / "Improver" | **Compiler** |
| Goal | Better prose | **Machine-readable structure** |
| Hero metric | Subjective quality | **Structural determinism + measurable density** |
| Audience | Writers, marketers | **Devs shipping LLM features who want repeatable, machine-readable inputs** |
| Aesthetic | Generic SaaS | **Vercel / Linear-grade dev tool** |

**Tagline:** *We don't make your prompt better. We make it machine-readable.*

**Unfair advantage:** A "compiler" framing rooted in information theory (entropy, density, compression ratio) turns subjective prompt-writing into an objective engineering artifact.

**Market timing:** PromptPerfect is sunsetting. Prompt-IR positions as the modern, developer-centric alternative for 2026.

---

## Why not just ask Claude to do this?

You can. Open Claude and type *"rewrite my prompt with `<context>`, `<constraints>`, `<rules>`, `<task>` XML tags and strip the filler."* It works.

Prompt-IR exists for what happens after that:

- **Repeatable structure.** Same input shape, same IR shape, every time — not a different vibe-rewrite each session.
- **Quantified diff.** You see exactly what was removed and why, not a black-box rewrite.
- **Dry Run validation.** A judge model confirms the IR preserved your intent. Ad-hoc rewrites skip this.
- **Cache-aware structure.** Anthropic and OpenAI cache *prefixes*. A canonical, predictable IR skeleton (always `<context>` → `<constraints>` → `<rules>` → `<task>`) lets you place a stable system-prompt wrapper in front of every API call and reliably hit the cached prefix path. The IR varies; the wrapper around it doesn't — and that's where the ~90% discount lives.
- **Persistent ledger.** Your prompts, savings, and confidence scores compound across sessions.
- **No tab-switching.** One keystroke. The real win is removing the context switch, not the per-prompt cents.

If you compile prompts once a month, use Claude directly. If you compile them ten times a day, you want a tool.

---

## Competitive Landscape

| Tool | What it does | Where Prompt-IR is different |
| --- | --- | --- |
| PromptPerfect *(sunsetting)* | General prompt rewriting | Modern, dev-first alternative; free tier; structured IR output instead of prose. |
| PromptLayer / LangSmith / Helicone | Logging, observability, and eval infra for production LLM apps | They watch prompts run. Prompt-IR shapes prompts **before** they run. Complementary, not overlapping. |
| Latitude.so | Team prompt management + evals | Workflow tool for orgs. Prompt-IR is a single-developer utility — no login required for v1. |
| DIY in ChatGPT / Claude | Free, zero-config | One-shot, no structure guarantees, no diff, no ledger, no validation. Fine for occasional use; friction at volume. |

Prompt-IR is intentionally narrow: **one prompt in, one structured IR out, with proof.**

---

## Core Features

### The Refinery (Source Panel)
Distraction-free, dark-mode-first input where developers dump messy logic, project context, and requirements.

### Live Token-to-Dollar Meter
Real-time client-side calculation showing the cost of the source prompt vs. the projected cost of the compiled IR, priced for GPT-4o and Claude 3.5 Sonnet. Treat this as a signal, not the headline value — the real win is structure, but seeing a 62% compression bar feels good.

### Architectural XML Tagging
Output is restructured into industry-standard attention anchors:

- `<context>` — background
- `<constraints>` — guardrails
- `<rules>` — always/never logic
- `<task>` — required output

### Model-Specific Optimization
Toggle between optimization profiles:

- **Claude mode** — XML-heavy, attention-anchor-driven
- **OpenAI mode** — system/user message clarity, less XML

### One-Click Developer Export
- Download as `.md` or `.txt`
- "Copy for Cursor" with appropriate framing
- Keyboard shortcuts throughout

### Logic Density Visualization
Side-by-side diff showing exactly which filler words were removed and why each change was made.

---

## Trust Stack

What makes the compiler believable, not just pretty.

### Quantifiable Metrics
- **Token Compression %** — primary money-saving metric ("Compressed 1,200 → 450 tokens, 62% saved")
- **Instruction Density** — ratio of action verbs and technical constraints vs. filler words
- **Confidence Score** — secondary judge model (Claude Haiku) rates source vs. IR on Specificity, Constraint Clarity, and Formatting
- **Cache-Ready Badge** — deterministic check, not a guess. Shown when the IR (a) exceeds the cache threshold (≥1024 tokens for Sonnet, ≥1024 for GPT-4o) and (b) has a valid canonical tag order. Label reads `Cache-Ready ✓ — wrap with cache_control: ephemeral for ~90% off on repeat calls within the 5-min TTL`. Below threshold, the badge reads `Below cache threshold` instead — no fake percentages.

### Live Eval ("Dry Run")
Opt-in feature that sends both source and IR to a judge LLM, asks it to summarize the requirements of each, and shows them side-by-side. If the IR summary matches user intent, the compilation is validated.

### Architectural Transparency
- **"Why" tooltips** on every refinement — hover over a removed segment to see: *"Removed 45 tokens of politeness ('I was wondering if…') and replaced with XML tagging to prevent context rot."*
- **Visual diff** — filler highlighted in red, structural anchors in green
- Plain-language explanation of why XML tags act as attention anchors for transformers

### Developer Ledger
- **Savings Dashboard** — cumulative tokens and dollars saved across sessions
- **Style Evolution** — week-over-week filler reduction trend (post-MVP)

### Benchmarking (post-MVP)
- HumanEval / ProjDevBench scores comparing raw vs. compiled prompts
- Community "Worked on first try" voting

---

## Tech Stack

| Layer | Technology | Reason |
| --- | --- | --- |
| Framework | Next.js 15 (App Router) | Fast, SEO-friendly, industry-standard |
| Styling | Tailwind CSS + shadcn/ui | Vercel/Linear-grade aesthetic with low overhead |
| Animations | Framer Motion | Smooth compile transitions, glowing states |
| API Layer | Next.js API Routes | Co-located backend, no extra service |
| Compiler model | Anthropic Claude 3.5 Sonnet | Best-in-class XML adherence and technical reasoning. Meta-Prompt marked `cache_control: ephemeral` via the Anthropic SDK so the static compiler instructions hit the cached prefix path on every compile — per-compile cost stays near floor. |
| Judge model | Claude Haiku or GPT-4o-mini | Cheap, fast scoring and dry-run validation |
| Token counting | `js-tiktoken` | Instant client-side counting, zero latency |
| NLP / density | `compromise` | Client-side POS tagging for filler/verb detection |
| Persistence (v1) | `localStorage` | Zero-friction savings ledger, no login required |
| Persistence (v2) | Supabase (Postgres) | History sync, auth, analytics |
| Hosting | Vercel | Free tier, native Next.js, edge functions |

---

## Architectural Decisions

### 1. Compiler API contract

The `/api/compile` route returns structured JSON, not text. This unlocks "Why" tooltips, the diff viz, and density scoring without a second API call.

```ts
type CompileResponse = {
  ir: {
    context: string;
    constraints: string;
    rules: string;
    task: string;
  };
  diff: Array<{
    original: string;
    replacement: string | null; // null = pure removal
    reason: string;
    tokens_saved: number;
    category: "filler" | "politeness" | "vague" | "restructure" | "tag";
  }>;
  metrics: {
    compression_pct: number;
    density_score: number;
    confidence_score: {
      specificity: number;
      constraint_clarity: number;
      formatting: number;
    };
  };
  rationale: {
    context: string;
    constraints: string;
    rules: string;
    task: string;
  };
};
```

### 2. Two-tier model strategy

| Tier | Model | Use |
| --- | --- | --- |
| Compiler | Claude 3.5 Sonnet | Main compile pass |
| Judge | Claude Haiku / GPT-4o-mini | Confidence score, dry run |

Live Eval is **opt-in** to keep API spend predictable.

### 3. Client-side first

Anything that can compute locally, does. Zero latency, zero cost.

- Token count → `js-tiktoken`
- Filler/verb density → `compromise`
- Compression %, dollar math → pure JS
- Confidence Score + Dry Run → server-side, on demand only

### 4. Pricing as data

`lib/pricing.ts` holds per-1M-token rates for each supported model. Easy to update as vendors change pricing.

---

## Engineering Practices

This is a solo MVP, but it is built with team-grade discipline so the codebase scales if it grows and looks credible to anyone evaluating it.

| Practice | What it means |
| --- | --- |
| **Trunk-based development on `main`** | `main` is protected. No direct pushes. Squash-merge only. Linear history. |
| **One PR per build-plan task** | Branch named `feat/<task-id>-<slug>`. Scope tied to a single entry in `build-plan.md`. |
| **CI gates** | GitHub Actions runs `lint`, `typecheck`, `test`, `build` on every PR. All four must be green before merge. |
| **Conventional Commits** | Enforced locally by `commitlint`. Scopes reference build-plan task IDs (e.g., `feat(1.5):`). |
| **Pre-commit hooks** | `husky` + `lint-staged` run Prettier and ESLint on staged files. No "fix lint" PRs. |
| **Preview deploys** | Vercel deploys every PR to a unique URL. Production deploys on merge to `main`. |
| **Dependabot** | Weekly PRs for npm and GitHub Actions updates, grouped minor + patch. |
| **CHANGELOG.md** | Every user-visible change recorded under `[Unreleased]` in the same PR. Releases tagged semver. |
| **PR template** | Forces a Summary, task ID, Acceptance checklist, test steps, and Honest Caveats block on every PR. |

See `build-plan.md` Phase 0 and Task 1.2 for the exact setup. See `system-prompt.md` for the workflow rules the builder operates under.

---

## Roadmap

### Phase 1 — The Compiler Shell (Days 1–4)
*A beautiful, working UI that already feels like a compiler, with all client-side metrics live.*

- Next.js 15 + Tailwind + shadcn/ui scaffold
- Dark-mode-first design, Inter + JetBrains Mono
- Split-screen: **Source** (left) → **IR Output** (right)
- Live token counter via `js-tiktoken` on both panels
- Live cost meter: dollars per model, side-by-side (GPT-4o vs Claude 3.5 Sonnet)
- Client-side density score using `compromise`
- Framer Motion compile transitions and glow state
- Keyboard shortcuts: `⌘+Enter` compile, `⌘+K` palette, `⌘+C` copy IR

### Phase 2 — The Compiler Engine (Days 5–9)
*Real refinement, real metrics, structured output, "Why" explanations.*

- `/api/compile` Next.js route, Anthropic SDK, Claude 3.5 Sonnet
- **The Meta-Prompt** — the secret sauce that instructs Claude to emit the structured JSON contract
- "Why" tooltips fed by `diff[].reason`
- Compression % badge in the output header
- Confidence Score via Haiku second pass
- Model-mode toggle (Claude / OpenAI)
- Error handling, rate limiting, request validation

### Phase 3 — Proof, Export, Trust (Days 10–14)
*Turn the compiler into something developers trust and share.*

- **Dry Run** button — judge LLM summarizes both source and IR, shows side-by-side
- Before/After diff viz with red/green highlighting
- Export: `.md`, `.txt`, "Copy for Cursor"
- **Savings Ledger** in localStorage — cumulative tokens and dollars saved
- SEO landing sections: "PromptPerfect alternative 2026," "Cursor prompt optimization," "XML tagging for Claude"

### Phase 4 — Post-MVP
- Supabase auth + cross-device history sync
- Personal style evolution dashboard
- Public benchmark page with HumanEval / ProjDevBench
- "Worked on first try" community voting
- Golden Prompt template library
- **Lane to explore:** browser extension that compiles prompts in-place inside ChatGPT / Claude / Cursor — removes the copy-paste-to-website friction that limits v1.
- **Lane to explore:** CLI / GitHub Action that lints prompts checked into a repo, so teams can gate prompt changes the way they gate code.

---

## Honest Caveats

What this project is **not** claiming.

- **Compression isn't always better.** Some prompts produce better outputs when verbose. Use Dry Run before trusting the IR on a production prompt.
- **XML tagging is Claude-optimized.** For GPT-4o, switch to OpenAI mode — XML can hurt there.
- **Dollars saved per prompt are small.** A heavy user might save ~$5–10/month on API costs. The compounding metric is *time saved from getting it right the first time*, not the API bill. The dollar meter exists because it's a satisfying signal.
- **The compile call itself costs tokens.** Sonnet (compile) + Haiku (judge, opt-in) means each compile costs roughly $0.01–$0.03. We're betting the structural reliability is worth that, not that the math nets positive on every prompt.
- **The Meta-Prompt is not a defensible moat.** It can be replicated in a weekend. The real moat, if any, is the Trust Stack (diff + judge + ledger) plus the developer-first experience plus future integrations (extension, CLI).

---

## Open Decisions

1. **Anthropic API key** — provisioned via `.env.local`, server-side only. Needed at start of Phase 2.
2. **Auth in MVP** — none. localStorage savings ledger is enough for v1; zero-friction is on-brand.
3. **Deploy target** — Vercel free tier (covers AWS Lambda use case with less setup).

---

## Getting Started

> Setup instructions will be added during Phase 1.

```bash
# coming in Phase 1
pnpm install
pnpm dev
```

### Environment Variables

```bash
# .env.local (Phase 2)
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...        # optional, for GPT-4o-mini judge
```

---

## Project Structure

> Will be populated during Phase 1.

```
prompt-ir/
├── app/                      # Next.js App Router
│   ├── api/
│   │   └── compile/          # Compiler endpoint
│   ├── layout.tsx
│   └── page.tsx              # Split-screen UI
├── components/
│   ├── refinery/             # Source input
│   ├── ir-output/            # Compiled IR panel
│   ├── meters/               # Token + cost meters
│   └── diff/                 # Before/after viz
├── lib/
│   ├── tokens.ts             # js-tiktoken wrapper
│   ├── density.ts            # compromise-based metrics
│   ├── pricing.ts            # Per-model rates
│   └── meta-prompt.ts        # The compiler instruction
└── public/
```

---

## SEO Targets (2026)

Landing-page content sections aimed at organic discovery:

- How to reduce Claude 3.5 Sonnet token costs
- XML tagging template for LLM prompts
- Cursor IDE prompt optimization
- Best PromptPerfect alternative 2026

---

## License

TBD.

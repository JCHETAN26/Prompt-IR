# Prompt-IR — Build Plan

A concrete, sequenced plan for the builder LLM. Read alongside `README.md` (product spec) and `system-prompt.md` (operating principles). The README is the _what_; this is the _how_; the system prompt is the _how to think_.

---

## How to use this document

1. Work tasks in order. Do not skip ahead or merge phases.
2. After each phase, stop and request human review before continuing.
3. Every task has an Acceptance section — code is not "done" until each line passes.
4. If a task is blocked by an unanswered decision, stop and ask. Do not invent product behavior.
5. Out-of-scope items at the bottom are intentionally excluded from the MVP. Resist scope creep.

---

## Source of Truth

| File                 | Role                                                         |
| -------------------- | ------------------------------------------------------------ |
| `README.md`          | Product spec, positioning, non-negotiables, Honest Caveats   |
| `system-prompt.md`   | Builder LLM operating principles                             |
| `build-plan.md`      | This file — sequenced tasks and acceptance criteria          |
| `lib/meta-prompt.ts` | The compiler's internal instruction set (written in Phase 2) |

If these conflict, the README wins.

---

## Pre-flight

- Node.js 20+
- pnpm 9+
- A GitHub account with permission to create repos and apps
- The Vercel GitHub App available to install on the repo
- `.env.local` with `ANTHROPIC_API_KEY=sk-ant-...` (required at Phase 2)
- Optional: `OPENAI_API_KEY=sk-...` for the GPT-4o-mini judge

Verify before Phase 0: `node --version`, `pnpm --version`, `git --version`, `gh --version`.

---

## Phase 0 — Repository & Workflow (Day 0)

Goal: a credible engineering foundation before any product code. Branch protection, PR workflow, dependency hygiene, change log — set up once, benefit every PR.

### Task 0.1 — GitHub repository and first commit

Deliverable: a remote repo with the seed documents committed to `main`.

Steps:

- Create the repo: `gh repo create prompt-ir --private --source=. --remote=origin`
- Stage the seed files: `README.md`, `build-plan.md`, `system-prompt.md`, `CHANGELOG.md`, `.github/pull_request_template.md`, `.github/dependabot.yml`
- Add a `.gitignore` covering `node_modules/`, `.next/`, `.env*` (except `.env.example`), `.vercel/`, `*.log`, `.DS_Store`
- First commit: `chore: project foundation` and push to `main`

Acceptance:

- The remote `main` branch shows all seed files
- `git status` is clean
- `.env*` files are gitignored

### Task 0.2 — Branch protection (manual, GitHub UI)

Deliverable: `main` is protected. No direct pushes. CI must pass before merge.

Steps (Settings → Branches → Add rule for `main`):

- Require a pull request before merging (1 approval; for solo work, enable "Allow specified actors to bypass" only for yourself if needed — but prefer the discipline of approving your own PR)
- Require status checks to pass: `ci / lint`, `ci / typecheck`, `ci / test`, `ci / build`
- Require branches to be up to date before merging
- Require linear history (forces squash or rebase merges)
- Block force pushes
- Block deletions

Acceptance:

- `git push origin main` from a non-PR branch is rejected
- An open PR with red CI cannot be merged through the UI

### Task 0.3 — Verify PR template, Dependabot, CHANGELOG

Deliverable: the seed `.github/` files actually do what they're meant to.

Steps:

- Open a throwaway PR (`docs/test-template` branch, add a single character to CHANGELOG)
- Confirm the PR description auto-fills from `pull_request_template.md`
- Confirm Dependabot appears under Insights → Dependency graph → Dependabot
- Close the throwaway PR without merging

Acceptance:

- Template auto-fills on PR creation
- Dependabot is enabled and scheduled weekly

### Phase 0 Definition of Done

- Repo exists, `main` is protected, PR workflow is exercised at least once.
- **Stop here. Request human review before Phase 1.**

---

## Phase 1 — The Compiler Shell (Days 1–4)

Goal: a beautiful, working UI that already feels like a compiler. All client-side metrics live. No API calls yet.

### Task 1.1 — Scaffold

Deliverable: a Next.js 15 App Router project with Tailwind, shadcn/ui, and TypeScript strict mode.

Commands:

- `pnpm create next-app@latest prompt-ir --typescript --tailwind --app --src-dir=false --import-alias="@/*"`
- `pnpm dlx shadcn@latest init` — pick default style, Inter font, JetBrains Mono for code blocks
- Install: `pnpm add framer-motion js-tiktoken compromise lucide-react`
- Install dev: `pnpm add -D @types/node`

Acceptance:

- `pnpm dev` boots without warnings
- `tsc --noEmit` passes
- `app/page.tsx` exists and renders a placeholder

### Task 1.2 — CI/CD wiring

Deliverable: green-required CI, pre-commit hooks, conventional-commits enforcement, Vercel preview deploys per PR.

Install dev deps:

```bash
pnpm add -D husky lint-staged @commitlint/cli @commitlint/config-conventional prettier vitest @vitest/ui
pnpm dlx husky init
```

Add scripts to `package.json`:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest",
    "format": "prettier --write .",
    "prepare": "husky"
  }
}
```

Create `.github/workflows/ci.yml`:

```yaml
name: ci
on:
  pull_request:
  push:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint

  typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm test --run

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
```

Create `commitlint.config.js`:

```js
module.exports = { extends: ["@commitlint/config-conventional"] };
```

Create `.lintstagedrc.json`:

```json
{
  "*.{ts,tsx}": ["prettier --write", "eslint --fix"],
  "*.{json,md,yml,yaml,css}": ["prettier --write"]
}
```

Create `.husky/pre-commit`:

```bash
pnpm lint-staged
```

Create `.husky/commit-msg`:

```bash
pnpm exec commitlint --edit "$1"
```

Create `.prettierrc.json`:

```json
{
  "semi": true,
  "singleQuote": false,
  "trailingComma": "es5",
  "printWidth": 100,
  "tabWidth": 2
}
```

Vercel link (request approval before running these):

- Install the Vercel GitHub App on the `prompt-ir` repo
- Set production branch = `main`
- Add env vars in Vercel: `ANTHROPIC_API_KEY` (placeholder for now, real key at Phase 2), `OPENAI_API_KEY` (optional)
- Confirm preview deploys appear as a check on PRs

Open one PR (`chore/ci-wiring`) that introduces all of the above. Use the workflow described in `system-prompt.md`.

Acceptance:

- All four CI jobs (`lint`, `typecheck`, `test`, `build`) run on every PR
- A commit with a non-conventional message is rejected locally by commitlint
- A staged `.tsx` file is auto-formatted on commit
- A PR shows a Vercel preview-deployment check
- Branch protection blocks merge until all checks are green

### Task 1.3 — Global shell and typography

Deliverable: dark-mode-first global layout. Inter for UI, JetBrains Mono for prompt text. Three-panel grid scaffold.

Files:

- `app/layout.tsx` — fonts, dark theme by default, `html lang="en" class="dark"`
- `app/globals.css` — Tailwind base, CSS vars for `--background`, `--foreground`, `--accent`, `--border`, `--success`, `--danger`
- `components/shell/AppShell.tsx` — header (logo, model toggle placeholder, settings), main split area, footer (savings ledger placeholder)

Acceptance:

- Dark mode is the default and only mode for v1
- Inter and JetBrains Mono load and apply to the correct surfaces
- Header, main, footer are visible with placeholder content

### Task 1.4 — Split-screen layout

Deliverable: Source panel (left, ~50%) and IR panel (right, ~50%) with a draggable divider OR fixed 50/50 split for v1 (fixed is fine — pick one and commit).

Files:

- `app/page.tsx` — composes `Refinery` and `IROutput`
- `components/refinery/Refinery.tsx` — `<textarea>` with monospace, autosize, placeholder copy
- `components/ir-output/IROutput.tsx` — read-only display, monospace, empty state ("Compile to see the IR")

Acceptance:

- Typing in Source does not affect IR
- Both panels scroll independently
- Empty Source shows a hint; empty IR shows the empty state

### Task 1.5 — Token + cost meter (client-side)

Deliverable: live token counter and dollar meter, both panels, both models (GPT-4o + Claude 3.5 Sonnet).

Files:

- `lib/tokens.ts` — wraps `js-tiktoken` with a memoized `countTokens(text, model)` function
- `lib/pricing.ts` — per-1M-token rates as a plain object (input + output, cached vs uncached)
- `components/meters/TokenMeter.tsx` — token count + dollar cost for one panel, one model
- Wired into `Refinery` and `IROutput`

Acceptance:

- Typing in Source updates the count within one frame (no debounce visible to the human eye)
- Costs round to four decimals
- Switching the model toggle (placeholder for now) changes the displayed price

### Task 1.6 — Density score (client-side)

Deliverable: client-side instruction-density metric using `compromise`. Shown as a small badge on the Source panel.

Files:

- `lib/density.ts` — exposes `densityScore(text)` returning `{ verbs: number, constraints: number, filler: number, score: 0..1 }`
- Define "filler" as: politeness markers, hedges ("just", "kind of", "I was wondering"), and meta-phrases ("please could you"). Maintain the list in `lib/density.ts`.
- `components/meters/DensityBadge.tsx`

Acceptance:

- A prompt full of filler returns a low score (<0.4)
- A prompt with many imperatives and constraints returns a high score (>0.7)
- Unit-test the boundaries in `lib/__tests__/density.test.ts` (vitest is wired in Task 1.2)

### Task 1.7 — Compile transition (placeholder, no API)

Deliverable: pressing `⌘+Enter` or clicking the Compile button triggers a fake 800ms transition with a glow state on the IR panel, then renders a stub IR (just the source wrapped in `<context>` tags).

Files:

- `components/compile/CompileButton.tsx`
- `components/ir-output/IROutput.tsx` — accepts a `compileState: "idle" | "compiling" | "done"` prop, uses Framer Motion for the transition

Acceptance:

- Button visibly responds to the keystroke
- Glow state animates in and out
- Stub IR appears in the IR panel

### Task 1.8 — Keyboard shortcuts and command palette stub

Deliverable: `⌘+Enter` compile, `⌘+C` copy IR (when IR exists), `⌘+K` opens a placeholder command palette.

Files:

- `lib/hotkeys.ts` — simple `useHotkeys` hook
- `components/palette/CommandPalette.tsx` — modal with one entry ("Compile") for now

Acceptance:

- Shortcuts work without focus stealing from the textarea
- Palette opens and closes with `⌘+K` and `Esc`

### Task 1.9 — Aesthetic polish

Deliverable: Vercel/Linear-grade visual quality. Compare against the actual Linear and Vercel dashboards before signing off.

Checklist:

- Borders and dividers at 1px with low-contrast color
- Hover states on every interactive element
- Focus rings present but not gaudy
- Type scale consistent
- No layout shift on resize

Acceptance:

- Take a screenshot. If it would look out of place next to a Linear screenshot, redo it.

### Phase 1 Definition of Done

- App boots and runs at 60fps on a MacBook Air M1
- All client-side metrics (tokens, cost, density) are live
- Stub IR appears on compile, no real API call yet
- Lighthouse performance score ≥95 on the homepage
- **Stop here. Request human review before Phase 2.**

---

## Phase 2 — The Compiler Engine (Days 5–9)

Goal: a real `/api/compile` route returning the structured JSON contract from the README. Meta-Prompt cached. Why-tooltips and confidence score live.

### Task 2.1 — API route scaffold

Deliverable: `app/api/compile/route.ts` accepting `{ source: string, mode: "claude" | "openai" }` and returning a stub matching the `CompileResponse` type from the README.

Files:

- `app/api/compile/route.ts`
- `lib/types.ts` — `CompileResponse`, exported, single source of truth

Acceptance:

- POST returns the stub within 50ms
- Invalid body returns 400 with a useful error
- Frontend calls the route on `⌘+Enter` and renders the stub diff

### Task 2.2 — The Meta-Prompt

Deliverable: `lib/meta-prompt.ts` exporting `buildMetaPrompt({ mode })` that returns the full instruction string for Claude.

Requirements:

- Must instruct Claude to emit ONLY valid JSON matching `CompileResponse`
- Must enforce tag order: `<context>` → `<constraints>` → `<rules>` → `<task>`
- Must populate every `diff[]` entry with `category` and `reason`
- Must populate `rationale.*` per section
- Must keep `confidence_score` slots zeroed (Haiku fills these in Task 2.5)
- For `mode: "openai"`, swap XML scaffolding for Markdown sections but keep the JSON shape identical

Acceptance:

- The Meta-Prompt is its own file; no inlined string in the route handler
- Versioned (`META_PROMPT_VERSION = "1.0.0"`) and the version is returned in the response for debuggability

### Task 2.3 — Anthropic SDK integration with prompt caching

Deliverable: route calls Claude 3.5 Sonnet, with the Meta-Prompt marked `cache_control: { type: "ephemeral" }`.

Files:

- `lib/anthropic.ts` — wraps the SDK, single `compile(source, mode)` export
- `app/api/compile/route.ts` — wires it in, parses Claude's JSON response, validates against the type, returns

Acceptance:

- First call writes the cache, subsequent calls within 5 minutes show `cache_read_input_tokens > 0` in the response usage block
- Log cache hits to the server console
- Per-compile cost (input+output) printed in dev for sanity-checking

### Task 2.4 — JSON validation and error recovery

Deliverable: when Claude returns malformed JSON, the route retries once with a stricter instruction, then surfaces a clean error to the UI.

Files:

- `lib/parse-ir.ts` — Zod schema matching `CompileResponse`, returns `{ ok: true, data } | { ok: false, error }`
- Wire into the route

Acceptance:

- Unit tests cover: valid response, missing field, wrong type, extra field
- UI shows a non-alarming error state when parse fails

### Task 2.5 — Confidence score (Haiku second pass)

Deliverable: after the main compile, call Claude Haiku to score `{ specificity, constraint_clarity, formatting }` for source vs IR. Populate `metrics.confidence_score`.

Files:

- `lib/judge.ts`
- `app/api/compile/route.ts` — runs Haiku in parallel with the main compile to avoid sequential latency

Acceptance:

- Total round-trip stays under 6 seconds on a 1000-token source
- Scores are integers 0–10
- If Haiku fails, the response still returns with `confidence_score: null` and the UI degrades gracefully

### Task 2.6 — Why-tooltips and diff rendering

Deliverable: hovering over a removed segment in the diff shows the `reason` and `tokens_saved` from `diff[].reason`.

Files:

- `components/diff/DiffView.tsx`
- `components/diff/WhyTooltip.tsx`

Acceptance:

- Tooltip appears within 200ms of hover
- Long reasons wrap cleanly
- Keyboard-focusable for accessibility

### Task 2.7 — Model-mode toggle

Deliverable: working Claude/OpenAI toggle that changes the Meta-Prompt mode and switches pricing.

Acceptance:

- Toggle persists in localStorage
- Switching mode after a compile does not silently mutate the displayed IR — it shows a "Recompile to apply" hint

### Phase 2 Definition of Done

- A real prompt produces a real IR with a real diff and a real confidence score
- Cache hits visible in logs after warm-up
- Error states handled cleanly
- **Stop here. Request human review before Phase 3.**

---

## Phase 3 — Proof, Export, Trust (Days 10–14)

Goal: the polish that makes developers trust the tool and share it.

### Task 3.1 — Dry Run (opt-in)

Deliverable: a "Dry Run" button that sends source and IR to a judge LLM, asks for a one-sentence summary of each, and shows them side-by-side.

Files:

- `app/api/dry-run/route.ts`
- `components/dry-run/DryRunPanel.tsx`

Acceptance:

- Opt-in only (button click, never automatic)
- Clear cost disclosure before the call ("≈ $0.002")
- If the two summaries diverge, highlight the difference

### Task 3.2 — Cache-Ready badge

Deliverable: the badge described in `README.md` → Trust Stack. Deterministic check on the IR.

Files:

- `lib/cache-check.ts` — `isCacheReady(ir: string, model): { ready: boolean, reason: string }`
- `components/meters/CacheReadyBadge.tsx`

Acceptance:

- Returns `ready: true` only when token count ≥1024 AND all four tags are present in order
- Below threshold, badge reads `Below cache threshold` — no fake percentages
- Badge updates live as IR changes (e.g., model toggle changes the threshold)

### Task 3.3 — Before/After diff visualization

Deliverable: the full red/green diff view referenced in the README. Filler highlighted in red, structural anchors in green.

Acceptance:

- Diff is readable on a 13" screen without horizontal scroll
- Toggle to switch between "unified" and "split" views

### Task 3.4 — Export

Deliverable: download `.md`, download `.txt`, "Copy for Cursor" button.

Files:

- `lib/export.ts`
- `components/export/ExportMenu.tsx`

Acceptance:

- `.md` output preserves XML tags inside code fences
- "Copy for Cursor" wraps the IR in a Cursor-friendly framing comment

### Task 3.5 — Savings Ledger (localStorage)

Deliverable: cumulative tokens and dollars saved across sessions. Lives in the footer.

Files:

- `lib/ledger.ts` — `recordCompile({ saved_tokens, saved_dollars })`, `getLedger()`
- `components/ledger/LedgerFooter.tsx`

Acceptance:

- Survives page reload
- Clear button with confirmation
- Honest framing: shows raw numbers, no rounding-up

### Task 3.6 — SEO landing sections

Deliverable: long-form landing-page sections targeting the SEO queries from the README. Below the fold of the compiler.

Sections:

- "How to reduce Claude 3.5 Sonnet token costs"
- "XML tagging template for LLM prompts"
- "Cursor IDE prompt optimization"
- "Best PromptPerfect alternative 2026"

Acceptance:

- Each section is 300+ words of genuinely useful content, not keyword stuffing
- Internal links to relevant features in the compiler

### Phase 3 Definition of Done

- All Trust Stack signals (compression %, density, confidence, Cache-Ready, Dry Run) live
- Export works for `.md`, `.txt`, Cursor
- Ledger persists across reloads
- Lighthouse SEO score ≥95
- **Stop here. Tag v0.1.0 and request final review.**

---

## Out of Scope for MVP

Listed so the builder LLM doesn't drift into them.

- Auth / accounts (Phase 4)
- Supabase, any database (Phase 4)
- Cross-device sync (Phase 4)
- Personal style evolution dashboard (Phase 4)
- HumanEval / ProjDevBench public benchmark page (Phase 4)
- Community "Worked on first try" voting (Phase 4)
- Golden Prompt template library (Phase 4)
- Browser extension (Phase 4 lane)
- CLI / GitHub Action (Phase 4 lane)
- Light mode
- Mobile-optimized layout (desktop-first; mobile should not be broken, but should not be polished)
- Streaming responses (return full JSON in one shot for v1)
- A/B testing infra
- Analytics beyond a single privacy-respecting page-view counter

---

## Decision Log

Track every non-obvious choice here as you build. Future you and future readers will thank you.

| Date       | Decision                                                                                       | Reason                                                                                                                                                                                                                                                                                                                                                                                    |
| ---------- | ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-05-15 | Task 2.1 stub returns `metrics.confidence_score` as a zeroed object, not `null`.               | The README's `CompileResponse` type makes the field non-nullable. Task 2.5's acceptance bullet allows `null` on Haiku failure — this conflicts with the type. Per the system prompt's "README wins" rule, the type wins for now. We will resolve by either widening the type at Task 2.5 or returning a deliberate sentinel (`{0,0,0}` ⇒ "judge skipped"). Decision deferred to Task 2.5. |
| 2026-05-15 | Hard limit of 50,000 chars on the `source` field at the API boundary.                          | Prevents accidental DoS via giant pastes during dev, with headroom for ~12k tokens of input — well above realistic prompt sizes. Easy to relax later.                                                                                                                                                                                                                                     |
| 2026-05-15 | `formatIR()` lives in `lib/format-ir.ts` (not in `lib/types.ts` or co-located with the route). | The page renders IR; the route emits structured blocks. Format is a pure-function presentation concern shared by both, so a separate module keeps the route handler focused on transport and validation.                                                                                                                                                                                  |

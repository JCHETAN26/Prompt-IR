# Changelog

All notable changes to Prompt-IR are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0] - 2026-05-17

First MVP release. A web utility that compiles natural-language prompts
into machine-readable IR — `<context>`, `<constraints>`, `<rules>`,
`<task>` blocks — with quantified diffs, judge-model validation, and
honest signals about when the tool helps versus when it doesn't.

### Added

#### Compiler

- `POST /api/compile` route accepting `{ source, mode }` and returning a
  schema-validated `CompileResponse` with `ir`, `diff[]`, `metrics`,
  `rationale`, and `meta_prompt_version`.
- Meta-Prompt v1.1.0 (`lib/meta-prompt.ts`) — the full instruction set
  sent to the compiler model. Versioned and surfaced on every response
  for debuggability.
- **Multi-provider dispatch** behind a provider-neutral interface:
  - Anthropic Claude 3.5 Sonnet (`claude` mode) with explicit
    `cache_control: { type: "ephemeral" }` on the Meta-Prompt for ~90%
    input-cost reduction on cached prefixes.
  - OpenAI GPT-4o (`openai` mode) with `response_format: json_object`
    and automatic prefix caching.
  - Google Gemini 2.5 Flash (`gemini` mode) with
    `responseMimeType: "application/json"` and implicit caching.
- Zod-validated parser (`lib/parse-ir.ts`) with one-retry recovery on
  schema mismatch — the failed assistant output and parser error are
  threaded back into the retry's conversation context, so the cached
  system prefix stays intact.
- Haiku-based confidence-score judge (`lib/judge.ts`) running
  sequentially after a successful compile, with a hard 5s timeout and
  graceful null-degradation on any failure.
- Provider-aware cost logging in the route: `[compile] provider=... model=...
in=N out=N cache=HIT/MISS/none cost=$X.XXXXX`.

#### Trust signals

- **Token + cost meter** in both Source and IR panels with live updates
  via `js-tiktoken`. Four-decimal precision; no marketing rounding.
- **Density score** badge on the Source panel using `compromise` for
  POS tagging — counts verbs, constraints, and filler against a curated
  phrase list. Score in `[0, 1]`.
- **Cache-Ready Badge** — deterministic check, not a guess. Shows
  `cache-ready ✓` only when the IR has all four canonical sections in
  order AND token count ≥ 1024 (the prefix-cache floor across all three
  providers). Below threshold, surfaces the specific failure reason.
- **Why-tooltips** on diff entries — hover or keyboard-focus any diff
  row, 200ms delay, shows the `reason` and `tokens_saved` from the
  compiler.
- **Unified | Split diff view toggle** — Unified renders diff entries as
  a list of changes; Split shows the full source and IR side-by-side
  with inline highlights (removed spans in destructive tone, structural
  anchors in success tone).
- **Dry Run (opt-in)** — sends both source and IR to the Haiku judge in
  parallel, returns one-sentence "what does the user want" summaries
  side-by-side. Jaccard-similarity check flags divergence between the
  two interpretations. Explicit cost disclosure on the button label
  computed from real token counts.

#### Source-side honesty

- **Density-gated skip-compile hint** — when source density ≥ 0.85 at
  ≥ 10 tokens, an inline line appears next to the Compile button:
  _"already tight (NN% · MM tok) — compiling may inflate the output."_
  Derived from an empirical four-class testing matrix that showed
  high-density imperatives suffer a +45% downstream output inflation
  when wrapped in IR.
- **"Recompile to apply" hint** in the IR panel header when the active
  toggle drifts away from the model that produced the on-screen IR.

#### Export and persistence

- **Export menu** below the IR: download `.md` (wraps Claude XML in
  ```xml fences, passes Markdown through unwrapped), download `.txt`(verbatim), and "copy for cursor" (prefixes a`// === Prompt-IR
  compiled prompt ===` framing comment for paste-into-Cursor workflows).
- **Savings ledger** in the footer, localStorage-backed. Cumulative
  tokens and dollars saved across sessions with a `clear` button guarded
  by `window.confirm`. Honest about losses: shows negative deltas when
  the IR was bigger than the source.
- **Header model toggle persists** across sessions in localStorage.

#### Page chrome

- AppShell with dark-mode-only theme (Inter for UI, JetBrains Mono for
  prompt + code surfaces) and Vercel/Linear-grade visual polish.
- Three-button model toggle (`claude | openai | gemini`) in the header.
- Settings icon placeholder in the header (no behavior yet — Phase 4).
- Compile button floats in the Source panel with `⌘+Enter` /
  `Ctrl+Enter` keyboard shortcut.
- Compile transition: glowing inset shadow on the IR panel during
  in-flight compiles, animated in/out via Framer Motion.
- Empty-state preview in the IR panel showing the four canonical tag
  scaffold.
- Error state in the IR panel renders both the headline error and the
  full `details` (rate-limit messages, schema-mismatch paths, etc.) so
  failures are self-diagnosing.

#### Keyboard

- `⌘+Enter` / `Ctrl+Enter` — compile
- `⌘+K` / `Ctrl+K` — toggle command palette (stub with one command for now)
- `⌘+C` / `Ctrl+C` — copy IR (guarded — only when no text is selected
  and focus isn't on a text input)
- `Esc` — close command palette

#### SEO

- Four below-the-fold landing sections targeting _"how to reduce Claude
  3.5 Sonnet token costs"_, _"XML tagging template for LLM prompts"_,
  _"Cursor IDE prompt optimization"_, and _"best PromptPerfect
  alternative 2026"_. ~350 words each of genuine writing with internal
  links to product features.

#### Engineering foundation

- Trunk-based development on `main` with branch protection: PR
  required, linear history, force-push blocked.
- GitHub Actions CI: `lint`, `typecheck`, `test`, `build` matrices on
  every PR.
- Husky pre-commit hooks (lint-staged: prettier + eslint --fix) and
  commit-msg hook (commitlint with Conventional Commits).
- Vercel preview deploys per PR.
- Dependabot weekly for npm and GitHub Actions.
- 108 unit tests across providers, parsers, judges, ledger, exports,
  cache-check, density, format-ir, meta-prompt, route handlers, and
  diff highlighting.
- `vitest.config.ts` with `@/*` alias support; `happy-dom` for the
  ledger tests that need `window.localStorage`.
- `.env.example` documenting `ANTHROPIC_API_KEY`, `OPENAI_API_KEY`,
  `GEMINI_API_KEY`.
- `AGENTS.md` + `CLAUDE.md` (Vercel agent-rules convention) to flag
  Next.js version drift to AI tooling.

### Changed

- Local directory renamed `Prompt-IR` → `prompt-ir` to satisfy npm
  package-name rules. GitHub remote URL is case-insensitive; no remote
  change required.
- Route timeout raised to `maxDuration = 60` (was Vercel's 10s default)
  so a 5k+ token source has headroom for compile + retry + judge.
- Error responses from `/api/compile` now include `details` field; the
  client surfaces it inline in the IR panel's error state.
- Tokenizer for `gpt-4o`, `claude-sonnet`, AND `gemini-flash` all use
  `o200k_base` from `js-tiktoken`. Exact for GPT-4o, approximate for
  Claude (~5% drift) and Gemini.

### Honest Caveats

- **Compression isn't universal.** Empirical testing against Gemini 2.5
  Flash across four prompt classes:
  - Filler-heavy conversational input → ~57% fewer downstream output tokens.
  - Casual question → ~12% fewer output tokens.
  - Rambling spec → ~21% fewer output tokens.
  - **Tight imperative prompt (94% density) → +45% MORE output tokens.**
    The density-gated skip-compile hint exists because of the fourth case.
- **Tokenizer is `o200k_base` for all three providers.** Exact for
  GPT-4o; ~5% drift for Claude (Anthropic doesn't publish a client
  tokenizer); rough proxy for Gemini.
- **Judge is Anthropic-only** (Haiku). If your only key is OpenAI or
  Gemini, `confidence_score` and Dry Run both return `null` /
  503 respectively. Compile itself still works.
- **No accounts, no sync, no history.** Everything lives in
  localStorage. v0.1.x will not add a backend.
- **Vercel function timeout caps compile time at 60s.** A 50k-char paste
  with max-token output can hit it. Realistic fix is streaming + a paid
  plan — out of scope for v1.

## [0.0.0] - 2026-05-15

### Added

- Project conception and product spec.

[Unreleased]: https://github.com/JCHETAN26/prompt-ir/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/JCHETAN26/prompt-ir/releases/tag/v0.1.0
[0.0.0]: https://github.com/JCHETAN26/prompt-ir/releases/tag/v0.0.0

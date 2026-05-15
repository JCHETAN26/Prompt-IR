# Changelog

All notable changes to Prompt-IR are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Initial repository scaffolding: `README.md`, `build-plan.md`, `system-prompt.md`.
- Engineering foundation: PR template, Dependabot config, CHANGELOG.
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript 5.9 + Tailwind CSS 4 + ESLint 9 scaffold via `create-next-app`.
- shadcn/ui initialized with default config; `components/ui/button.tsx` and `lib/utils.ts` generated.
- Runtime deps for the Compiler Shell: `framer-motion`, `js-tiktoken`, `compromise`, `lucide-react`.
- `AGENTS.md` + `CLAUDE.md` (Vercel agent-rules convention) included in repo to flag Next.js version drift to AI tooling.
- IR panel empty state now previews the `<context>`, `<constraints>`, `<rules>`, `<task>` block scaffold with a `⌘↵` hint.
- Compiling state shows a pulsing status dot alongside the "compiling…" label.

### Changed

- Local directory renamed `Prompt-IR` → `prompt-ir` to satisfy npm package-name rules (lowercase only). GitHub remote URL is case-insensitive; no remote change required.
- Header model toggle restyled as a segmented pill (rounded card, active background) instead of pipe-separated text.
- Density badge reads `—` instead of `0%` when the source is empty, so the meter stays honest about "no signal yet" vs. an actual zero score.
- Refinery textarea gains an explicit caret color and a soft fade behind the floating Compile button so long source text doesn't visually collide with the action.
- Footer ledger label tightened and presented as a single tabular row in 11px mono.

## [0.0.0] - 2026-05-15

### Added

- Project conception and product spec.

[Unreleased]: https://github.com/JCHETAN26/prompt-ir/compare/v0.0.0...HEAD
[0.0.0]: https://github.com/JCHETAN26/prompt-ir/releases/tag/v0.0.0

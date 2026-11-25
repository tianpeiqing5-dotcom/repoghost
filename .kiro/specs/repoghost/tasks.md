# RepoGhost — Tasks

Spec-driven build plan. Check off as each item is verified with a real run.

## Phase 1 — Spec & scaffolding
- [x] Write `.kiro/specs/repoghost/requirements.md`, `design.md`, `tasks.md`
- [x] Write `.kiro/steering/product.md`, `tech.md`, `structure.md`
- [x] Write `.kiro/hooks/on-save-check.json` (typecheck + lint on save)
- [x] Write `.kiro/settings/mcp.json` (GitHub MCP server, stdio, env token placeholder)
- [x] Write `.kiro/agents/dead-code-hunter.md` (custom agent definition)
- [x] Scaffold Vite + React + TypeScript + Tailwind, base `/repoghost/`
- [x] Add Apache-2.0 LICENSE and README.md (incl. honest "How Kiro was used")

## Phase 2 — GitHub client (`src/lib/github.ts`)
- [x] Parse `owner/repo` from a pasted URL or `owner/repo` string
- [x] `getRepo()` — metadata + default branch
- [x] `getTree()` — recursive tree, 5,000-file cap with warning
- [x] `fetchRawFile()` — raw text via raw.githubusercontent.com, 200 KB cap
- [x] `getCommits()` — last 30 commits with per-file patches
- [x] Typed errors: NotFound, RateLimited (with reset time), Network

## Phase 3 — Analysis (`src/lib/parser.ts`, `analyzer.ts`, `graveyard.ts`)
- [x] JS/TS export + import extraction (regex-based)
- [x] Python import + top-level def/class extraction
- [x] Dead-code analysis: unused exports, unused imports, empty files
- [x] Dead-link analysis for Markdown (file + anchor checks)
- [x] Deleted-code extraction from commit patches (ghost hunks, cap 200)
- [x] Exclusions: tests, generated files, node_modules/dist/build, configs

## Phase 4 — UI (`src/components/`, `src/App.tsx`)
- [x] RepoForm with URL input, Hunt button, sample repos
- [x] Scoreboard: "X ghosts found, Y laid to rest" + per-tab counts
- [x] GraveyardList: dead-code rows (file, line, symbol, explanation)
- [x] DeadLinksList: dead-link rows (source file, line, target)
- [x] GhostCard: commit info + deleted code + Resurrect (copy) + Download .patch
- [x] Haunted dark theme, inline SVG ghost, CSS float animation
- [x] ErrorBanner with friendly messages; loading progress states

## Phase 5 — Verify
- [x] `npm run build` succeeds with no TypeScript errors
- [x] Serve `dist/` locally and curl the index + a JS asset
- [x] Manual smoke test in a browser is NOT possible from this VM's CLI —
      recorded as a known gap; the built bundle is verified by build + curl

## Known gaps (not done in v1)
- No install/run of the Kiro CLI yet (sign-in pending) — /.kiro artifacts are
  hand-authored; README says so.
- No in-app AI-service connectivity test for Kiro (out of scope for the app).
- Python analysis is name-based only; no AST parsing.
- Dead-code heuristics cannot see dynamic usage (`eval`, string-based
  imports, reflection) — results are explicitly labeled "likely dead".
- Repo must be public; no auth token support in v1 (rate limit 60/hour).

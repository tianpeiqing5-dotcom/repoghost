# Tech Steering — RepoGhost

## Stack
- Vite + React 18 + TypeScript (strict) + Tailwind CSS.
- Static only: `npm run build` → `dist/`, served from GitHub Pages at
  base `/repoghost/`.
- No runtime dependencies beyond React. No analytics, no fonts, no images.

## Conventions
- `src/lib/` holds pure logic (GitHub client, parsers, analyzers) — no React
  imports there. `src/components/` holds UI only.
- All GitHub calls go through `src/lib/github.ts` and return typed errors
  (`NotFound`, `RateLimited`, `Network`). Never surface raw API errors.
- Analysis is deterministic and regex-based. No LLM calls anywhere.
- Prefer small, testable functions. Comment any regex that is not obvious.
- All user-facing strings in English.

## Quality gates
- `npm run build` must pass (includes `tsc`).
- On file save (see `.kiro/hooks/on-save-check.json`): run typecheck and lint.

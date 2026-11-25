# RepoGhost 👻 — Dead Code Hunter

> Every repo has ghosts. RepoGhost finds them — and brings the good ones back.

**Kiroween 2026 entry · Resurrection category**

RepoGhost is a static web app (no backend, no sign-in, no analytics). Paste
a public GitHub repo URL and it will:

1. **Hunt dead code** — unused exported functions/consts/classes, unused
   imports, and empty files (JavaScript/TypeScript first, plus Python).
   Results are shown as a "graveyard" with file, line, symbol, and a
   plain-English explanation.
2. **Find dead links** — internal links in Markdown files that point to
   files or anchors that don't exist in the repo.
3. **Resurrect deleted code** — the last ~30 commits are read, deleted code
   hunks are shown as "ghosts" with commit message, date, and author. A
   **Resurrect** button copies the deleted code to your clipboard; you can
   also download the whole commit as a `.patch` file.

Everything runs in the browser against the public GitHub REST API (no auth
token). Analysis is heuristic and deterministic — no LLM, no server — and
every finding is labeled "likely dead", because dynamic imports and
framework magic can hide real usage.

## Run it

```bash
npm install
npm run dev      # local dev server
npm run build    # production build -> dist/
npm run preview  # preview the production build
```

## Deploy to GitHub Pages

The build is configured with `base: '/repoghost/'` in `vite.config.ts`.

1. Create a public repo named `repoghost` on GitHub.
2. Push this project to it.
3. In the repo: **Settings → Pages → Build and deployment → GitHub Actions**,
   and use the standard "Static HTML" workflow, or publish the `dist/`
   folder from the `main` branch (`/docs` won't work — use Actions).
4. The site will be live at `https://<your-username>.github.io/repoghost/`.

## How it works

- `src/lib/github.ts` — GitHub REST client (repo meta, recursive tree, raw
  file fetches, last 30 commits with patches). Unauthenticated rate limit is
  60 requests/hour; raw file fetches don't count against it.
- `src/lib/parser.ts` — regex-based symbol extraction for JS/TS and Python.
- `src/lib/analyzer.ts` — dead-code and dead-link heuristics.
- `src/lib/graveyard.ts` — clipboard copy + `.patch` download helpers.
- `src/components/` — UI: repo form, scoreboard, graveyard/dead-link lists,
  ghost cards.

## How Kiro was used

Honest note: at the time this v1 was built, Kiro sign-in had not been
completed yet, so the Kiro CLI was **not** used to generate this code. What
exists in this repo is hand-authored, spec-driven Kiro scaffolding:

- `.kiro/specs/repoghost/` — `requirements.md`, `design.md`, `tasks.md`.
  Written **first**; the implementation was built against them.
- `.kiro/steering/` — `product.md`, `tech.md`, `structure.md`.
- `.kiro/hooks/on-save-check.json` — run typecheck + lint on save.
- `.kiro/settings/mcp.json` — GitHub MCP server config (stdio; the token
  comes from the `GITHUB_PERSONAL_ACCESS_TOKEN` env var — never committed).
- `.kiro/agents/dead-code-hunter.md` — custom agent definition for the
  analysis agent.

Once Kiro sign-in is done, the plan is to run the implementation through the
Kiro CLI using these specs (spec-driven development, hooks, and the GitHub
MCP server) for v2.

## Known limitations

- Public repos only; no auth token support yet (60 req/hour unauthenticated).
- Python analysis is name-based only (no AST parsing).
- Heuristics can't see dynamic usage (`eval`, string imports, reflection) —
  results are explicitly "likely dead".
- Repo trees are capped at 5,000 files; files over 200 KB are skipped.

## License

Apache-2.0 — see `LICENSE`.

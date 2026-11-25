# RepoGhost — Requirements

## Overview
RepoGhost is a static web app (no backend, no secrets, no API keys) that hunts
dead code and dead links in a public GitHub repository, and resurrects deleted
code from git history. It is a Kiroween 2026 entry for the **Resurrection**
category. The app runs entirely in the browser and talks only to the public
GitHub REST API without authentication.

## User stories

### 1. Paste a repo URL and scan it
- As a developer, I paste a public GitHub repo URL (e.g. `https://github.com/facebook/react`
  or `facebook/react`) and click **Hunt**. The app fetches the repo's file tree
  and default branch from the public GitHub API (no auth token required).
- Invalid URLs, private/missing repos, and GitHub rate-limit errors are shown
  as clear, human-readable error messages (no raw stack traces).

### 2. Dead-code graveyard (JS/TS first, Python if easy)
- The app scans JS/TS files for:
  - exported functions / consts / classes that are never imported or referenced
    anywhere else in the repo (and not referenced from entry points or tests);
  - imported names that are never used in the importing file;
  - files that are empty or contain only comments.
- Python files are scanned with the same approach where cheap: unused imports
  and unused top-level `def`/`class` names (name-based, no type inference).
- Results are shown as a "graveyard": one row per ghost with file path, line
  number, symbol name, ghost type, and a one-line plain-English explanation.
- The scan is heuristic and deterministic — no LLM, no server. Results are
  labeled as heuristics ("likely dead") rather than certainties.

### 3. Internal dead links
- Markdown files are scanned for relative links (`[text](./path.md)`,
  `[text](../docs/x.md)`, `[text](#anchor)`, `[text](file.md#anchor)`).
- A link is dead when its target file is not in the repo tree, or its anchor
  does not exist in the target file's headings.
- Each dead link is listed with the source file, line, link text, and target.

### 4. Graveyard / resurrection
- The app fetches the last ~30 commits from the repo and, for each commit,
  reads the patch hunks.
- Deleted lines (`-` lines in patches, excluding `---` headers) are collected
  as "ghosts": commit message, commit date, author, file, and the deleted code.
- Each ghost has a **Resurrect** button that copies the deleted code to the
  clipboard, and a **Download .patch** button that downloads the commit's
  patch as a file.
- A "laid to rest" counter tracks how many ghosts the user has resurrected
  (copied/downloaded) in the session.

### 5. Haunted scoreboard
- The header shows a live score: "X ghosts found, Y laid to rest".
- The UI is dark, spooky but readable, using CSS/SVG ghost and graveyard
  visuals only (no external images, no web fonts).

## Non-functional requirements
- Static build only: `npm run build` outputs `dist/`; deployable to GitHub
  Pages with Vite `base: '/repoghost/'`.
- No secrets, no analytics, no backend, no build-time API calls.
- Unauthenticated GitHub API: must degrade gracefully at the 60 req/hour
  rate limit (show the reset time when the API reports it).
- All user-facing text in English.
- Must work on a fresh clone: `npm install && npm run dev`, `npm run build`.

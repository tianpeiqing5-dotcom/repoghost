# RepoGhost — Design

## Architecture
Single-page static app. No backend. All data comes from the public GitHub
REST API (`https://api.github.com`, no auth) at runtime, in the browser.

```
src/
  main.tsx            entry point, mounts <App/>
  App.tsx             layout + state machine (idle → loading → results | error)
  lib/
    github.ts         GitHub API client (repo meta, tree, file contents, commits)
    parser.ts         regex-based symbol extraction for JS/TS + Python
    analyzer.ts       dead-code + dead-link analysis over the fetched tree
    graveyard.ts      deleted-code extraction from commit patches
    types.ts          shared types
  components/
    RepoForm.tsx      URL input + Hunt button + sample repos
    Scoreboard.tsx    "X ghosts found, Y laid to rest" + progress
    GraveyardList.tsx dead-code results table
    DeadLinksList.tsx dead-link results table
    GhostCard.tsx     one resurrected-code ghost (commit + code + buttons)
    Ghost.tsx         small SVG ghost illustration
    ErrorBanner.tsx   friendly error display
```

## Data flow
1. `RepoForm` parses `owner/repo` from the pasted URL.
2. `github.getRepo()` fetches repo metadata (default branch, size).
3. `github.getTree(owner, repo, branch)` fetches the recursive tree
   (`/git/trees/{branch}?recursive=1`). Cap at ~5,000 files; larger repos
   show a warning and scan the first 5,000.
4. Source files (`.js/.jsx/.ts/.tsx/.mjs/.cjs`, `.py`, `.md`) are fetched
   as raw text via the `raw.githubusercontent.com` CDN (one request per
   file, batched in small groups; files > 200 KB are skipped and noted).
   - GitHub's unauthenticated rate limit is 60 req/hour for the API, but
     raw file fetches do not count against it, so the tree/commits calls
     (3–5 requests) are the only rate-limited ones.
5. `analyzer.analyze(files)` returns `{ deadCode, deadLinks, stats }`.
6. `graveyard.getGhosts(owner, repo)` fetches the last 30 commits
   (`/commits?per_page=30`) and each commit's `files[].patch`, extracting
   deleted lines.
7. Results render in three tabs: **Graveyard** (dead code), **Dead Links**,
   **Resurrect** (deleted code). The scoreboard updates as ghosts are
   resurrected (copy/download actions increment "laid to rest").

## Dead-code heuristics (JS/TS)
- **Exports:** match `export function|const|class|interface|type|enum NAME`,
  `export { NAME }`, `export default ...`. A symbol is "used" if its name
  appears as a word in any other file (excluding its own definition line),
  or if it is the default export of an entry-point file
  (`index.*`, `main.*`, `app.*`, `cli.*`).
- **Imports:** match `import { A, B } from '...'` and `import X from '...'`.
  An imported name is unused if it never appears again in the same file.
- **Empty files:** files whose content is empty or comments-only.
- Exclusions: test/spec files (`*.test.*`, `*.spec.*`, `__tests__`), generated
  files (`*.generated.*`, `*.min.js`), `node_modules`, `dist`, `build`,
  `.git`. Config files (`*.config.*`, `vite.config.*`) are skipped for
  export analysis (their exports are entry points by convention).
- Everything is reported as "likely dead" — the UI says so explicitly.

## Dead-code heuristics (Python)
- **Imports:** `import X`, `from M import A, B` — unused if the name never
  appears again in the file.
- **Top-level defs:** `def NAME(` / `class NAME` at column 0 — unused if the
  name never appears in any other `.py` file in the repo.
- `__init__.py`, `__main__.py`, `setup.py`, and test files are excluded.

## Dead-link heuristics (Markdown)
- Extract `[text](target)` and `[text]: target` reference definitions.
- Ignore external URLs (`http://`, `https://`, `mailto:`, `#` alone) and
  image links (`![...]`).
- Resolve relative targets against the source file's directory; strip `#anchor`.
- File target must exist in the tree (case-sensitive); anchor must match a
  heading in the target file (GitHub-style slug: lowercase, spaces → `-`,
  strip punctuation).

## Graveyard (deleted code)
- For each of the last 30 commits, read `files[].patch` (may be absent for
  large diffs — those commits are skipped and counted).
- A deleted line is any patch line starting with `-` that is not the `---`
  header. Consecutive deleted lines in one hunk form one ghost.
- Ghosts are capped at 200 (largest first). Each ghost keeps: commit SHA
  (short), message (first line), author, date, file path, deleted code.
- Resurrect = copy code to clipboard (`navigator.clipboard.writeText` with
  a textarea fallback) and/or download the full commit patch as
  `resurrect-<short-sha>.patch` via a Blob URL.

## Styling
- Tailwind CSS, dark theme (`#0b0e14` background, `#a3e635`-ish accent is
  avoided; use a ghostly mint `#7dd3fc`-adjacent palette with amber
  highlights). Font: system stack only.
- Ghost illustration: inline SVG (a simple sheet ghost with eyes), plus a
  CSS "floating" animation. Tombstone rows use a left border and a small
  SVG tombstone marker.
- No external images, no web fonts, no analytics.

## Error handling
- GitHub 404 → "Repo not found or private — RepoGhost only works on public repos."
- GitHub 403 with `X-RateLimit-Remaining: 0` → "GitHub rate limit hit
  (60/hour without sign-in). Try again after <reset time>."
- Network failure → "Couldn't reach GitHub. Check your connection and try again."
- Repo with no scannable files → "No JS/TS/Python/Markdown files found to scan."

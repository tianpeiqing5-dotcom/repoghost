# RepoGhost — Devpost Submission Draft (Kiroween 2026, Resurrection)

Status: DRAFT — video link still missing. Fill `VIDEO_URL` after the demo is recorded, then submit.

## Links
- App: https://tianpeiqing5-dotcom.github.io/repoghost/
- Repo: https://github.com/tianpeiqing5-dotcom/repoghost
- Video: VIDEO_URL (must be public YouTube, under 3 minutes)

## Category
Resurrection — reviving dead code.

## Tagline
Hunt dead code in any public repo — and resurrect deleted code from the graveyard.

## Description (Devpost text)
Every repository accumulates ghosts: exported functions nobody calls, imports
nobody uses, files that are empty, and links that quietly rotted. Worse, the
code you actually want back is the code someone already deleted.

RepoGhost is a static web app — no sign-in, no backend, no keys. Paste any
public GitHub repository URL and it:
- scans the repo tree through the public GitHub API and flags unused exports,
  unused imports, and empty files (JS/TS and Python), labeling every finding
  "likely dead" because the analysis is regex-based and honest about it;
- checks internal Markdown links, including heading anchors;
- digs through the last 30 commits and shows deleted code in a "graveyard",
  with one-click Resurrect (copy to clipboard) or a downloadable .patch file
  for the whole graveyard.

Dead code is usually deleted in a hurry and missed later. RepoGhost treats
deletion as reversible: the graveyard is the resurrection.

## How Kiro was used
The project was built spec-first with Kiro: `/.kiro/specs/repoghost/` holds the
requirements, design, and task list that drove the build; `/.kiro/steering/`
holds product, tech, and structure guidance; `/.kiro/hooks/on-save-check.json`
runs a check on save; `/.kiro/settings/mcp.json` configures the GitHub MCP
server; `/.kiro/agents/dead-code-hunter.md` defines the dead-code-hunter agent.
Honest note: the Kiro CLI could not be signed in from this environment during
the build, so the `/.kiro` artifacts were authored as spec-driven scaffolding
and the code was written to follow them; the README states this plainly.

## Built with
Vite, React 18, TypeScript, Tailwind CSS. Hosted on GitHub Pages.

## Try it
Open the app, paste `https://github.com/tianpeiqing5-dotcom/ple-harness`,
hit Hunt. It finds the unused `annotations` import in `taskbridge.py` and
resurrects deleted lines from the reasoning-fix commit.

# Product Steering — RepoGhost

## What it is
RepoGhost is a dead-code hunter for public GitHub repos. Paste a repo URL,
get a graveyard of dead code, a list of dead internal links, and a chance to
resurrect deleted code from git history. Built for Kiroween 2026
(Resurrection category).

## Who it's for
Developers doing repo cleanup, maintainers inheriting a codebase, and anyone
curious about what their repo has forgotten.

## Tone
Spooky but useful. Ghosts and graveyards are the metaphor, but every result
must be actionable: file, line, symbol, why it looks dead, and what to do
about it. Never present a heuristic as a certainty — say "likely dead".

## What it is NOT
- Not a linter replacement, not a security scanner, not a code-quality judge.
- No LLM, no backend, no accounts, no tracking.
- No destructive actions: nothing is ever deleted from the repo. Resurrect
  only copies code to the user's clipboard or downloads a patch file.

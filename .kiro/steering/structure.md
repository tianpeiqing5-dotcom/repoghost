# Structure Steering — RepoGhost

```
repoghost/
  .kiro/                  Kiro specs, steering, hooks, MCP, agents
  public/
    favicon.svg           ghost favicon (inline SVG)
  src/
    main.tsx              entry point
    index.css             Tailwind + custom haunted styles
    App.tsx               layout + scan state machine
    lib/
      types.ts            shared types
      github.ts           GitHub REST client (no auth)
      parser.ts           JS/TS + Python symbol extraction
      analyzer.ts         dead-code + dead-link analysis
      graveyard.ts        deleted-code extraction from patches
    components/
      RepoForm.tsx        URL input + Hunt button
      Scoreboard.tsx      ghosts found / laid to rest
      GraveyardList.tsx   dead-code results
      DeadLinksList.tsx   dead-link results
      GhostCard.tsx       one deleted-code ghost
      Ghost.tsx           SVG ghost illustration
      ErrorBanner.tsx     friendly errors
  vite.config.ts          base '/repoghost/' for GitHub Pages
  LICENSE                 Apache-2.0
  README.md
```

## Rules
- New analysis logic goes in `src/lib/`, never inside components.
- New UI goes in `src/components/`, one component per file.
- Keep `App.tsx` thin: state machine + layout + tab switching only.

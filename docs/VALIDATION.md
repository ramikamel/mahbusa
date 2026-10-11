# Validation record

## Completed locally — October 11, 2026

- Git repository on `main` with incremental source commits and a pnpm lockfile.
- Svelte/TypeScript check: **0 errors, 0 warnings**.
- Vitest: **2 tests passed**.
- Node engine suite: **16 tests passed**, including complete simulated round and
  piece conservation, movement, dice sequencing, pinning, mother-piece wins,
  bearing off, scoring, blocked handover and undo.
- Offline generation/worker suite: **4 tests passed**, covering content versioning,
  production fixture exclusion, asset caching, old-cache cleanup, deferred updates,
  cached navigation and request filtering.
- Production Vite build and offline-shell generation succeeded. JavaScript:
  **56.11 KB uncompressed / 21.82 KB gzip**; CSS **11.03 KB / 3.35 KB gzip**.
  Production JavaScript contains no development fixture strings or panel.
- Spread-board double-1 legal sequence search: about **6 ms** on this Mac.
  This is not an iPhone responsiveness measurement.
- Home Screen icons generated as SVG and 180/192/512 px PNGs.

## Chrome extension checks — actual interface interactions

Passed using the development server started by the user:

- Opening contest tie/reroll, winner selection and fresh two-dice roll.
- Source selection, legal destination highlights, die consumption and disabled
  premature End Turn; explicit handover to the other player.
- Undo restores checkers, pins and dice; winning moves disable undo.
- Pinning and moving the final covering checker to release the pinned checker.
- Immediate mother-piece victory awards 2 points.
- Bearing-off wins award 1 or 2 points correctly; reaching 3 ends the round.
- New round clears both scores and restarts the opening contest.
- Fully blocked turns can be handed over without moving checkers.
- Forced move order and higher-die priority highlight only the allowed destination.
- Ambiguous bearing off offers a die choice; chosen die is consumed; undo restores.
- Rules dialog opens/closes; reset cancellation preserves the board; confirmed
  reset clears the board and scores.
- Desktop and 844×390 landscape layouts inspected visually. Landscape End Turn
  control bottom: **380 px**, within the 390 px viewport.
- 390×844 portrait shows score and rotate prompt. Returning to landscape preserves
  the board and selected checker.
- Refresh returns to initial checkers and zero scores; no game state is saved.
- No browser error/warning logs observed during these checks.

Found and fixed: opening-contest dice persisted across later turns; development
panel text remained in production; initial mobile layout placed controls below
viewport. Rechecked the affected behaviors.

## Pending — do not treat as complete release acceptance

- Browser verification of production offline caching.
- Actual iPhone/Safari installation, standalone offline launch, touch, safe-area
  behavior and measured interaction latency.
- GitHub CLI is installed and has an account entry, but sandbox network restrictions
  prevent API verification, public repo creation and source push.
- Sites source synchronization and deployment. Registered identity is recorded in
  `.openai/hosting.json`; registration alone does not mean the site is live. Source
  helper push failed with DNS resolution blocked for `git.chatgpt-team.site`.
  A deployment archive is prepared at `/private/tmp/mahbusa-release.tar.gz`.

The local server cannot be started inside the restricted execution sandbox; the
user started it in Terminal, after which Chrome extension testing worked.

# Validation record

## Completed locally — October 11, 2026

- Git repository on `main` with incremental source commits and a pnpm lockfile.
- Svelte/TypeScript check: **0 errors, 0 warnings**.
- Vitest: **2 tests passed**.
- Node engine suite: **16 tests passed**, including complete simulated round and
  piece conservation, movement, dice sequencing, pinning, mother-piece wins,
  bearing off, scoring, blocked handover and undo.
- Offline generation/worker suite: **5 tests passed**, covering content versioning,
  production fixture exclusion, asset caching, old-cache cleanup, deferred updates,
  cached navigation, request filtering and Origin-header variance.
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

## Production browser validation

- Production page loads with development fixtures absent.
- Chrome DevTools Offline enabled: reload renders the full board.
- Opening contest, dice roll, checker movement and undo work while offline.
- New service worker waits while the old app is open, then activates after the
  old client closes. This was observed in DevTools, not forced with skipWaiting.
- Cached HTML, JavaScript, CSS, manifest and icons inspected in Cache Storage.
- Local Storage table contains no entries. App source never writes game state
  to Local Storage, Session Storage or IndexedDB.
- Browser network simulation restored to online after testing.
- Found and fixed `Vary: Origin` cache mismatch for known static app assets.

## Delivery

- Public repository verified: https://github.com/ramikamel/mahbusa
- Initial GitHub Actions validation passed; offline fix pushed as a separate commit.
- Approval-enabled tool session now runs the production preview independently of
  the user’s Terminal.

## Pending — do not treat as complete release acceptance

- Actual iPhone/Safari installation, standalone offline launch, touch, safe-area
  behavior and measured interaction latency.


## Published release

- Sites deployment succeeded: https://mahbusa.bubblyspice4.chatgpt.site
- Deployed application commit: `20990d73b6bd86a106afa60bbb02fadeedda426c`.
- Deployment ID: `appgdep_6acc2219475c819186e8c58bbf791548`.
- Version ID: `appgprj_6acc1863a36c81918a6a5fe3f6c39346~appgver_2e2fc73f827881919fe8b2a762746759`.
- Source synchronized through the Sites workflow helper; GitHub remains canonical.
- GitHub Actions passed for the offline fix and final browser validation commits.
- Publication created an owner-only preview; public audience selection is tracked
  separately from the app code and deployment.
- This documentation update does not change the served app assets.

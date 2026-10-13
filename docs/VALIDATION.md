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
- Deployed application commit: `24ab000421b587357115f382cb5792f4daef4190`.
- Deployment ID: `appgdep_6acc23f57f7c8191acaf533d320c4ec5`.
- Version ID: `appgprj_6acc1863a36c81918a6a5fe3f6c39346~appgver_2de76b8be798819197c88e707a14940b`.
- Source synchronized through the Sites workflow helper; GitHub remains canonical.
- GitHub Actions passed for the offline fix and final browser validation commits.
- The owner selected public access. The app opens without ChatGPT sign-in.
- Live smoke test passed opening rolls, dice and checker movement. It exposed
  the host’s 307 redirect from `/index.html` to `/`, which caused cached
  navigation to fail. The worker now caches the canonical root URL.
- Final public deployment: online reload succeeds with no login prompt.
- On the hosted site, Chrome DevTools Offline mode: reload, opening roll, dice,
  checker movement and undo all passed. Network simulation restored to online.
- The corrected worker activated after closing the old preview client.
- Final app left open in Chrome; the temporary local preview was stopped.
- All 23 automated tests and GitHub CI passed for the hosting compatibility fix.

## Separate opening rolls — October 12, 2026

- Light and Dark now roll one opening die each using separate buttons, in either
  order. Already-rolled players wait for their opponent. A tie enables both
  rerolls; the first reroll clears both previous results before recording the new die.
- All 26 automated tests passed (19 engine, 5 offline, 2 Vitest). Svelte checking
  reported zero errors or warnings; production build and fixture exclusion passed.
- Chrome extension QA passed both rolling orders, disabled repeat rolls, waiting
  for the second player, ties, independent rerolls, both possible starters, fresh
  first-turn dice and legal destinations. No console errors were observed.
- At 844×390, both controls fit inside the viewport. Portrait shows the rotate
  prompt; returning to landscape preserves the opening contest.
- GitHub Actions passed for application commit
  `6c85c6794d2a75b8e724397741db2f79fb1cba35`.
- Public version 3 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6acd9a652c9c8191ba486ba91f7a8c6f`.
- Hosted Chrome smoke test passed separate rolls, a real random tie and rerolls,
  a Dark win, fresh dice, and reset. Development controls are absent. The new
  cached assets activated after closing the previous app client.
- Local test server stopped; published app left open at the opening contest.
- Actual iPhone checks remain pending. Offline worker behavior was covered by
  automated tests; manual network-offline testing was not repeated for this change.

## Combined dice destinations — October 13, 2026

- Selecting a checker offers legal single-die and combined destinations. With
  2 and 4, this includes 2, 4 and 6 spaces when legal; doubles include up to four
  steps. Every intermediate landing uses normal movement, pin and dice-use rules.
- Equivalent dice orders share a destination without a redundant prompt. Different
  bear-off dice choices remain selectable. One Undo reverses the whole tapped route.
- All 32 automated tests passed (25 engine, 5 offline, 2 Vitest). New tests cover
  both players, blocked intermediate/final points, alternate order, forced dice
  use, pin release, immediate wins, doubles, bear-off and atomic Undo.
- Svelte check: zero errors/warnings. Production build and development fixture
  exclusion passed. A spread-board doubles destination calculation measured
  11.1 ms locally; this is not a measurement of iPhone interaction latency.
- Chrome extension QA passed 24→18 using 2+4, full Undo, a blocked first landing
  with a legal reverse order, both routes blocked, four-step doubles via Enter,
  and unchanged bearing-off dice choices. No console errors were observed.
- At 844×390, combined movement and Undo worked; controls remained in view.
- GitHub CI passed for `cb9e806a96618b167a4afe1611be5635b1b5e938`.
- Public version 4 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6ace9ad94e34819187b02aaa2a6b707c`.
- Hosted smoke test used a real 4+3 roll: Dark had destinations 4, 5 and 8 from
  point 1; tapping 8 consumed both dice, and one Undo restored the board and dice.
  The new cached assets activated after closing the previous app client.
- Development controls are absent from the hosted release. Local server stopped;
  public board left open showing combined destinations.
- Actual iPhone checks remain pending; manual network-offline QA was not repeated.

## Board and turn-flow refresh — October 13, 2026

- Completed the approved layout/flow tasks: stable separate contest dice with
  Start game, fresh opening pair, automatic rolls after End turn and Next game,
  continuation actions inside results, no visual board numbering or lock icons,
  centered header scoreboard, outlined How to play, larger dice and small text.
- All 36 automated tests passed (29 engine, 5 offline, 2 Vitest). New engine
  cases cover starting guards, fresh dice, automatic handover, Undo boundaries,
  blocked explicit passes, next-game scoring and new-round reset.
- Svelte checking reported zero errors/warnings. Production build and fixture
  exclusion passed; offline worker checks passed.
- Chrome extension checked opening rolls in Dark-first order, ties and rerolls,
  fixed dice coordinates before/after deciding the starter, disabled rerolls,
  fresh first-turn dice and combined destinations. No Roll dice button is present.
- Ending a completed 2+4 move immediately gave Dark fixed dice 3,5 with Undo
  disabled. A blocked double-1 handover stayed on Dark until explicit End turn.
- Mother win awarded +2; exactly one Next game button was inside the result
  card, clickable and preserved score while immediately rolling 2,4 for Light.
- Round win offered exactly one New round button inside the result card;
  pressing Enter reset scores and returned to the opening contest.
- Pin stacking, release, Undo and updated rules dialogue passed. Numbered point
  accessibility labels remain; visible numbers and lock graphics are absent.
- Responsive checks passed at 667×375 and 844×390: dice measure 44 px, controls
  at least 44 px tall, Start game remains in view, and scoreboard center matches
  the header center. Desktop dice measure 52 px. Portrait 390×844 shows the
  scoreboard centered in the header's second row and the rotate prompt.
- No browser console errors were observed. Actual iPhone/Safari checks remain
  pending; network-offline UI testing was not repeated in this checkpoint.
- GitHub CI passed for deployed commit
  `9f6b39f436ae78f67d96311ee470a0fe2278e057`.
- Public version 5 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6aceab006bb8819188e786fc4982f841`.
- Hosted Chrome test confirmed the updated header and Start game. Dark's real
  fresh roll of 2,1 moved one checker from point 1 to 4; End turn immediately
  rolled 2,3 for Light, with Undo disabled and no Roll dice button.
- Updated cached assets activated after closing the old client. Development
  controls are absent, no console errors were observed, and the local server
  was stopped. Public app left open at the opening contest.
- Published board screenshot saved locally at
  `/private/tmp/mahbusa-board-refresh.jpg` for the user handoff.

## Center controls and wall dice — October 13, 2026

- Replaced the bottom turn panel with center welcome/opening/turn-complete
  messages. Opening rolls and Start game stay together; End turn appears when
  no legal moves remain. Dice-choice and winning actions use center messages.
- Gameplay dice appear vertically on a widened board wall. The overlay tracks
  the SVG's rendered scale, including letterboxing. Current-turn indication is
  in the scoreboard; screen-reader status and error notices remain available.
- Undo and confirmed Reset are in the header toolbar alongside How to play.
  Removed travel captions, footer slogan and the scoreboard's First to 3 label;
  scoring and movement rules are unchanged.
- All 36 existing automated tests passed. Svelte checking reported zero errors
  and warnings. Chrome checked opening ties/rerolls and fixed die positions,
  Start game, combined movement, center End turn, header Undo and automatic
  next-player rolls. Undo from turn completion restored play and hid the message.
- Reset cancellation preserved dice; confirmation cleared scores and returned
  to opening. Dice-choice bear-off, Next game and New round passed.
- At 667×375 and 844×390, wall-dice centers matched SVG-wall centers within
  0.02 px, and dice remained within the wall. Controls stayed within the viewport
  with 44 px button heights. Portrait 390×844 retained the header toolbar,
  scoreboard and rotate prompt; returning to landscape retained the dice.
- Browser console errors: none observed. Actual iPhone/Safari checks and repeated
  network-offline UI testing remain pending.

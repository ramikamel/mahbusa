# Validation record

## Seeded round simulation and paired benchmark — October 16, 2026

- Checkpoint 6 adds Node-only versioned SHA-256 counter streams with rejection
  sampling, independent dice/action domains, checked complete-turn policies, real
  opening/round transitions, explicit turn limits, and paired color-swapped reports.
  Production crypto dice and public single-player status are unchanged.
- 24 additional tests cover independent SHA word fixtures, all 36 ordered dice
  outcomes including doubles, bounded rejection, input/action stream isolation,
  illegal/partial/fabricated plans, scoring, complete round reproducibility, role
  mapping, censoring, intervals and actual Node CLI output/error paths.
- Full checks: 154 Vitest + 40 Node tests passed (194 total), Svelte/TypeScript
  zero errors/warnings, production build and offline packaging passed. Production
  JS/CSS asset hashes are unchanged from the expert-lab checkpoint.
- Baseline: source 13dcfaf3c9dd4b35d7ea352e10266685256f75ba, sourceDirty=false,
  root seed initial-baseline-2026-10-16, strategy-v1-greedy versus random-legal-v1,
  100 paired seeds / 200 completed rounds, zero truncations. Strategy won 200–0,
  points 733–8, mother losses 0–119, 31,466 turns across 408 games.
- Paired conservative 95% Hoeffding interval for A's score: [0.8642,1].
  This diagnostic assumes representative independent pairs. No model promotion,
  trained strength claim, or repeated-look stopping rule is implied.
- Local batch wall time about 45.9 s. Maximum measured strategy decision about
  274 ms on this Mac; not an iPhone or search-budget guarantee.
- Full report kept locally at .local/initial-baseline-2026-10-16.json (ignored).
  Random play is a weak control. Expert-held-out positions, search, trained
  models, equal runtime qualification and device acceptance remain later work.

## Expert lab final review and export fix — October 16, 2026

- Independent review found one Important issue: a compact import could become
  unexportable after pretty formatting, and editor updates could exceed the
  collection byte cap. No Critical or Minor findings.
- Fixed with compact export fallback and transactional UTF-8 size checks before
  accepting note/label/title/new-case changes. Rejected controls restore their
  prior value. Three regressions failed first and now pass.
- Final verification: 133 Vitest + 37 Node tests (170 total), Svelte/TypeScript
  zero errors/warnings, production/offline build passed. New tests round-trip
  the reviewer's large fixture and verify rejection preserves exportable work.
- Additional Chrome QA passed 174-result pagination, labels on page two, and
  rejecting a 21st case while preserving all 20 cases/40 labels.
- Near-limit browser import was exercised via the native picker and its replacement
  dialog; final export/size-control UI automation could not finish because Chrome
  extension reconnection/debugger failures interrupted it. These boundaries are
  covered by automated regressions; do not count the interrupted UI check as passed.
- Review scope decisions: structural validity does not establish historical
  reachability (risk: unreachable test positions); main-thread/cancellation budgets
  await workers (risk: large analyses can pause UI); heuristic strength/training
  await qualification (risk: weak play); automatic reload recovery stays excluded
  (risk: unexported work is lost); actual iPhone/Safari checks remain pending
  (risk: desktop QA does not establish device acceptance).

## Development expert lab — October 15, 2026

- Checkpoint 5 adds a DEV-gated dynamic editor at ?lab=1 and a development header
  entry. Reuses the board with opt-in editable points; production geometry and
  multiplayer behavior are preserved. Lab styles remain in its dynamic component.
- Full-turn board/player/score/dice editing, three presets, paged candidate list,
  checked prefix/final replay, next-game/round copy and actual feature breakdown.
  Candidate labels/notes attach to canonical results; changed analyzed positions
  create separate cases. Cases and labels stay in memory until explicit export.
- Versioned JSON validates totals, pin shape, top colors, mother/completed-game
  state, scores, full rolls, result-label membership, sizes and duplicates.
  Imports are atomic and require replacement confirmation. Export excludes cached
  values. Validation establishes structure, not historical opening reachability.
- Test-first coverage: neutral validation accepted wrong totals before implementation;
  sparse-array regressions failed then passed. New packaging assertions first
  failed, then passed after guarding both JS and CSS against lab markers.
- Automated checks: 130 Vitest + 37 Node tests passed (167 total), Svelte/TypeScript
  zero errors/warnings, production build and offline generation passed.
- Chrome extension QA passed analysis, exact mother-win replay, multi-label notes,
  prefix replay, invalid-total disabled analysis, separate cases preserving labels,
  invalid JSON preserving cases, import cancellation and replacement, JSON download,
  keyboard point selection, held pins, and 390×844 layout without horizontal overflow.
- Browser download-event observation timed out, but native Chrome and the generated
  8 KB Downloads file confirmed completion. Extension file chooser automation lacked
  file-URL permission; the native picker successfully loaded the downloaded JSON
  without settings changes. No browser errors/warnings observed in app checks.
- Production preview verified the current JS asset on a fresh origin (an old preview
  origin had a cached app). ?lab=1 still shows normal mode selection, no lab entry,
  Single player In development, and separate multiplayer opening controls.
- Development multiplayer smoke passed opening tie/reroll, deterministic fresh dice,
  combined movement and Undo after returning from the lab.
- No Sites deployment: the lab is intentionally absent from production. Actual
  iPhone/Safari and full worker/search performance remain later acceptance work.

## Bot strategy evaluator and turn ranking — October 15, 2026

- Checkpoint 4 adds a versioned strategy-v1 evaluator with 15 normalized features,
  explicit weights, per-feature contributions and a bounded heuristic value.
  Mother protection, pin location/cover/passage, support, contact risk, mobility,
  progress and round score encode the initial expert preferences.
- Mother-capture threat checks all 21 weighted rolls, including combined dice
  and four uses of doubles, with intermediate blocking from the actual rules.
  Ordinary blot pressure and isolation remain static proxies. The overall
  heuristic is not a calibrated round-win probability or qualified bot.
- Complete-turn ranking preserves every generated legal option, including forced
  exposure/releases. It evaluates handover from the original player's perspective;
  a game win awards points once and resets with the winner starting. A round win
  returns exact +1 without evaluating another board.
- Test-first neutral stubs failed the real strategy and ranking assertions before
  implementation. Added 41 tests for strategic comparisons, exact threat fractions,
  scores, color reflection, bounded explanations, stable ties, forced moves,
  checked-engine replay, deterministic behavior and input ownership.
- Full verification: 87 Vitest + 34 Node tests passed (121 total), Svelte check
  zero errors/warnings, production build and offline packaging passed.
- Local fixture timings: 100 mother-contact evaluations about 6–9 ms; complete
  ranking of 174 spread-board double-1 results about 9–15 ms. These are Mac
  fixture measurements, not search or iPhone performance guarantees.
- No frontend imports, layout changes or bot entry point. Public Single player
  remains In development; the production JS/CSS asset hashes are unchanged.
  No browser behavior changed, so browser QA/deployment was not repeated.
- Independent read-only whole-branch review found no Critical, Important or Minor
  issues. Its separate engine-oracle check passed 378 roll cases across nine
  compact contact positions and both colors, including blocks and pinned attackers.
  This was bounded verification, not an exhaustive proof across every valid board.
- Review scope decisions: weights remain unqualified (risk: weak play); ordinary
  pin/release estimates remain proxies (risk: tactical misranking); callers must
  supply engine-valid boards (risk: invalid evaluations without later boundary
  validation); device/worker/search/training checks remain later checkpoints
  (risk: local timing cannot establish public readiness).

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
- Production build and development-fixture exclusion passed. GitHub CI passed
  for deployed commit `f1ff174bdbc4ce549ed6a662a1b66570ea582ac7`.
- Public version 6 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6aceaed9ee788191a806e7dd55d7747c`.
- Hosted Chrome smoke test passed centered Start round/opening/Start game,
  Light's real combined 1+3 move from 24 to 20, header Undo, center End turn,
  and automatic Dark wall dice 5,2. No development controls or console errors.
- Updated cached assets activated after closing the old client. Local server
  stopped; live app left open showing wall dice and the header toolbar.
- Screenshot saved at `/private/tmp/mahbusa-center-controls.jpg` for handoff.

## Original board and tray controls — October 13, 2026

- Restored the original center wall (x=391, width=24 SVG units), original point
  spacing and compact board height of 250. Dice float over the narrow wall.
- Moved Undo/Reset from header boxes into borderless right-tray icons. Both
  icons and the count area have separate 44×44 px targets. Color-coded off
  counts remain visible and become the bear-off button when legal.
- Mahbusa wordmark now opens the rules with mouse or Enter; separate How to
  play button removed. Active-player scoreboard highlighting retained.
- Chrome checked combined movement and tray Undo, count-area bear-off and
  die choice, reset cancellation/confirmation, compact opening message,
  automatic next-player roll and Dark highlight. No console errors observed.
- At 667×375, tray target heights were 44 px with no overlap and the opening
  message remained in view. At 844×390, tray controls were inside the viewport.
  Portrait retains the scoreboard, rotate prompt and wordmark rules access.
- All 36 automated tests passed; Svelte checking reported zero errors/warnings.
  Production build and offline fixture/cache checks passed.
- Real iPhone/Safari checks and repeated network-offline UI testing remain pending.
- GitHub CI passed for deployed commit
  `a950dc5279993314eb67dc8398d3634a2460fc1a`.
- Public version 7 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6aceb36c24908191b25e474621c31aae`.
- Hosted Chrome verified the 24-unit wall, wordmark rules access, tray placement,
  Light highlight and fresh real dice 5,4. Combined 24→15 move, tray Undo, and
  Reset cancellation passed with no console errors.
- Cached update activated after closing the old client; local server stopped.
  Public app left open. Screenshot: `/private/tmp/mahbusa-original-board.jpg`.

## Unframed board and compact opening — October 13, 2026

- Removed the gray frame and mapped the playing field, wall, points and right
  tray into its former footprint. Checker positions scale with the layout;
  circular checker geometry is preserved. Relative narrow-wall proportions remain.
- Opening card has no waiting button slot. Start game expands downward only:
  desktop height grows 212→268 px (+56), compact 120→172 px (+52), with identical
  top/dice coordinates before and after the winner is decided.
- Reset confirmation background verified as rgb(179,58,50); cancellation and
  confirmation behavior remain unchanged.
- Restored original vertical counter arrangement with larger color discs,
  center divider and numbers above Dark/below Light. Compact spacing avoids
  Undo/Reset icons. Bear-off changed Light count 13→14; Undo restored 13.
- Chrome checked combined movement, tray Undo, reset cancellation/confirmation,
  both landscape sizes, portrait prompt, wall alignment and round checker bounds.
  At 844×390, checker width/height both measured 35.869 px. Console errors: none.
- Actual iPhone/Safari and repeated network-offline UI testing remain pending.
- All 36 tests, Svelte checking (zero errors/warnings), production build and
  offline fixture/cache checks passed. GitHub CI passed for deployed commit
  `bab1d1d9b959dd7a966da3b29f4145a259dd8fd9`.
- Public version 8 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6aceb7baf2188191a8e445ae2b64b677`.
- Hosted Chrome verified no frame, red confirmation, no opening button slot,
  real tie/reroll and downward-only expansion with unchanged dice coordinates.
  Restored counter discs/numbers/divider are present; no console errors observed.
- Updated app cache activated after old client closure. Local server stopped;
  public app left open. Screenshot: `/private/tmp/mahbusa-unframed-board.jpg`.

## Board-height alignment — October 13, 2026

- Extended colored point bases to the center wall's top and bottom edges and
  matched the right-hand bar and its overlay to the same height. Expanded point
  hit regions accordingly; checkers, narrow wall width and dice placement retained.
- Chrome measured zero top/bottom differences between playing surface, wall,
  bar and outer point bases at 1200×900, 667×375 and 844×390.
- Combined 2+4 movement and tray Undo passed; no console errors observed.
- Svelte checking reported zero errors and warnings. Actual iPhone/Safari and
  repeated network-offline UI tests remain pending.
- Production build and offline packaging passed. GitHub CI passed for deployed
  commit `674c58b4a8f85549f7792dbbd47c2f35c55ab22d`.
- Public version 9 deployed successfully at
  https://mahbusa.bubblyspice4.chatgpt.site; deployment
  `appgdep_6aceb97d2a748191870de40a497f6d33`.
- An existing hosted tab had a user game in progress and held the old service
  worker active. Preserved that game; hosted new-version browser validation is
  deferred until the user closes the old client.
- A fresh production preview on port 4181 verified matching edges, opening
  rolls and fresh gameplay dice with no console errors. Temporary preview
  servers/tabs stopped. Screenshot: `/private/tmp/mahbusa-matching-heights.jpg`.

## Viewport board and tray End turn — October 13, 2026

- Removed the completed-turn center card. A subtle 44 px End turn arrow replaces
  the divider between the right-bar counters only when no legal moves remain.
  Undo hides the arrow and restores moves; blocked turns still require a tap.
- The board fills viewport height below the header and keeps a 12 px bottom
  margin plus the bottom safe area. The SVG coordinate height adapts without
  stretching checker circles; stacks start 3 SVG units inside the walls.
- Production Chrome measured board heights 299 px at 667×375, 314 px at 844×390,
  244 px at 844×320 and 792 px at 1200×900. At 844×390 checker width/height both
  measured 35.869 px, with edges about 2.86 px inside the playing surface.
- End turn, Undo and Reset remain separate 44 px targets, clear of counts at the
  short 844×320 size. Wordmark computed color is rgb(38,44,40) in portrait and
  landscape; explicit appearance/text color overrides native iOS button styling.
- Combined moves, single Undo, automatic opponent dice, blocked double handover,
  portrait rotation/state preservation, rules keyboard access and red reset passed.
  Opening card expands 52 px downward with its top fixed in production Chrome.
- All 36 tests passed; Svelte checking has zero errors/warnings; production build
  and offline packaging passed. Chrome console errors: none. Actual iPhone/Safari
  testing and repeated network-offline UI testing remain pending.
- GitHub CI passed for deployed commit `154414e7ce34a56494d1b38309f607389f201f8b`.
  Public version 10 deployed successfully; deployment
  `appgdep_6acebf8da1508191829acab424506636`.
- Hosted Chrome initially loaded old cached assets, then activated the update
  after that tab closed. Confirmed 314 px board height at 844×390, dark wordmark,
  separate opening rolls/ties, combined moves and right-bar End turn with no
  center overlay. End turn switched highlight to Light and rolled real dice 5,1.
- No hosted user game was open during this update activation. Temporary local
  servers/tabs stopped; viewport override reset; public app left open. Screenshot:
  `/private/tmp/mahbusa-viewport-board.jpg`.

## Restored board height cap — October 13, 2026

- Restored the maximum height defined by the original 840×462 board proportions.
  Available viewport height remains the smaller bound, keeping phone space useful.
- Production Chrome measured desktop height 600.594 px at 1092 px board width
  (1200×900 viewport), down from 792 px. Phone boards remain 314 px at 844×390
  and 299 px at 667×375; circles retain equal width/height (35.869 px at 844×390).
- Checker-wall alignment, mobile title styling and right-bar End turn retained.
  Svelte checks, production build and offline packaging passed; console errors:
  none. Preview screenshot: `/private/tmp/mahbusa-restored-limit.jpg`.
- GitHub CI passed for `6b0be0c756a99a2801341034abb715503ca64080`.
  Public version 11 deployed successfully; deployment
  `appgdep_6acec1115be48191b440bc394cf6efcc`. Existing hosted game preserved;
  its cached assets will update after old app clients close.

## Start page and single-player placeholder — October 14, 2026

- Fresh visits show Single player and Multiplayer. Single player opens only
  In development and Back; Multiplayer opens the existing welcome/Start round.
  Main content receives focus on navigation; scoreboard is game-only.
- Home/placeholder work in portrait and landscape. Chrome checked 390×844,
  667×375 and desktop 1200×900: no portrait rotation prompt on menus, no
  horizontal overflow, and game height remains 299 px compact / 600.594 px desktop.
- Keyboard entry/Back, separate opening rolls, fresh dice, combined 2+4 moves,
  Undo, reset cancellation and Back to start passed. A scored 2–0 game returned
  home and reentered as a fresh 0–0 welcome. No engine rules were changed.
- All 36 existing tests passed; Svelte check reported zero errors/warnings;
  production build and asset-only offline packaging passed.
- Production cache was installed, then the local preview server was stopped.
  Reload, Single player → Back → Multiplayer, and Start round still worked
  from cached assets. Development tools absent; Chrome console errors: none.
- Actual iPhone/Safari verification remains pending. Bot work is intentionally
  deferred; this release implements only the roadmap's first checkpoint.
- GitHub CI passed for deployed commit `4c2ac92b32ee922087ef1833ae81b92add29777b`.
  Public version 12 deployed successfully; deployment
  `appgdep_6ad048c1cc188191a4389476895c4eb6`.
- Hosted Chrome activated the update after closing its old cached client.
  Verified both modes, placeholder Back, multiplayer welcome/zero scores, and
  confirmed Back to start. No console errors. Screenshot:
  `/private/tmp/mahbusa-start-page.jpg`. Temporary servers/tabs stopped;
  viewport override reset and public start page left open.

## Bot foundation: contracts and complete turns — October 15, 2026

- Roadmap checkpoints 2–3 add versioned bot interfaces and literal fixtures,
  plus generateTurns(position/active/remaining). Public Single player remains
  In development. No evaluator, model, RNG or UI integration is enabled.
- Generation shares memoized legal-move analysis and the existing private
  transition. It explores different checkers, merges equivalent complete
  positions/dice/outcomes, stops on wins, returns blocked passes, and owns its
  output data. Scores, turn handover and UI history remain caller responsibilities.
- Tests were first run against a missing generator and an empty-result stub;
  actual expected-state assertions failed before implementation. An oracle
  comparison initially exposed object-property-order sensitivity in the test
  serializer; comparison now uses board values in a fixed structural order.
- Added 44 tests, including checked-public-rules exhaustive oracle comparisons,
  all 21 rolls on a small contact board for both colors, multi-checker play,
  partial doubles, pins/releases, immediate mother/bear-off wins, forced usage,
  invalid dice/player, deterministic output and non-aliasing.
- Full verification: 46 Vitest + 34 Node tests passed (80 total), Svelte check
  zero errors/warnings, production build and offline packaging passed.
- Complete spread-board double-1 generation returned 1,157 final positions in
  approximately 59–74 ms locally. This is a fixture measurement, not a worst-case
  device guarantee or a full search benchmark.
- Independent read-only review found no Critical, Important or Minor defects
  and independently reran all 80 tests and type checks. Review assumes valid
  in-progress engine positions per API contract. Untrusted editor/worker input
  validation, evaluator quality, model loading and device deadlines are later work.
- No frontend source/layout changes. The shared legality helper was extracted
  without changing its rules. Existing test-only biased seeded dice sampling is
  documented for replacement before simulation/training; production dice unchanged.

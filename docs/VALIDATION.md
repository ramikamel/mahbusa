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
- Fresh independent whole-branch review found no Critical, Important or Minor
  findings. It ran all 21 new Vitest tests, 32 Node engine/CLI tests, and the
  actual CLI tests on the exact Node22.18.0 minimum successfully.
- Review scope: the random control does not establish expert strength; policies
  are trusted local executable code (hostile/nonterminating code can hang the
  runner); device/search/worker deadlines remain later work; the long batch was
  run once by the coordinator (timings are machine-dependent), while the reviewer
  independently checked bounded reproducibility and runtime behavior.

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

## Automatic self-play replaces the expert lab — October 16, 2026

- Removed the development lab entry/editor/annotation import-export workflow and
  its unused Board editing prop. Local exports remain untouched. Chrome extension
  verified even `?lab=1` opens the normal home, Single player remains In development,
  Multiplayer/opening rolls/Start game still work, and console warnings/errors
  are absent. Public game layout and rules are unchanged.
- Simulation exposes owned pre-roll position/active/score only, before initial
  dice, after handovers, and after winner-started game resets. Regression tests
  preserve pre-change dice/trace hashes and prove observer mutation isolation.
  Completed rounds label each active perspective from the final round winner;
  cutoffs supply no targets. This generates data, not trained weights.
- Streaming CLI/default mirror behavior were implemented after observed failing
  tests. CLI integration tests cover real Node imports, metadata/targets/checksum,
  cutoffs, exclusive output directory, invalid options and an injected partial
  write failure. Failed runs hash actual partial bytes and cannot appear complete.
- Verified 114 Vitest + 42 Node tests (156 total), Svelte check zero errors/warnings,
  production build and offline packaging. Retired lab tests were removed with
  the feature; their deletion accounts for the lower total than the prior release.
- Diagnostic data run at clean source `fd8068c549a68f4c9445b4d73d883ad5b517fd11`:
  seed `automatic-self-play-2026-10-16`, 100/100 completed rounds, zero cutoffs,
  28,917 positions (14,497 targets +1 / 14,420 targets -1), 300 games and 1,681
  passes. Color round wins Light43/Dark57. Every target, pre-roll score, schema,
  checker count and checksum was inspected. JSONL: 20,403,572 bytes; SHA-256
  `f5218e0bcc2a8066732e37286d36eaebde0f64b00b7b4b8f1554e4dcdf6e2e69`.
  Local path `.local/automatic-self-play-2026-10-16/`. Wall time about25s while the
  mirror benchmark ran concurrently; timings are machine/load specific.
- Mirror diagnostic at that same clean source: seed `automatic-mirror-2026-10-16`,
  100 color-swapped pairs / 200 completed rounds, zero cutoffs, 56,780 turns,
  576 games and 3,566 passes. Entrant rounds100–100, points427–427, mother losses
  16–16. Both legs had identical traces/dice with complementary entrant winners.
  Paired score50% is expected by construction and is not strength improvement.
  Wall time44.9s; report `.local/automatic-mirror-2026-10-16.json`.
- Roadmap now requires automatic outcome learning, opponent pools, held-out round
  seeds/positions and frozen-version matches. No user annotations or expert-review
  gate remain. Dice-aware search, workers, actual model training/export/parity and
  device/offline model qualification remain; public Single player stays deferred.
- Fresh independent whole-branch review found no Critical, Important or Minor
  issues and no behaviors set aside. Reviewer independently passed 21 domain
  simulation/self-play/benchmark tests and all eight CLI integration tests.

## Dice-aware search checkpoint — October 16, 2026

- Added full-width expectimax over all21 weighted roll outcomes, four-move doubles,
  forced passes and score-aware continuations. Extracted the existing ranking
  continuation boundary without changing frozen greedy behavior. Public UI/rules
  and production asset hashes remain unchanged; no browser UI change to validate.
- Search publishes an owned legal baseline and only fully completed depth updates;
  cutoff tests retain the last complete result. Per-call bounded value caches
  include all board/score/active/depth identity. Evaluator/observer mutation tests
  protect search state. Node work is deterministic; wall time is cooperative.
- Tests use an independent36-ordered-roll max/min oracle replaying public rules,
  plus literal -17/18 and -611/648 pin/pass race values for both colors. Checked
  game score/reset perspective, different awards on identical next-game boards,
  invalid controls/values and actual Node CLI search selection/provenance.
- Node integration exposed unsupported TS constructor parameter properties;
  explicit fields fixed the actual runtime failure. An observed convex average
  -1.0000000000000002 gained a failing bound regression, then a numeric clamp.
- Clean measured source `5a0f4ef89cea92f33dfad2cb6eabe22f2b722ee4`, Node26.11.1.
  Local profiles ran while pilot/data generation also used CPU. Under4000ms,
  maxDepth2/maxNodes1000000: opening depth2 in814ms; pin contact depth2 in592ms;
  174-candidate spread-double depth1 in4002ms (time stop; about1.6ms overshoot);
  bearoff depth2 in163ms. These are fixtures, not worst cases or iPhone promises.
  Atomic generation/evaluation and mandatory root ranking may exceed the budget;
  the worker hard watchdog is still pending.
- The deterministic depth1/1000-node reference finished depth1 in opening/contact/
  bearoff (about7/11/3ms). Spread doubles exhausted1000 nodes at depth0 (55ms),
  correctly retaining greedy. All four profiled choices matched greedy; timing
  and completed depth alone do not show stronger play. Profile/script retained
  under `.local/dice-search-profile-2026-10-16.json` and `.local/profile-search.mjs`.
- Automatic pilot seed `dice-search-pilot-2026-10-16`,8pairs/16 complete rounds:
  search11–greedy5, points37–24, mother losses0–4;3825 turns,40 games,208 passes,
  no cutoffs. Paired score68.75%, conservative95% interval[20.73%,100%]. This
  includes50% and cannot support promotion. Search used about88.3s decision time
  versus1.0s greedy; budgets were unequal. Wall90.1s, maximum decision283ms.
  Report `.local/dice-search-pilot-2026-10-16.json`, frozen search policy ID
  `expectimax-v1/strategy-v1/d1/n1000/c10000` versus `strategy-v1-greedy`.
- Explicit search self-play seed `dice-search-data-2026-10-16`:2/2 complete rounds,
  867 automatically labelled positions (434 +1/433 -1),8 games, no cutoffs. Checked
  every target/state schema, actual policy IDs and file integrity. JSONL611928bytes,
  SHA-256 `4b601e2a62eaa3124cde43caa1c3a03caaafeb65afd71a7a824df284665d399d`.
  Data remains local/ignored and is not a trained model or qualified training batch.
- Roadmap checkpoint7 is implemented. Next is worker/controller progress, hard
  watchdog, cancellation and stale-reply protection, followed by actual learning
  and automated qualification. Single player remains In development.
- Final verification:151 Vitest+44 Node tests (195 total), Svelte checking0errors/
  0warnings, production build/offline packaging passed. Fresh whole-branch review
  found no Critical, Important or Minor issues; independently reran the full suite
  and checking plus48 cached/uncached public-engine oracle comparisons across
  colors/scores/doubles, and an in-evaluation deadline interruption probe.
- Review scope decisions: worker lifecycle/watchdog checks remain checkpoint8
  before UI integration; learned strength remains later automatic qualification;
  strict device latency requires a worker plus phone measurements; this internal
  API expects valid engine positions and trusted synchronous evaluators. Current
  contracts and disabled public bot make these deliberate boundaries, not claims
  of tested cancellation, trained strength or hard execution limits.

## Search worker/controller checkpoint — October16,2026

- Browser-safe checked replay was extracted from Node simulation; existing export
  and deterministic seeded hashes remain intact. Full state validation rejects
  malformed counts/tops/pins/dice/scores and terminal states at the worker boundary.
  Proposals are replayed through public rules, including complete blocked passes.
- Added native module worker, correlated progress/complete/errors and lazy
  per-search controller. Default4000ms search/4500ms watchdog, with request ID,
  board revision, evaluator ID and worker-generation checks. Every settlement
  clears handlers/timer and terminates its worker; watchdog fallback uses only
  previously received checked progress. No progress produces error without a move.
-20 lifecycle tests cover lazy startup, owned states/updates/results, stale and
  captured old callbacks, invalid/partial metadata/stats, monotonic depth,
  cancellation/replacement/disposal, factory/post/runtime/decode/observer failures,
  retry and callback reentrancy.10 boundary/runtime tests cover actual search and
  replay, both colors, doubles/pins/bearoff/blocked turns, missing models and bad
  inputs. Tests ran RED before implementation; malformed array event regression
  also ran RED before its guard. Type checking reports0errors/0warnings.
- Built real worker/controller into a separate test graph with Vite, no Node
  runtime/externalization. Emitted search worker11.17kB, test entry12.15kB and
  isolated deliberate-fault worker3.04kB (uncompressed). CI now verifies this
  bundle. None of those files enter the public app shell.
- Chrome extension verified the **built** test page on127.0.0.1:4175. All six
  checks passed: native completion/progress with live heartbeat, cancel/reset and
  fresh revision, watchdog with checked fallback, watchdog without a fabricated
  move then retry, native crash/retry, disposal preventing further work.
  Real spread-double search completed in4031ms with2progress updates and55
  heartbeat ticks; Ping interface was clicked successfully while it was thinking.
  This is desktop Chrome evidence, not iPhone or background timing qualification.
  Browser console errors/warnings:none, including handled deliberate crash.
- No public UI, rules, login, storage or training changes. Public Single player
  remains In development. Roadmap checkpoint8 complete; next is model encoding,
  local learning/export and cross-language inference parity, then qualification.
- Full verification:181 Vitest+44 Node tests (225 total), zero Svelte errors or
  warnings, public production/offline build passed. Public JS/CSS hashes and
  offline version `ef3756aba643a909` match the prior checkpoint. Separate worker
  smoke build also passed and is included in GitHub CI.
- October17 final review resumed after an interrupted reviewer turn. Independent
  review reran the full225 tests/type checks and a separate native worker build,
  and exercised observer replacement followed by an exception. It found a sparse
  array validation gap: array iteration skipped missing score/dice slots. This
  was treated as a correctness issue and fixed with failing worker/controller
  regressions before the fix; explicit slot/dense dice validation now rejects
  those states before search/fallback. Final227 tests (183 Vitest+44 Node), type
  checks and both build paths pass. No review findings remain deferred.
- Review scope remains explicit: app caller revision/cancellation wiring is
  checkpoint12; learned quality/parity/promotion is later model work; public
  offline worker/model assets and actual iPhone/Safari/background scheduling are
  checkpoint13. Public bot remains disabled, so these are not enablement claims.
- October17 rebuilt Chrome smoke also passed6/6 after the validation fix, using
  native Chrome controls because the extension connection was unavailable. The
  actual search completed in4011ms with2 progress updates and201 heartbeat ticks;
  the interface ping worked while thinking. Cancellation/reset/retry, both
  watchdog cases, native worker crash/retry and disposal all passed again.

## Local model training checkpoint — October17,2026

- Added the authoritative104-feature, color-canonical pre-roll encoder and a
  browser-safe104/128/128/1 dense evaluator. Pins, counts, borne-off checkers and
  round score are represented; dice/history/future random streams are excluded.
  Literal arithmetic, color reflection, ownership, invalid states, model shape,
  checksum, finite values and overflow have regression coverage.
- Node preparation verifies completed self-play metadata and actual raw-file
  integrity, checks each state/target/round identity, and writes round-separated
  Float32 shards. Labels come from final round winners. Each round contributes
  equal total weight. Python verifies split/count/hash/value/weight contracts
  and consumes exact TS features, without implementing game rules.
- CPU PyTorch learner exports the lowest-validation-BCE checkpoint, including
  comparison with initial weights. Actual small-data integration tests train,
  repeat exact weights/history in the same environment, load exported weights
  through TS, and refuse corrupt data/invalid options/overwrites. An injected
  export failure records failed status and cannot pass the parity gate.
- Real bootstrap source:100 completed strategy-v1-greedy mirror rounds,
  28917 examples, original dataset SHA-256
  `f5218e0bcc2a8066732e37286d36eaebde0f64b00b7b4b8f1554e4dcdf6e2e69`.
  Preparation/training revision `1bf8933071589a2592e42f695f0d20b8e214c7d9`,
  clean source. Split seed `bootstrap-split-2026-10-17` yielded79 training rounds/
  23115 examples and21 validation rounds/5802 examples. Prepared manifest SHA-256
  `f62ad36c8914918b890b32ab684b9bfc203667998454ab503c2a8f80c7710324`.
- Trained20 epochs, seed20261017, batch256, Adam learning rate0.001, one CPU
  thread, torch2.14.1/Python3.14.6/macOS arm64. Best epoch1: train BCE0.5787993,
  validation BCE0.5837003/Brier0.1996981; initial validation BCE0.6932856, constant
  baseline BCE0.6931392. Later epochs overfit (epoch20 validation BCE1.3042101),
  and were correctly discarded. Validation selects the epoch, so these21 rounds
  are tuning evidence, not independent strength qualification.
- Experimental model `bootstrap-v1-92fe043b432e`,120324 weight bytes, SHA-256
  `92fe043b432e4a3699a1c4eabda20fa24ae33528259ca2c9429c6ec1620a87de`.
  All162 Python/TS probes passed; maximum absolute value error
  2.384185791015625e-7 against fixed5e-5 tolerance. The gate checks completed
  training, actual model checksum and schema; artifact metadata cannot relax it.
- Measured training/export region0.6283s, excluding Python imports and data
  preparation. Warm TS prediction microbenchmark:1000 calls in36.785ms on local
  Node26.11.1, excluding position encoding/validation. Neither measurement is a
  phone latency or full search guarantee. Prepared/model directories, reports,
  parity/profile results and environment freeze are preserved in canonical
  `.local/prepared-bootstrap-2026-10-17` and
  `.local/bootstrap-model-2026-10-17`; artifacts remain ignored by Git.
- Full local verification:190 Vitest+53 Node+4 Python tests (247 total), zero
  Svelte errors/warnings, public production/offline and separate worker smoke
  builds passed. Public JS/CSS/offline version remains `ef3756aba643a909`.
  CI includes a small CPU training/repeatability/TS parity job, not long training.
- Checkpoint9 complete and bootstrap portion of10 started. Model policies in
  simulation, resumable opponent-pool learning and fresh-seed strength/tactical
  qualification remain. No model is registered in the worker or public app;
  Single player remains In development. Usage: [local training](BOT_TRAINING.md).
- Fresh independent whole-branch review found no Critical or Important issues;
  independently reran9 Node preparation/parity and4 real Python integration tests.
  One minor is deferred: an unexpected `manifestSha256` field in a source manifest
  can overwrite the computed source-manifest checksum when metadata is spread.
  The standard producer emits no such field; actual dataset bytes, labels,
  split checks and shard checksums remain enforced. A future correction should
  assign the computed field last and add a regression for the extra property.
- Review scope rulings: playing strength, resumable opponent pools and device/
  public enablement remain later checkpoints because this model is experimental
  and unregistered; treating it as ready would risk weak play or untested device
  behavior. Bitwise reproducibility is limited to the same environment; claiming
  identical exports across Torch/platform changes would risk unreproducible runs.
- First remote run rejected the YAML before scheduling jobs: unquoted pip
  `--only-binary=:all:` contained a colon followed by a space. A real YAML parser
  reproduced line31's syntax error before the fix. A folded scalar now preserves
  the command and parses successfully; the corrected workflow is rerun remotely.

## Frozen model opponents and outcome loop — October18,2026

- Added experimental `nn-greedy-v1/<full weight SHA-256>` policy using existing
  depth0 search/continuation, preserving every complete legal turn, handover
  perspective, updated game score/starter, exact round wins and deterministic
  ties. No public worker/model registration or UI change.
- Both Node CLIs resolve models through the parity CLI's extracted shared gate:
  completed training identity, actual owned/checksummed weights, schema and fixed
  prediction tolerance. Reports store consumed weights/model manifest/training
  report/parity-file hashes. Corrupt or incomplete artifacts/stray model flags
  fail before output creation. Disk edits after load cannot change loaded weights.
- Previous deferred checksum-spread minor is fixed: an extra source manifest
  digest can no longer replace the checksum of consumed bytes. Regression ran
  RED with the all-zero override, then GREEN with the computed digest assigned
  after source metadata.
- Fixed diagnostic seed `frozen-model-pilot-2026-10-18`,100 paired color-swapped
  trials/200 first-to-three rounds,2000turn limit, source
  `1a0e3cc99b686da0f86e6dc6fc046f682c673c9f` clean. A: bootstrap weights
  `92fe043b432e4a3699a1c4eabda20fa24ae33528259ca2c9429c6ec1620a87de`;
  B: `strategy-v1-greedy`. All200 completed, no cutoffs. Model2wins vs strategy198,
  points39–739, mother losses134–0,32949turns,431games,1517passes. Model paired
  win rate1%, conservative95% interval[0%,14.581%]. No repeated-look promotion.
  This bootstrap is clearly unsuitable for release despite improved validation
  loss. Strategy remains the stronger development reference; public bot disabled.
- Diagnostic timing: model14.732s total decision time/max29.103ms, strategy33.573s/
  max254.668ms, wall55.299s on local Node26.11.1. Both rank complete turns, but
  evaluation cost differs; this is not equal-runtime, phone or search qualification.
  Local report `.local/frozen-model-pilot-2026-10-18.json`, SHA-256
  `7a4ffde699fb3d5388810574f7550c061c28ae8f622c290bdfa851a3dfae5fe7`.
- Replayed four pilot rounds with matching decision trace hashes and captured
  three actual model moves exposing its own mother with20/70/17 legal safe
  alternatives. Strategy kept two checkers at the starting point in each case.
  Inputs, dice, selected turns and strategy alternatives are saved locally as
  `.local/frozen-model-diagnostics-2026-10-18.json`; these are automatic diagnostic
  fixtures for the next learning/tactical iteration, without manual annotations.
- Model-mirror seed `frozen-model-data-2026-10-18`:20/20 completed rounds,2017
  labelled positions,1414610raw bytes, SHA-256
  `ac63f8dda0a14ddd29fb67c92ce435c9922ae5e7d8a86142f2bfb453d2e3a64a`.
  Prepared with split seed `frozen-model-split-2026-10-18`:17training rounds/1562
  examples and3validation rounds/455examples. Generation/preparation/training
  source `0f8d411e1084d89095c0b1da16edce1835eb5bfa`, clean.
- Second candidate trained from fresh initialization, seed20261018,20epochs,
  batch256/lr0.001, same CPU environment as the bootstrap. Selected epoch9,
  validation BCE0.3976493/Brier0.1279614 versus initial0.6926548 and constant
  baseline0.6931238; train BCE0.4155675. Model
  `bootstrap-v1-fb8ba94e4fbb`, weight SHA-256
  `fb8ba94e4fbb2d5c6f38240ac987805a56ab7484cc80e46cf9a415599db81d5e`.
  All162 parity probes pass, max absolute error2.384185791015625e-7. This proves
  model→outcomes→prepared shards→learner→checked model, not improved play: it
  learned only from a weak model's20 mirror rounds and used validation to select
  the epoch. It is not a resumed run, mixed pool, champion or qualified candidate.
- All experiment artifacts are preserved under canonical `.local/` with their
  frozen-model names; datasets/models remain ignored. Resumable training and
  stronger current/old/strategy pools remain checkpoint10 work. Mother-protection
  regressions and fresh-seed strength tests must gate future promotion.
- Full local verification:195 Vitest+62 Node+4 Python tests (261 total), type
  checking0errors/0warnings, production/offline and worker smoke builds passed.
  Actual CPU-export integration invokes both model CLIs; real Node tests complete
  model mirrors, verify labels and prepare whole-round shards. Public app assets
  and offline version remain `ef3756aba643a909`.
- Fresh independent whole-branch review found no Critical, Important or Minor
  issues. It reran40 focused Vitest,18 Node and4 Python tests, verified the pilot
  report checksum/metrics, loaded actual model-mirror shards in Python, checked
  the candidate's prepared-manifest hash and passed its162 parity probes.
- Scope rulings: optimizer resume and mixed opponent pools remain subsequent
  checkpoint10 work; treating this fresh-initialization mirror loop as resumable
  training would lose optimizer/pool continuity. Competitive strength, phone
  performance and public qualification remain later gates; treating diagnostics
  as release evidence would ship weak play and untested device behavior. This
  work continued the already authorized roadmap without requiring new input.

## Resumable pool learning and tactical diagnostics — October18,2026

- Added complete-epoch numeric snapshots with atomic checksum pointers, separate
  from selected playing exports. Resume restores last model/Adam/Torch/shuffle
  RNG while retaining best weights/history. Identical data/config/environment
  are required. Checked warm starts restore selected weights on new data with
  a fresh optimizer; split ancestry refuses reassigning any old round across
  train/validation. Legacy selected exports remain playable and can be recreated
  with original data/options to obtain continuation metadata.
- Real CPU tests cover split/uninterrupted equality with best-before-last,
  snapshot write failure retaining the previous pointer and exact recovery,
  corrupt/path/environment/config/data refusal, selected-weight warm-start
  metrics, split leakage and safe object loading. The latter ran RED under a
  deliberate unsafe-loader mutation (a temp sentinel was executed), then GREEN
  with weights_only=True restored. Failed/running training may recover a committed
  epoch, but remains unusable by the playing artifact gate.
- Frozen pool config resolves relative model paths before output, hashes actual
  artifacts and snapshot definition, and samples independent per-index weighted
  matchups without consuming dice/action RNG. Source v2 records actual opponents;
  preparation recomputes each expected matchup and refuses forged rows even with
  a recomputed JSONL checksum. Old mirror v1 behavior/hashes remain unchanged.
  Prepared Float32 format remains v1; Python consumes no pool/game rules.
- New check:bot-tactics diagnostic commits the three automatically saved inputs,
  replays real selected turns and checks legal alternatives. Forced exposure and
  immediate game wins are explicit passing exceptions. This reports failures
  without filtering moves or automatically promoting a model.
- Recreated the original100-round bootstrap with the new learner using identical
  seed/options. Selected weight SHA reproduced exactly:
  `92fe043b432e4a3699a1c4eabda20fa24ae33528259ca2c9429c6ec1620a87de`.
  Baseline/generation source `99f24b84bfa35e6135944ea79bf05893b57ceadb`, clean.
- Pool seed `pool-learning-data-2026-10-18`:500/500 completed rounds, no cutoffs,
  112323 outcome examples,79177950bytes, dataset SHA-256
  `8e8c33df6568fa10489d1f1df87897ccb5f41d201dcff8ad546f3a0e88879546`.
  Resolved pool hash
  `2ba245afdebc954583a6505b7d51b4ba3b687444df6437d9fd8be75ffac50ac3`;
  weights2/1/1 yielded257 strategy mirrors,114 strategy/current-fb8ba94e4fbb
  and129 strategy/old-92fe043b432e rounds. Roles identify experimental versions,
  not accepted champions.
- Split seed `pool-learning-split-2026-10-18`:399training rounds/89104examples,
  101validation rounds/23219examples. Prepared/training/pilot source
  `3196b4b56d5f485f523581bf298c811d437a764f`, clean. Warm-start5epochs from the
  recreated baseline, seed20261018,batch256,lr0.001, then resume5more. Separate
  uninterrupted10epoch warm-start run produced identical selected bytes and full
  metric history. Last epoch5 was resumed even though selected best was epoch2.
  Split history carries600 unique rounds across the parent/new batches.
- Selected candidate `bootstrap-v1-699aa9f69861`, SHA-256
  `699aa9f69861d0fd7bebdcc82ba242a2bc1e05738812f2e091f5f2c6dcbd3c8f`.
  Best epoch2/10, validation BCE0.4045413/Brier0.1300263 versus initial0.5675360
  and constant baseline0.6931251; train BCE0.3015023. All162 Python/TS parity
  probes pass, max absolute error5.662441253662109e-7. Validation selects weights
  and is tuning evidence, not untouched strength confirmation.
- Original model passed0/3 mother cases; candidate passed3/3. Fixture SHA
  `7ef32f012462241e39c08a386f68de8262c0fa7dd0db98ebcf111c64dc82834f`.
  This narrow success did not generalize to strong play.
- Fixed pilot `pool-learning-pilot-2026-10-18`,100 color-swapped pairs/200rounds,
  max2000turns, no cutoffs: candidate0wins–strategy200, points23–741, mother
  losses85–0. Paired score0%, conservative95% interval[0%,13.581%],35793turns,
  425games,1451passes. Report SHA-256
  `3dfd4573f00b6425a4d74b4fddb3330406f2681c8de01cf48b3b38655ae71533`.
  Candidate9.558s decision time/max42.033ms, strategy38.451s/max224.078ms,
  wall55.672s. Different evaluation runtimes; not equal-budget or phone testing.
  Previous pilot used different seeds, so lower mother-loss counts do not by
  themselves establish improvement over the bootstrap. Candidate rejected for
  promotion; strategy remains the stronger reference and public bot stays off.
- The continuation/data infrastructure is verified; a small outcome-only network
  still does not provide sound complete-turn ranking. Next learning experiments
  must test strategy-informed ranking/priors or stronger look-ahead, with tactical
  regressions and frozen-opponent comparisons, rather than promote on lower BCE
  or assume more mirror data alone solves move choice. Further TD/orchestration
  and full qualification remain. Dataset-generation recovery is separate future
  work; current --pool starts a new exclusive dataset.
- Additional local diagnostic varied search while keeping the candidate frozen:
  depth1/1000nodes against strategy,4pairs/8completed rounds, seed
  `pool-model-search-probe-2026-10-18`. Candidate0–8, points1–30,mother losses4–0;
  535turns retained depth0 and203 completed depth1. Decision time49.587s vs1.636s,
  wall51.560s. This tiny unequal-runtime probe is not qualification and does not
  prove a larger search budget would fix the learned evaluator. Script/report
  are local `.local/probe-pool-model-search-2026-10-18.mjs` and
  `.local/pool-model-search-probe-2026-10-18.json`.
- Fresh independent review reran10 Node and7 Python continuation tests and
  independently checked real5+5/full10 equality, selected epoch2 and600 ancestry
  entries. It found one Important resume gap: missing Adam entries or reset step
  counters could pass checksum validation and silently restart optimizer state.
  A new regression reproduced missing-state acceptance before the fix. Resume
  now requires exact parameter coverage/configuration, finite matching moment
  shapes/dtypes, nonnegative second moments, and scalar counters matching the
  completed epoch/minibatch count before output creation. The regression rejects
  empty/partial state, reset/wrong/nonscalar counters and negative variance.
- Review scope rulings: these are local integrity checks rather than authenticated
  provenance (wholesale rewriting of hashes and artifacts can fabricate history);
  atomic process recovery does not promise fsync/power-loss durability (unflushed
  epochs may be lost); warm starts require frozen artifact directories rather
  than adversarial concurrent rewriting (mutation may invalidate the load or its
  metadata). Competitive strength, phone behavior and public enablement remain
  later gates; treating this rejected candidate as qualified would release weak,
  untested play. No review minors were deferred.
- Post-review fix verification: all280 tests, type checking and both build paths
  passed, including intact split/uninterrupted equality and all six malformed
  Adam variants. No learning weights or recorded experiment outcomes changed.
- Full local verification:196 Vitest+72 Node+12 Python tests (280 total), zero
  type errors/warnings, public/offline and worker smoke builds pass. Actual pool
  data reaches the CPU warm-start learner in CI integration. Public bundle and
  offline version remain `ef3756aba643a909`. Ignored artifacts use
  `.local/pool-learning-*` names and are preserved in the canonical checkout.


## October 19, 2026 — Strategy-value distillation

- Frozen implementation/source `396756e67a8c2b277e6fa5f7f05b1cc8a99b3ea2`, clean. Prepared the
  existing500-round frozen-pool dataset with the same round split and16 evenly
  spaced independent-roll roots per round. All source states/outcomes/checksums
  are checked before substitution with teacher afterstates; no manual labels.
- Prepared version2 manifest SHA `54ef3fa5c949aea976ef546fe3658a09cf781ed631d69f7132af4f712b85ef97`.
  Training399 rounds/156376 afterstates,
  validation101 rounds/37147 afterstates.
  Train shard SHA `2b961d96964450ae33de0919c8661b669284e9abf79bb6126d583231da1c10ac`;
  validation shard SHA `09774b1bf674fa606ff0e77eed5a230a2b0f84261d792d68d99a9edcc20e9938`.
  Validation1616roots SHA `24302e107da396d270325eea0ddcdb5a0c393daedc77a6b6882076197fd591a3`.
  Prepared bytes remain104features+target+weight; equal total weight per round.
- Fresh CPU1thread20epochs, seed20261019, batch256/lr0.001; selected epoch
  20, elapsed4.602s. Candidate `bootstrap-v1-4a1729641fe4`,
  full weights SHA `4a1729641fe4c4d193399333ff3ef31d3e09d90098178b5e8e828f70c01f475b`. Selected validation soft BCE
  0.380118638, squared teacher-target error
  0.005681937; initial BCE
  0.692090154. These are heuristic imitation errors,
  not round-win calibration. Resume/warm starts and split ancestry remain checked.
- All162 TS/Python parity probes pass, max absolute error
  8.94069671631e-07, fixed tolerance5e-5.
  Manifest/report identify heuristic output; legacy outcome models still load.
  All3 saved mother cases pass. No public registry/worker enablement.
- Actual policy replay on1616held-out roots/101rounds, including1271multi-choice
  turns and89exact-win turns. Prior699aa vs distilled4a172:
  all-turn agreement 662/1616 (40.9653%) ->
  732/1616 (45.2970%); multi-choice agreement
  317/1271 (24.9410%) ->
  387/1271 (30.4485%); mean teacher regret
  0.041601044 -> 0.012857637, maximum
  1.826380933 -> 0.989165178; avoidable mother
  exposures 33 -> 0.
  Ties count as agreement; forced/single-choice turns can inflate the all-turn
  metric. Validation selected the checkpoint and is not a strength holdout.
- Fixed pilot seed `teacher-strategy-pilot-2026-10-19`,100color-swapped pairs/200completed
  rounds,max2000,no cutoffs. NN/strategy rounds won[3, 197],
  points[47, 713],mother losses[65, 1],
  paired score1.50%, conservative95% interval
  [0.000%,15.081%].
  40323turns/450games/1753passes,
  decision ms[10495.216112999628, 36830.039718999855],
  max decision ms[78.32724999999482, 200.39329099999986],wall55.526s.
  Ranking ran concurrently at the start; local clocks are diagnostic, not device
  timing qualification. Pilot report SHA `b735dfb145f27e674880c1d736691ed3bfda16b747e704af924254a3ac366966`.
- **Rejected promotion:** imitation on held-out roots improved but playing
  strength remains far below strategy. Different match seeds from the previous
  0/200 pilot do not establish a controlled strength improvement. Zero mother
  exposures on this holdout did not prevent65mother losses in actual play.
  Next: collect teacher corrections on the candidate's own encountered positions
  and train explicit best-turn preferences; test on fresh seeds. Do not select
  a public model from lower pointwise loss or this tuning holdout.
- Validation:196Vitest+81Node+14Python tests (291 total), Svelte0errors/0warnings,
  public/offline and worker smoke builds. Real teacher preparation feeds the CPU
  learner, heuristic export, checked held-out ranking and exact continuation.
  Rehashed root/target mismatch, train-split roots and mismatched value semantics
  are refused. Public/offline version stays `ef3756aba643a909`.
- Artifacts remain ignored under `.local/teacher-*`, including source/shard/model
  manifests, epoch states, parity, tactical/ranking/pilot results. Public behavior
  is unchanged. Review was a local author pass; no independent reviewer this
  checkpoint. No deferred code findings.


## October 19, 2026 — Played-turn corrections and explicit ranking

- Frozen source `8a49d8d3a609f362ba22898f0b12d78fc98db42e`, clean. Opt-in sourcev3/roundv2
  captures actual rolled inputs before each policy choice; recording preserves
  dice/action streams and outcomes and owns observer data. The500-round pool
  uses frozen4a172/strategy and strategy/frozen4a172 (weights2/2) plus strategy
  mirrors(weight1). Seed `corrective-played-data-2026-10-19`, max2000turns;
  all500complete, no cutoffs,108573pre-roll/rolled observations. Source SHA
  `43ec0fd1ad3858abcab6c0aa7923a1bff0827e0b4cb3f5ab4181a339681d101c`, bytes152460636.
- Preparation uses `corrective-played-split-2026-10-19`,16evenly spaced **actual
  played rolls** per round. Preparedv3 has412training rounds/167176afterstates,
  88validation rounds/37053afterstates and1408validation roots. Manifest SHA
  `9c4a0e5eda0ea75398fd30271754528bdb79fe4bd9def8d956a468ca4604ecc0`;
  train SHA `b50b0e5f2209eaa43cf9b7465bf89021e7f6d1147c666fa7cb3f39f5f9eb649f`,
  validation SHA `faae5e44da8a1a954f1cace3d83a43a28db91571220185512ec8b25756eb8ef3`.
  Preferences151116train/33543validation; pair SHAs
  `d175c525f2bb7e97d2576fad62e6f0a6c76ca25edc6543d9536d488b67ec395b` /
  `acabbd305e0d238f1c0df7976fbfbc420fc41679c2af9def23751bd9d8ee6511`.
- Each turn's signs return continuation values to the chooser. Best-vs-worse
  pairs use Float32 teacher targets, exclude ties(gap<=1e-7) and roots with exact
  round wins, and keep indices inside their complete-turn/round/split. Python
  reconstructs expected pair bytes from groups/targets/round weights. A deliberate
  mutation disabling that reconstruction check made corruption regressions fail;
  restored checks pass. Node additionally regenerates legal validation groups.
- Matched local CPU controls warm-start from selected4a172 weights: same data,
  seed20261019,batch256,lr0.001,20epochs; weight0(pointwise) vs1(ranked). Pair
  shuffle uses its own seeded/restored RNG; pointwise minibatches stay matched.
  Config/metric/RNG corruption is refused before output. Exact1+1vs2 retains
  last weights/RNG/history with selected best before last; injected failed epoch3
  preserves epoch2 and recovers exact full3 state. Zero-weight paired data gives
  identical weights to legacy pointwise learning on identical examples.
- control: `bootstrap-v1-050016c17e31`, SHA
  `050016c17e31371605e5d194bc36820b3d44ffbfe3cacc48afc219ba075ebc1b`, selected epoch20/20;
  validation BCE0.282721877, ranking loss0.267874360,
  pair accuracy83.6240%, objective0.282721877;
  elapsed5.496s. Split ancestry1000rounds. All162 parity
  probes pass, fixed5e-5 tolerance; all3 saved mother cases pass.
- ranked: `bootstrap-v1-ad76d11802bd`, SHA
  `ad76d11802bd48e1f9d11735710f0caab50cd47ffebf3ea975c6d8e8539743ad`, selected epoch4/20;
  validation BCE0.331815928, ranking loss0.076354496,
  pair accuracy93.2415%, objective0.408170424;
  elapsed9.620s. Split ancestry1000rounds. All162 parity
  probes pass, fixed5e-5 tolerance; all3 saved mother cases pass.
- Held-out policy replay on1408roots/88rounds (1102multi-choice turns):

  | Model | Multi-choice agreement | Mean teacher regret | Avoidable mother exposure |
  | --- | ---: | ---: | ---: |
  | parent | 34.3920% | 0.008587290 | 0 |
  | control | 36.7514% | 0.006522493 | 0 |
  | ranked | 48.0944% | 0.003543851 | 0 |

  These roots are checkpoint-selection holdouts, not untouched strength tests.
  Higher pair accuracy and lower mean regret did not qualify actual play.
- control fixed pilot: seed`corrective-control-pilot-2026-10-19`,100color-swapped
  pairs/200completed rounds,max2000,no cutoffs. NN/strategy rounds won
  [8, 192],points[74, 700],mother losses[53, 4],
  score4.00%,95% paired interval
  [0.000%,17.581%];43573turns,
  465games,2425passes. Decision ms[17652.63062500024, 31858.45144400046],
  max ms[114.65079100000003, 143.40129199999865],wall57.806s.
  Report SHA `0a287afe485ff277ca8ef3de2acaf072a66f1a95a87c77f155e3ea379e27a156`.
- ranked fixed pilot: seed`corrective-control-pilot-2026-10-19`,100color-swapped
  pairs/200completed rounds,max2000,no cutoffs. NN/strategy rounds won
  [10, 190],points[104, 676],mother losses[34, 2],
  score5.00%,95% paired interval
  [0.000%,18.581%];46827turns,
  491games,2378passes. Decision ms[19636.395999999608, 27500.769439999156],
  max ms[70.25849999999991, 102.16733299999987],wall55.281s.
  Report SHA `c9e87ccf36d2efd863c3a9f2b605e6c53d3c143669cd0b95da7ec16c7dc0cab8`.
- Common-seed ranked-minus-control round score difference1.00%; fixed100pair
  Hoeffding95% interval[-26.162%,28.162%],
  with each color-averaged difference bounded[-1,1]. No optional stopping or
  weight tuning followed the matches. Comparison remains inconclusive. Models
  and ranking diagnostics ran concurrently; clocks are local diagnostics, not
  equal-runtime/device qualification.
- **Rejected both for promotion.** Preference training improved held-out choice
  agreement48.1%vs36.8% and recorded fewer mother losses34vs53, but10vs8round
  wins/200 does not establish stronger play. Both remain far below strategy.
  Previous-parent3/200 used a different seed, so it is not a controlled strength
  comparison. The reliable strategy evaluator remains the reference; next work
  should evaluate strategy-guided search and diagnose concrete multi-turn losses
  before simply adding more imitation batches. Public bot/registry/UI stay disabled.
- Full local verification:197Vitest+85Node+20CPU Python tests (302 total), zero
  Svelte errors/warnings, unchanged public/offline version`ef3756aba643a909` and
  worker smoke build. No paid compute, new dependencies, human labels or Python
  game rules. All source/shards/models/reports are ignored `.local/corrective-*`.
- One fresh independent whole-branch review found no Critical/Important/Minor
  issues. It independently ran24Node+20Python tests, validated all500recorded
  rounds/108573turns (17878doubles), regenerated1408held-out roots, checked actual
  204229examples/184659pairs and89canonical artifact copies, and checked model/
  pilot hashes against this record. Three additional random-policy observer
  mutations preserved traces. Reviewer did not independently rerun full Vitest/
  type/build guards; those passed in the implementation verification. No fixes
  or minor deferrals were needed.
- Recorded decisions: an independent pair RNG keeps pointwise controls matched
  (cost: another checkpoint state); final review follows task completion to avoid
  a circular review gate (ordering only). Review scope: frozen local integrity
  checks do not authenticate coordinated rewrites of artifacts/metadata; device/
  public qualification remains later work because both candidates are rejected;
  the next search/training choice remains provisional and may need more research.

### October 19–20: frozen strategy-search investigation

- Protocol committed before execution at clean source
  `57065dc41a6702572d079ccfd2c75d8e01ce989e`, Node26.11.1. Existing depth1/
  1000-node/cache10000 strategy search versus greedy strategy, fixed100pairs,
  seed`strategy-search-control-2026-10-19`, max2000turns. No rule, evaluator,
  search-control, dependency or public app changes. An instrumented24-turn
  replay matched the plain search policy's full trace and dice hashes.
- All200rounds completed, zero cutoffs: search107–greedy93, points442–404,
  mother losses15–25;55467turns,564games,3503passes. Score53.5%, paired95%
  Hoeffding interval[39.91898484259381%,67.0810151574062%]. Inconclusive and
  unequal compute; no promotion. Decision time1246.047s versus18.806s,
  maximum362.762ms versus82.639ms; wall1274.621s. These local instrumentation
  clocks do not qualify device latency.
- Search changed439/27739moves (1.58%):18400node stops,9232completed depth1,
  107immediate round wins.5842turns had one legal complete result; among21897
  turns with alternatives,4464 (20.39%) completed lookahead. Wide roots usually
  retained greedy. There were20432025uncached visits and3355887cache hits;
  exact raw counters are retained in the checked summary.
- Prespecified48development roots from the first12corrective source rounds:
  1000nodes completed23,20000completed45; changed moves8versus11. No time
  stops at4000ms. Larger-budget median/p95/max56.008/878.905/1100.287ms, on
  this local sample only. Three additional changed choices are not strength
  evidence. Original source dataset SHA remains
  `43ec0fd1ad3858abcab6c0aa7923a1bff0827e0b4cb3f5ab4181a339681d101c`.
- First three rounds with search mother losses replayed to identical original
  trace/dice hashes. All legal alternatives on the exposing turn left the
  mother alone (3/3,1/1,1/1). Exploratory game histories show the earlier turns;
  this does not prove those losses were inevitable or identify a winning fix.
  A separate12-root CPU profile identified copying, engine keys and generation
  as concrete targets; its small local sample includes startup/GC.
- Local report SHA-256: benchmark
  `9b7570ee20a63059bd85384bf9733324e26502b23d4893c7679008be2fa448d4`,
  profile`afca8dcd87e79eda66bfe03a6356f1ba6a8e9d699e0a436f88c4938dac217978`,
  diagnosis`6c039ec720f696c031ce0bf50df848d41164ab4b20f5c28d8c7d455d96a0bb58`,
  traceback`5a771c2ef6b068fffe7f74a8045c11068acb834ae080a0727a9b7624b6132395`.
  Checked summary reconstructs all paired metrics/counters/profile controls and
  replay links. All25`.local/strategy-search-*` artifacts match in both local
  checkouts. Checksums are integrity checks, not authenticated provenance.
- Full verification on October20:197Vitest+85Node+20CPU Python tests (302),
  Svelte0errors/0warnings, production/offline and worker smoke build passed.
  Public/offline version remains`ef3756aba643a909`. No new UI to browser-test.
- Next tasks and reproducible command are in
  [the investigation](BOT_SEARCH_INVESTIGATION.md): freeze a regression/performance
  corpus, optimize exact generation/copying while retaining mutation isolation,
  then compare frozen budgets on fresh seeds. Further imitation-only neural
  batches are deferred pending a stronger teacher or concrete diagnosed need.
- Independent read-only review confirmed all200round results/pair seeds, exact
  48-root selection, counters/denominators, report/dataset hashes and25matching
  artifact copies. It independently replayed the three diagnosed rounds with
  plain search and regenerated their complete exposing-turn alternatives. No
  Critical/Important findings. One wording clarification was applied: turn169
  is an earlier fallback, while the nearer turn171 completed depth1.
- Review scope: future performance changes still need contract/equivalence
  checks; stronger-play/device qualification is not established; unchanged
  engine/evaluator code was not subjected to a new full independent audit.
  Existing full-suite and independent replay evidence support this research
  record, not future code or public enablement.

### October 20: exact state-key and evaluator-copy optimization

- Froze `tests/fixtures/exact-search-v1.json` before production changes, based
  on `87ac2bd073170796b3367ec9b5b1d2647795d0b7`: 57 roots, 1631 complete turns,
  three mother-loss search histories/82 saved decisions. SHA-256
  `47e3bfa2bded1a12b9ca16648339c70da0684ce1f920994cf689306215230a64`.
  The corpus includes the original 48 development roots, six nearby mother-loss
  decisions and three broad doubles. It is not a strength holdout.
- Regression tests retain complete turn identities/representative ordering,
  greedy choices and depth1 search at1000/20000nodes/cache10000. All plans replay
  through checked rules; six real mother roots also match exhaustive enumeration;
  every saved history decision remains legal. Timings have no CI speed threshold.
- `src/lib/state.ts` uses exact fixed-width identities for valid24-point boards:
  counts/off0..15, topnull/0/1, dice1..6, validated score/active/depth. Tests check
  all768point payloads at each of24locations, all256off pairs, dice multiplicity
  and90score/active/depth combinations. Internal keys are not persisted formats.
- Engine traversal and search caches use these keys. Search evaluator inputs
  retain fully owned point/count/off/score data via schema-specific copies;
  outer request/progress snapshots still use their existing copying. Rules,
  legal choices, strategic weights and search controls are unchanged. The new
  key suite first failed with its helper module absent; the copy case failed
  with its function absent, then passed. Existing hostile evaluator/observer
  mutation tests and frozen counters remained green.
- Sequential clean-source timing, Node26.11.1, one discarded warmup plus three
  complete sweeps per stage, depth1/20000nodes/cache10000/no clock cutoff:
  baseline`2d0d85eb758bfe63a92bcd1ab4752731fbed96f8` median13361.153ms;
  keys`ed74357a376b9c87abf6aa579ab62f463c0cf4f7` median10191.980ms;
  copies`3bec0a4f1312c43d00c930bbb43363dc9e13077a` median6697.566ms.
  Final median49.87%less time/~1.99x throughput on this development corpus.
  All results/counters matched the frozen baseline. Fixed stage order and local
  clocks are not randomized trials, iPhone guarantees or strength evidence.
- Reports remain local in both checkouts. SHA-256 before
  `7ff421d978add243f881ff124ffb1bf48418266e382579b6a6eaf862ce6eca4d`,
  keys`c70de50e215f7e6d37192771a45d6e1d54dae9422498e76a823c43291cc41800`,
  after`14b9d235f5efd0dc144554d23f116447922f300fad8745d29115ed7df71759f0`.
  [Performance usage](BOT_PERFORMANCE.md) records commands and all sweep times.
- Verification:261Vitest+85Node+20CPU Python tests (366), Svelte0errors/0warnings,
  production/offline and worker smoke builds passed. Public cache version
  `f13c630eb2ad2fd9`. Chrome production checks passed separate opening rolls,
  combined6+2move, Undo, turn handover/automatic next dice and reset. All six
  native-worker checks passed, with a successful interface ping during search:
  completion/progress, reset/fresh revision, watchdog fallback, no-progress
  watchdog/retry, worker-error/retry and disposal. These do not replace actual
  iPhone checks. Single player remains in development; next is the fresh-seed
  frozen-budget strength comparison. Forced-turn bypass remains deferred.

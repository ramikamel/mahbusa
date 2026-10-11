# Chrome extension validation

Run `pnpm dev`, open the printed URL with the connected Chrome extension, and
use real controls. After each action, inspect fresh DOM/accessible state. Use
screenshots to check appearance. Do not inject or mutate game state in the browser.
Start fixtures through the development selector or `?scenario=NAME`.

| Scenario | Actions | Expected result |
| --- | --- | --- |
| Fresh round | Start round; set next dice `3,3`; Roll to start; set `6,1`; Reroll tie | Tie remains opening; Light wins contest; Roll dice requires a fresh roll |
| Fresh turn | Set dice `2,3`; Roll dice; select point 24 | Legal targets 22 and 21; End turn disabled |
| Turn / undo | Move 24→22 using 2; Undo; repeat and use 3 | Undo restores board and both dice; after both dice are used End turn enabled; Dark to roll |
| pin-and-release | Select 9; move to 7; try an unhighlighted point; Undo; pin again; move 7→6 | Pin visible; illegal destination does not move; undo removes pin and restores die; final covering checker leaving releases Dark |
| blocked-turn | Inspect controls; End turn | No legal moves; board unchanged; Dark to roll |
| forced-order | Select 6 | Only point 5 highlighted; 6→4 would strand the other die and must not be offered |
| higher-die | Select 6 | Only point 4 highlighted; die 2 required |
| mother-win | Select 2; move to 1 | Immediate +2; Light score 2; Undo disabled; Next game preserves score and Light opens |
| normal-win | Select 1; Bear off; choose Use 1 if offered | +1; Light score 1; game complete |
| double-win | Select 1; Bear off; choose Use 1 if offered | +2 because Dark has none off |
| round-win | Select 1; Bear off; choose Use 1; New round | Score reaches 3; round ends; new round resets scores and starts opening contest |
| ambiguous-bear-off | Select 1; Bear off; choose Use 1; Undo | Die-choice controls appear; chosen value consumed; undo restores dice and board |
| Reset | Reset round; Keep playing; Reset round; confirm | Cancellation preserves game; confirmation clears both scores and restarts opening |
| Rules | How to play; Back to the board | Rules and install instructions visible; modal closes and board preserved |
| Responsive | Test desktop, 844×390 landscape, 390×844 portrait | Landscape playable; portrait rotate prompt and scores; returning to landscape preserves game |
| Refresh | Move, refresh tab | Fresh board and zero scores; no local saved state |

## Production and offline

1. `pnpm build` must reject leaked development controls or fixture strings.
2. `pnpm preview`, open app, then reload after first service worker installation.
3. Verify the development selector and fixed-dice controls are absent.
4. In Chrome DevTools, use Application → Service Workers → Offline. Reload and
   play a turn. Verify Network shows cached app assets and no gameplay requests.
5. Inspect Application storage: only versioned app asset caches, no saved game
   data in Local Storage, Session Storage or IndexedDB.
6. Build a new version while a game is open. An update must not reload or replace
   the running game. After old app tabs are closed, reopen and verify new assets.
7. Check console errors; record screenshots and observable outcomes.

Chrome emulation does not establish Safari/iPhone compatibility. On a physical
 iPhone, test Home Screen installation, standalone launch, airplane-mode launch,
 touch controls, orientation changes and safe-area layout. Measure visible tap
 feedback against the 100 ms target. Record unperformed checks as pending.

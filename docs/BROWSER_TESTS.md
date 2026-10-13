# Chrome extension validation

Run `pnpm dev`, open the printed URL with the connected Chrome extension, and
use real controls. After each action, inspect fresh DOM/accessible state. Use
screenshots to check appearance. Do not inject or mutate game state in the browser.
Start fixtures through the development selector or `?scenario=NAME`.

| Scenario | Actions | Expected result |
| --- | --- | --- |
| Separate opening rolls | Start round; set next dice `6,1`; Dark: roll die; Light: roll die | Dice remain in the same player positions; both roll buttons disabled after Light wins; Start game appears; board not playable yet |
| Opening ties | Start/reset round; set next dice `3,3`; Light: roll die; Dark: roll die; set `2,5`; Dark: reroll; Light: roll die | Tie enables both rerolls and no Start game; Dark reroll clears old Light die; Dark wins and Start game appears |
| Fresh turn | After Light wins contest, set dice `2,3`; Start game; select point 24 | Fresh dice 2,3 on the center wall; legal targets 22, 21 and combined 19; End turn absent while moves remain; no Roll dice button |
| combined-dice | Select 24; tap 18; Undo | Targets 22, 20 and 18 (2, 4 and 6 spaces); one checker moves to 18, both dice consumed; one Undo restores checker and both dice |
| combined-one-route | Select 9; tap 3 | Targets 5 and 3; blocked point 7 forces the 4-then-2 order; both dice consumed |
| combined-blocked | Inspect controls | Both intermediate points blocked; combined destination 3 absent; no moves |
| combined-doubles | Select 24; tap 16 using Enter; Undo | Targets 22, 20, 18 and 16; four steps consumed; one Undo restores all four |
| Turn / undo | Move 24→22 using 2; header Undo; repeat and use 3; set next dice `3,5`; center End turn | Undo restores board and both dice; after both dice are used a center End turn message appears; Dark immediately has wall dice 3,5; Undo disabled |
| pin-and-release | Select 9; move to 7; try an unhighlighted point; Undo; pin again; move 7→6 | Pin visible; illegal destination does not move; undo removes pin and restores die; final covering checker leaving releases Dark |
| blocked-turn | Inspect controls; set next dice `2,4`; End turn | No legal moves; board unchanged; Dark immediately has dice 2,4 |
| blocked-handover | Set next dice `1,1`; End turn | Dark gets four moves from double 1 but all blocked; stays on Dark until explicit End turn |
| forced-order | Select 6 | Points 5 and combined 3 highlighted; 6→4 would strand the other die and must not be offered |
| higher-die | Select 6 | Only point 4 highlighted; die 2 required |
| mother-win | Select 2; move to 1; set next dice `2,4`; Next game | Immediate +2; Light score 2; one Next game button inside result card; clicking preserves score, resets board and rolls 2,4 for Light |
| normal-win | Select 1; Bear off; choose Use 1 if offered | +1; Light score 1; game complete |
| double-win | Select 1; Bear off; choose Use 1 if offered | +2 because Dark has none off |
| round-win | Select 1; Bear off; choose Use 1 if offered; New round via Enter | Score reaches 3; one New round button inside result card; new round resets scores and starts opening contest |
| ambiguous-bear-off | Select 1; Bear off; choose Use 1; Undo | Die-choice controls appear; chosen value consumed; undo restores dice and board |
| Reset | Reset round; Keep playing; Reset round; confirm | Cancellation preserves game; confirmation clears both scores and restarts opening |
| Rules | How to play; Back to the board | Rules and install instructions visible; modal closes and board preserved |
| Board / header | Inspect board and header | No bottom panel, travel captions, footer slogan or First to 3 scoreboard label; no visual point numbers or locks; header holds centered scores and Undo/Reset/How to play; active player highlighted |
| Center messages | Start round; roll each opening die; Start game; finish moves; Undo | Welcome/start, opening dice/buttons, Start game, and End turn are in center messages; contest dice stay fixed; header Undo hides completion message and restores moves |
| Wall dice | During moving phase inspect dice at desktop and both landscape sizes; rotate portrait and back | Dice center matches SVG center-wall center, stays within wall, preserves values and spent states; no ongoing visible turn-status panel |
| Responsive | Test desktop, 844×390 and 667×375 landscape, 390×844 portrait | 52 px desktop/44 px landscape dice; 14 px status and controls; landscape actions in viewport; portrait rotate prompt and centered header scores; orientation preserves game |
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

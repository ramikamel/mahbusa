# Chrome extension validation

Run `pnpm dev`, open the printed URL with the connected Chrome extension, and
use real controls. After each action, inspect fresh DOM/accessible state. Use
screenshots to check appearance. Do not inject or mutate game state in the browser.
Choose Multiplayer before testing the board. Start fixtures through the
development selector or `?scenario=NAME` after entering Multiplayer.

| Scenario | Actions | Expected result |
| --- | --- | --- |
| Start page | Fresh visit; Single player; Back; Multiplayer | Home shows both modes without board/scoreboard; Single player shows In development and Back; Multiplayer opens the original welcome/Start round screen |
| Menu orientation | Inspect home and placeholder at 390×844 portrait and 667×375 landscape | Buttons stay accessible with no horizontal overflow; no rotation prompt or scoreboard; wordmark stays dark |
| Return to start | Play a move; Reset round; Keep playing; reopen Reset; Back to start; Multiplayer | Cancellation preserves game; confirmation text explains board/scores are cleared; leaving returns home; reentering shows fresh welcome and zero scores |
| Menu keyboard / rules | Activate Single player, Back, Multiplayer with Enter; open/close wordmark rules from home | Navigation focuses main content; normal keyboard access works; rules return to the originating screen |
| Separate opening rolls | Start round; set next dice `6,1`; Dark: roll die; Light: roll die | Dice remain in the same player positions; both roll buttons disabled after Light wins; Start game appears; board not playable yet |
| Opening ties | Start/reset round; set next dice `3,3`; Light: roll die; Dark: roll die; set `2,5`; Dark: reroll; Light: roll die | Tie enables both rerolls and no Start game; Dark reroll clears old Light die; Dark wins and Start game appears |
| Fresh turn | After Light wins contest, set dice `2,3`; Start game; select point 24 | Fresh dice 2,3 on the center wall; legal targets 22, 21 and combined 19; End turn absent while moves remain; no Roll dice button |
| combined-dice | Select 24; tap 18; Undo | Targets 22, 20 and 18 (2, 4 and 6 spaces); one checker moves to 18, both dice consumed; one Undo restores checker and both dice |
| combined-one-route | Select 9; tap 3 | Targets 5 and 3; blocked point 7 forces the 4-then-2 order; both dice consumed |
| combined-blocked | Inspect controls | Both intermediate points blocked; combined destination 3 absent; no moves |
| combined-doubles | Select 24; tap 16 using Enter; Undo | Targets 22, 20, 18 and 16; four steps consumed; one Undo restores all four |
| Turn / undo | Move 24→22 using 2; tray Undo; repeat and use 3; set next dice `3,5`; tray End turn | Undo restores board and both dice; after both dice are used a subtle arrow replaces the tray divider, with no center message; Dark immediately has wall dice 3,5 and the scoreboard highlight; Undo disabled |
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
| Rules | Click Mahbusa wordmark (also test Enter); Back to the board | Rules and install instructions visible; modal closes and board preserved; separate How to play button absent |
| Board / header | Inspect board and header | No gray outer frame; enlarged board/tray fill the same footprint and checkers stay circular; narrow wall proportions retained; header has wordmark help and centered scores; active player highlighted; Undo/Reset in right-hand tray |
| Center messages | Start round; roll each opening die; Start game; finish moves; Undo | Welcome/start, opening dice/buttons and Start game are in center messages; contest dice stay fixed; no completion message; tray Undo hides End turn arrow and restores moves |
| Opening expansion | Measure card and dice before/after deciding the starter at desktop and landscape sizes | No empty Start game slot before winner; bottom grows by button/margin height, while card top and dice coordinates remain fixed |
| Reset appearance | Tray Reset; inspect confirmation; Keep playing; Reset and confirm | Confirmation Reset button red; cancellation preserves game; confirmation resets scores and opening |
| Restored counters | Inspect tray, bear off via highlighted tray, Undo | Dark number/disc, divider, Light disc/number restored; count updates and Undo restores it; utility icons stay separate |
| Matching heights | Inspect desktop 1200×900 and landscape 667×375 / 844×390 | Colored point bases, playing surface, center wall and right-hand bar have matching top/bottom edges; movement/Undo remain functional |
| Viewport fill / checker edges | Inspect desktop 1200×900 and landscape 667×375 / 844×390 / 844×320 | Board uses available height up to the original 840×462 proportion cap (600.6 px at 1092 px width); top/bottom checker stacks sit just inside walls; circles remain round; no counts/control overlaps or clipped actions |
| Wordmark color | Inspect portrait 390×844 and landscape phones; open rules | Title remains dark rather than native button blue; rules still open; orientation preserves the game |
| Wall dice / tray | During moving phase inspect dice and tray at desktop and both landscape sizes; rotate portrait and back | Dice center matches original narrow wall and overlays it; tray controls/counts are separate, in view and 44 px targets; values and spent states preserved |
| Responsive | Test desktop, 844×390 and 667×375 landscape, 390×844 portrait | 52 px desktop/44 px landscape dice; 14 px status and controls; landscape actions in viewport; portrait rotate prompt and centered header scores; orientation preserves game |
| Refresh | Move, refresh tab; choose Multiplayer | Home appears first; reentering shows fresh board and zero scores; no local saved state |

## Production and offline

1. `pnpm build` must reject leaked development controls or fixture strings.
2. `pnpm preview`, open app, then reload after first service worker installation.
3. Verify the development selector and fixed-dice controls are absent.
   Verify home → Single player → Back → Multiplayer also works offline.
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

# Mahbusa

Two people share one landscape board. Svelte + TypeScript + Vite, scalable SVG,
independent pure rules engine, static hosting, offline assets, no saved game state.

## Start page
Fresh visits show Single player and Multiplayer. Single player opens an
"In development" screen with Back; Multiplayer opens the existing same-device
game at its welcome/Start round screen. Start and development screens work in
either orientation, with no scoreboard or rotation prompt. Only the game asks
portrait phones to rotate. Reset dialog offers Back to start and explains that
this clears the board and scores. Navigation is in memory; refresh returns home.
The start page is checkpoint 1 of [the single-player roadmap](BOT_ROADMAP.md).
Engine foundation work follows its separate scoped implementation plan; public
bot play stays In development until a trained candidate passes qualification.

## Agreed rules
15 pieces on each starting point, opposing directions, pin rather than hit.
Mother-piece pin wins immediately for 2 without exceptions. Use maximum dice,
higher die if only one can be used, four moves for doubles. Bear off only with
all remaining pieces home. Normal win: 1 point; opponent has none off: 2 points.
First to 3 or more wins the round. Each player rolls their opening die separately
using their own button, in either order. Both must roll before deciding; ties reroll both dice,
the winner taps Start game to take a fresh roll. Contest dice stay in their player
positions until then. Previous winner opens subsequent games with dice rolled automatically.

## UX
Minimal theme, centered Light/Dark scores in the header without the round-target
label. The Mahbusa wordmark opens How to play. Borderless Undo/Reset icons sit
in the right-hand bear-off strip, with color-coded counts between them. The
counts use the original vertical arrangement: Dark number above its disc,
center divider, Light disc above its number. A subtle 44 px End turn arrow replaces
the divider when no legal moves remain. A 44 px bear-off target overlays the
middle of the tray when a selected checker can leave.
No separate game heading,
bottom turn panel, travel captions or footer slogan. Board point numbers and pin lock icons are hidden;
stack counts, pin stacking and accessible point labels remain. Larger dice (52 px
desktop, 44 px compact landscape) and readable text; controls at least 44 px tall.
Tap source then highlighted point,
using one die or a legal total of multiple dice on the same checker. Each intermediate
landing follows normal rules; doubles can combine up to four steps. Equivalent
dice orders use one destination; distinct dice choices prompt the player. A single
Undo reverses the entire destination tap. Explicit End Turn immediately rolls for
the opponent and closes Undo history; blocked rolls wait for explicit End Turn.
Welcome, opening rolls, Start game, dice choices,
and winning actions appear in center messages. Opening messages have no reserved
button slot; Start game expands only their bottom edge. Reset confirmation is red.
The gray outer frame is removed; board and tray geometry fill the old footprint
with circular checkers and the same relative arrangement. During play, dice float
over the narrow center wall. The active player stays highlighted in the header. The wall
overlay follows actual SVG scale and orientation changes.
Colored point bases share their top/bottom edges with the playing surface
and bear-off bar. Point hit areas extend to those same edges.
The board uses available viewport height below the header up to the original
840 × 462 proportions, respecting the bottom safe area and a small margin.
SVG height adapts to keep checkers circular. Checker
stacks start just inside the top/bottom walls. The wordmark explicitly retains its
dark text color on mobile browsers.
Next game/New round actions live in the winning message. Confirmed reset.
Immediate wins cannot be undone. Portrait phones prompt rotation. English only.

## Checkpoints
1. Git repo, scaffold, CI, documentation.
2. Responsive SVG board and starting position.
3. Legal movement and exhaustive dice sequence selection.
4. Pinning, mother win, bearing off, score and round lifecycle.
5. Interface controls, undo, status, rules, reset.
6. Deterministic development fixtures and Chrome extension behavior testing.
7. Manifest, asset-only offline cache and iPhone install testing.
8. Production deployment, public GitHub push and final validation record.

Commit each coherent checkpoint after applicable validation and push validated
commits to the user's personal public `mahbusa` repository. GitHub Actions runs
checks, engine tests and build. Never include credentials or generated artifacts.

## Acceptance
Automated rules and conservation tests plus browser scenarios for every rule,
turn control and reset. Real iPhone checks for installation, orientation, offline,
and feedback under 100 ms. Record unperformed checks as pending.

No login, backend, game persistence, online play, native app or App Store release.
The local trained opponent is planned in BOT_ROADMAP.md; it is not enabled yet.

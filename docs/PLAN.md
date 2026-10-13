# Mahbusa

Two people share one landscape board. Svelte + TypeScript + Vite, scalable SVG,
independent pure rules engine, static hosting, offline assets, no saved game state.

## Agreed rules
15 pieces on each starting point, opposing directions, pin rather than hit.
Mother-piece pin wins immediately for 2 without exceptions. Use maximum dice,
higher die if only one can be used, four moves for doubles. Bear off only with
all remaining pieces home. Normal win: 1 point; opponent has none off: 2 points.
First to 3 or more wins the round. Each player rolls their opening die separately
using their own button, in either order. Both must roll before deciding; ties reroll both dice,
winner takes a fresh roll. Previous winner opens subsequent games.

## UX
Minimal theme, light/dark players side by side. Tap source then highlighted point,
using one die or a legal total of multiple dice on the same checker. Each intermediate
landing follows normal rules; doubles can combine up to four steps. Equivalent
dice orders use one destination; distinct dice choices prompt the player. A single
Undo reverses the entire destination tap. Roll, undo within turn, explicit End Turn, confirmed reset.
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

No login, backend, persistence, online play, AI, native app or App Store release.

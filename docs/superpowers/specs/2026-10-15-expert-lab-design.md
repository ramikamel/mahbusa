> Historical: superseded October 16, 2026 by automatic self-play. The expert lab
> was removed; no user annotations are required. See [current roadmap](../../BOT_ROADMAP.md).

# Expert lab design

Checkpoint 5 of docs/BOT_ROADMAP.md. User authorized continuing the agreed roadmap.
Purpose: let the expert inspect heuristic choices and curate preferred/acceptable/bad
complete-turn results for later evaluation and training. This is local development
tooling. No public bot, automatic play, training or storage is added.

Use a DEV-gated dynamic Svelte component, reachable through a development header
button or ?lab=1. Reuse Board with an optional editable flag (default false) so
every point can be selected with mouse/touch/keyboard in editor mode. Public board
geometry and play remain unchanged. Lab-specific styles stay in its component.

The lab edits a full pre-turn position (24 point stacks, top color, borne-off
counts), player, scores 0–2, and two dice (doubles expand to four uses). Point
selection opens numeric stack controls. Include opening, mother-contact and
held-pin presets. Show piece totals and validation errors; Analyze is explicit.
Changing the analyzed input creates another case, preserving existing labels.
Title edits rename the selected case. Loading a case or preset replaces unanalysed
draft edits only; explain that on screen. Maximum 20 cases per collection.

Use existing rankStrategyTurns with no strategy filters. Candidate list is paged
at 20 items, with total count, heuristic value (never probability), sequence,
label and score breakdown. Selecting a candidate previews its final board.
Start/previous/next/final controls replay each prefix through checked applyMove.
The preview is the current game's board; next-game continuation is described
separately to avoid silently replacing the preview with a new starting board.

Multiple results can be preferred or acceptable; labels are not mandatory.
Each result has a judgment and note. Remove a label explicitly. Associate labels
with canonical final position/dice/outcome keys, not ranking index or score, so
weights/order can change. Export only case inputs, result labels and notes;
do not export cached heuristic values. Preview/edit actions never roll dice.

JSON collection: {format:'mahbusa-expert-lab', version:1, cases:LabCase[]}.
LabCase has id, title, input (TurnInput plus score), annotations.
Annotation has resultKey, judgment preferred/acceptable/bad, note.
Inputs must have exactly 15 checkers per player including off, integer counts
0–15, off 0–14, empty top null, single-color top matching color, mixed stacks
with exactly one captive and a valid top. Reject captured mothers and completed
boards; structural validity does not prove a historical path from the opening.
Dice must be a full roll: two distinct dice or four equal dice, each 1–6.
Reject malformed score/player, duplicate IDs/annotation keys, stale annotation
results, unknown format/version, and oversized collections. Max UTF-8 JSON 1 MiB,
IDs 80 chars, titles 160, notes 4000, annotations 100 per case. Canonicalize and
deep-own parsed/exported data. Imports are all-or-nothing and replace in-memory
cases only on success, with explicit replacement confirmation.
Use a textarea plus optional file picker; export to a user-triggered JSON download
and editable text for inspection. No browser persistence or telemetry. Clearly
state that reload loses cases unless exported. At capacity reject creating a new
case without losing work; users may export then explicitly start a new collection.

Tests cover structural validation, stale-label rejection, round-trip/multiple
labels, preview prefixes/terminal wins, immutability, and failed import atomicity
via UI. Browser QA covers editor, validation, candidate replay, annotation,
case preservation, import/export, keyboard access, narrow viewport and ordinary
multiplayer. Extend production packaging guards to reject lab identifiers in
JS and CSS. Build and inspect production UI with ?lab=1 to confirm no lab entry.

Execute inline with test-first domain work and one fresh whole-branch reviewer.
Commit 1 contracts/validation/replay, commit 2 UI/dev integration, commit 3
production exclusion guards and QA/docs. Commit 3 guard work could run alongside
UI after domain contracts, but inline execution avoids competing checkout edits.
Merge/push after verification under the existing session authorization. No Sites
publication: the development-only tool is intentionally absent from production.

# Expert lab

Development-only expert review for the single-player engine (roadmap checkpoint 5).

From the repository, run `pnpm dev`, then open
http://127.0.0.1:5173/?lab=1 or use **Expert lab** in the development header.
The published site has no lab entry. Single player stays **In development**.

1. Load Opening, Mother contact or Held pin, or edit the current position.
   Select any point on the board (keyboard Enter/Space works) or use Edit point.
   Set Light/Dark counts and the top color for a pin. Edit borne-off counts,
   player, score and dice. Totals must remain exactly 15 for each player.
2. Press **Analyze position**. Two equal dice expand into four uses. The lab
   ranks every distinct complete legal result, including forced moves and passes.
   Changed inputs create a separate case; earlier inputs and labels survive.
3. Pick a candidate. Start/Previous/Next/Final replay the move through the rules.
   The board shows the current game's move, including its winning position.
   The explanation separately describes the next-game reset or completed round.
   Point numbers in move text are 1–24; Light starts at 24, Dark at 1.
4. Mark Preferred, Acceptable or Bad and add your reasoning. Multiple results can
   share a label. Unreviewed removes a label. Labels identify final results,
   so future weight/ranking changes do not reattach them to another move.
5. Use **Show JSON** to inspect/copy, or **Download JSON** to save the collection.
   To restore, paste JSON or choose a file, then Import JSON and confirm replacement.
   Invalid imports preserve existing cases. The file stays on your device.

**Nothing is automatically saved.** Export before reloading, leaving, starting a
new collection or importing another one. Exports contain saved cases/labels,
not unanalyzed draft edits or cached heuristic values. Loading a saved case or
preset discards the current unanalyzed draft. Collections support 20 cases,
100 labels per case, notes up to 4,000 characters and JSON up to 1 MiB (UTF-8).
Export then start a new collection when full.
Edits that exceed the aggregate byte limit are rejected while preserving the
previous value. Near the limit, export uses compact JSON to keep the file importable.

The schema uses format mahbusa-expert-lab, version 1. Inputs include position,
active player, round score, and remaining dice as a full roll (two distinct dice
or four equal values). Scores must be 0–2; completed games and captured mothers
are rejected. Mixed stacks contain exactly one captive. Validation checks board
structure and conservation; it does not prove historical reachability.

Strategy-v1 is a provisional static heuristic, not a probability or strength
qualification. Annotations are review data only; the lab does not train a model.
Analysis currently runs synchronously on the main thread; large valid positions
may take noticeable time. Device performance and worker/search budgets are later
checkpoints. No login, telemetry, browser persistence, backend or automatic play.

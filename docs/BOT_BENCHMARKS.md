# Bot simulation and benchmarks

Run locally from the repository:

```sh
pnpm benchmark:bot --seed my-test-seed --pairs 100 --out .local/my-test-seed.json
```

This plays strategy-v1-greedy (A) against random-legal-v1 (B), twice per seed with
A's color swapped. Both legs replay the same dice stream from its start; their
positions and stream consumption can diverge as play differs. Entrant action
streams are independent of dice and follow the entrant across colors.

A uses the current static Mahbusa evaluator, without look-ahead or trained weights.
B chooses uniformly among distinct complete legal results, rather than among move
orders. This opponent is a benchmark control, not a public difficulty mode.

Options:
- --seed: nonempty string, maximum 256 characters; default mahbusa-benchmark-v1.
- --pairs: integer 1–500, default100. Each pair contains two first-to-3 rounds.
- --max-turns: per-round integer 1–100000, default2000.
- --a / --b: strategy, random or first. first-legal-v1 is a deterministic control.
- --out: optional explicit JSON file path. Existing files are not overwritten.

Progress goes to stderr; the complete JSON report goes to stdout and the optional
file. Use a new filename for another run, or redirect stdout if no file is needed.
Exit0 means all rounds completed; exit2 means the report contains truncated rounds;
exit1 means invalid arguments or an execution failure. Truncation is never a draw
or an awarded victory. Any truncation suppresses aggregate win rate and interval.

Reports include source Git revision/dirty status, rules and RNG versions, root and
per-pair seeds, policy IDs, color assignments, outcomes, points, mother losses,
turns/passes/games, timing and dice/decision trace hashes. Scores and winners use
entrant roles A/B, independent of color. Timings depend on the machine and load;
outcomes/hashes are repeatable for the same source, options, policies and seed.
The report format is version1. Never treat reports with different rules or policy
versions as an interchangeable baseline.

Random streams use Node SHA-256 over UTF-8 JSON [version,seed,stream,counter],
digest words read little-endian, with rejection before bounded modulo mapping.
This avoids the old test-only LCG's adjacent-dice parity issue. Production dice
continue using the existing crypto implementation. Simulation imports Node code
only; the public app does not load these modules.

The 95% interval uses a conservative Hoeffding bound on each bounded paired score:
epsilon=sqrt(log(40)/(2*pairs)), clamped to [0,1]. Pair legs may be dependent;
the bound treats separate pairs as representative independent experiments. Small
samples produce wide intervals. Seeds are deterministic pseudo-random experiments.
The interval is diagnostic, not an Elo rating or an automatic promotion rule.
No repeated-look stopping/promotion is implemented. Qualification still needs
held-out expert positions, fresh confirmation seeds and equal runtime budgets.

Use the expert lab to diagnose failed positions. Future checkpoints add dice-aware
search, workers, trained evaluation and stronger reference opponents. A random
baseline cannot establish that this bot is strong against an experienced person.
Long matches stay outside ordinary CI. CI runs seeded correctness tests, the
actual Node CLI, checked plan replay, cutoff handling and RNG coverage.

Local reports in .local/ are ignored by Git. No game data or model is saved by the
website, and no training or public single-player enablement happens here.

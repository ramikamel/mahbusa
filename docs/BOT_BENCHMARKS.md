# Bot simulation and benchmarks

Run locally from the repository:

```sh
pnpm benchmark:bot --seed my-test-seed --pairs 100 --out .local/my-test-seed.json
```

This defaults to strategy-v1-greedy on both sides, twice per seed with A's color
swapped. Both legs replay the same dice stream from its start; their positions
and stream consumption can diverge when policies differ. Entrant action streams
are independent of dice and follow the entrant across colors.

Reports mark matching policy IDs as `samePolicy: true`, `comparison: self-play`.
For this deterministic strategy, swapping roles produces complementary results:
50% is expected by construction, not evidence of improvement. Different policy
IDs are marked `comparison: control`. IDs must uniquely identify frozen behavior;
changing weights/search requires a new ID and source revision. These flags do not
qualify a model or automatically establish that a control is strong.

The strategy currently uses static heuristics, without look-ahead or trained
weights. Optional `--b random` selects the old sanity control, uniformly choosing
among distinct legal final results. `--a first --b first` is a deterministic smoke
control. Neither control is a public difficulty setting.

Options:
- --seed: nonempty string, maximum 256 characters; default mahbusa-benchmark-v1.
- --pairs: integer 1–500, default100. Each pair contains two first-to-3 rounds.
- --max-turns: per-round integer 1–100000, default2000.
- --a / --b: strategy (default for both), search, random, first or model.
  search selects the experimental deterministic depth1/1000-node policy; see
  [search budgets and limits](BOT_SEARCH.md). Its versioned ID records configuration.
- --a-model / --b-model: required directory when that entrant is model; refused
  for other policies. A model uses experimental depth0 complete-turn ranking.
- --a-search-nodes / --b-search-nodes: optional integer1..1000000 for a search
  entrant only; default1000. Depth1 and cache10000 remain fixed. The effective
  node budget is included in the policy ID; these are research controls, not
  public difficulty settings.
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
held-out automatic regressions/seeds, frozen earlier engine/model versions, fresh
confirmation seeds and equal runtime budgets.

## Frozen local model opponents

```sh
pnpm benchmark:bot --seed candidate-vs-strategy-001 --pairs 100 --a model --a-model .local/bootstrap-model-001 --b strategy --out .local/candidate-vs-strategy-001.json
pnpm benchmark:bot --seed candidate-vs-old-001 --pairs 100 --a model --a-model .local/candidate-002 --b model --b-model .local/bootstrap-model-001 --out .local/candidate-vs-old-001.json
```

Each model is loaded once, before play, through the same completed-training,
checksum/schema and fixed-tolerance parity gate used by `verify:model-parity`.
Invalid or partial artifacts fail before writing a report. The policy ID is
`nn-greedy-v1/<full weight SHA-256>`, avoiding mutable opponent names. Optional
`modelArtifacts` holds A/B provenance (null for nonmodel entrants): consumed
weights, model manifest, training report and parity-file hashes plus actual parity
result. Later edits on disk cannot change already loaded weights or those hashes.
Local paths are not included.

The model evaluates every complete-turn continuation at depth0 using the existing
search logic. Handover negates the opponent's value; game wins update the score
and retain the winner as next starter. Exact round wins always take precedence.
Other ties retain generator order. Both models in a comparison are frozen, with
no training or promotion during matches. Same-model mirrors are consistency
checks; they cannot establish strength. Model-greedy versus strategy uses the
same turn generation but different evaluation runtime, so report actual timing
and treat results as diagnostic rather than equal-runtime qualification.

[Automatic self-play data](SELF_PLAY.md) saves positions without user annotations.
Dice-aware search and experimental trained evaluation are available explicitly;
resumable learning, opponent pools and qualified reference versions remain later
checkpoints. A random
baseline cannot establish that this bot is strong against an experienced person.
Long matches stay outside ordinary CI. CI runs seeded correctness tests, the
actual Node CLI, checked plan replay, cutoff handling and RNG coverage.

For a frozen search-budget comparison:

```sh
pnpm benchmark:bot --a search --a-search-nodes 20000 --b search --b-search-nodes 1000 --pairs 100 --seed strategy-budget-control-2026-10-21 --out .local/strategy-budget-control-2026-10-21.json
```

See the [October21 frozen protocol](BOT_BUDGET_COMPARISON.md) before interpreting
this diagnostic. More compute or a positive small sample does not automatically
qualify an engine or device latency.

Local reports in .local/ are ignored by Git. No game data or model is saved by the
website, and no training or public single-player enablement happens here.

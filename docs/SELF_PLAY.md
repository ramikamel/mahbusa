# Automatic Mahbusa self-play

The engine plays both sides and labels its own positions from the final round
winner. No lab, annotations or manual move review is required. These are outcome
samples for the [local learner](BOT_TRAINING.md); running this command does not
train weights.

```sh
pnpm selfplay:bot --seed local-batch-001 --rounds 100 --out .local/local-batch-001
```

Use Node 22.18 or newer. Options: `--seed` (1–256 characters; default
`mahbusa-self-play-v1`), `--rounds` (1–10000; default 100), `--max-turns`
(1–100000 per round; default 2000), `--policy strategy|search|model` (default strategy),
and required `--out NEW_DIRECTORY`.
Existing directories are refused so previous datasets are preserved. Data under
`.local/` is ignored by Git. Generation runs locally, one round in memory at a
time; the website stores no games and loads none of this Node-only code.

Each run writes:

- `rounds.jsonl`: one completed first-to-three round per line, containing its
  result and `{state, target}` examples. State has only position, active color
  and score, sampled before a roll. It has no dice or future random stream.
  Target is +1 if that state's active color eventually wins the **round**, -1
  otherwise. A game win alone does not set the target. Terminal winning boards
  are excluded; after each game, a fresh board with updated scores and the winner
  starting is observed before dice. Timing/hashes in result are metadata, never
  model features. Entrant-role winners must be mapped through `aColor` to colors.
- `manifest.json`: format/version, root seed, rules/RNG/policy IDs, source Git
  revision/dirty status, limits/counts, incomplete indexes/seeds, status, and
  SHA-256 plus UTF-8 byte count of the actual JSONL file. A cutoff round contributes
  no line or labels. Check both status and checksum before consuming data.

The default policy is the frozen `strategy-v1-greedy` on both sides, with entrant
colors alternating. `--policy search` explicitly selects the experimental bounded
search policy on both sides; the manifest and each round record its actual ID.
See [search usage](BOT_SEARCH.md). Search does not change the outcome-label rules. Per-round seed is SHA-256 of UTF-8 JSON
`['self-play-v1', rootSeed, index]`; benchmark seeds use a different domain.
Given identical source/policy/options, positions, outcomes and trace hashes
repeat. Wall-clock timings and timestamps can differ, so whole-file checksums
identify a particular run, not equality of gameplay across runs.

To collect outcomes from a frozen experimental model on both sides:

```sh
pnpm selfplay:bot --seed model-data-001 --rounds 100 --policy model --model .local/bootstrap-model-001 --out .local/model-data-001
pnpm prepare:training --dataset .local/model-data-001 --out .local/model-shards-001 --seed model-split-001
```

`--model` is required only with `--policy model`, and refused for other policies.
The model passes completed-training, weight/schema/checksum and prediction-parity
checks before the output directory is created. Its policy ID contains the full
weight hash; `modelArtifact` in the manifest records the exact consumed model,
training and parity-file hashes. It ranks complete turns at depth0. Once loaded,
disk changes cannot change the opponent halfway through a batch. Existing seed
derivation, labels, cutoffs and version1 preparation remain unchanged.

This mode is model-mirror data. The [learner](BOT_TRAINING.md) also supports exact
epoch resume or checked warm starts; outcomes and lower loss do not prove that
a new candidate is stronger. Keep old models and compare frozen versions.

## Frozen opponent pools

Create `.local/training-pool.json` with model paths relative to that file:

```json
{
  "format": "mahbusa-opponent-pool",
  "version": 1,
  "entrants": [
    {"key": "strategy", "policy": "strategy"},
    {"key": "current", "policy": "model", "model": "model-current"},
    {"key": "old", "policy": "model", "model": "model-old"}
  ],
  "matchups": [
    {"a": "strategy", "b": "strategy", "weight": 2},
    {"a": "strategy", "b": "current", "weight": 1},
    {"a": "strategy", "b": "old", "weight": 1}
  ]
}
```

```sh
pnpm selfplay:bot --pool .local/training-pool.json --seed pool-data-001 --rounds 500 --out .local/pool-data-001
pnpm prepare:training --dataset .local/pool-data-001 --out .local/pool-shards-001 --seed pool-split-001
```

`--pool` is mutually exclusive with explicit `--policy` or `--model`. All entrants
resolve once before output: strategy/search or checked model artifacts. Keys
must be unique lowercase letters/digits/hyphens, starting with a letter, at most
32characters. Pools allow1–16 entrants and1–64 distinct directed matchups, with
integer weights1–100. A model requires its directory; other policies refuse it.
Weights determine probabilities, not exact batch quotas. Current/old are labels
for configured versions and never automatically imply a promoted champion.

The manifest stores a path-free resolved definition and SHA-256, raw config hash,
model provenance and selection version. For each index, an independent seeded
stream `pool-matchup-v1/<definition hash>/<index>` samples the declared weights;
it does not consume dice/action RNG. A color still alternates by round index.
Rows record actual A/B policy IDs and final-round targets under the same rules.

Pool sources are version2. Preparation verifies the snapshot and recomputes each
index's expected opponents before accepting a row; changing an opponent and
rehashing the JSONL cannot invent a valid matchup. Numeric shards remain version1
with whole-round splits and equal-round weights. Old mirror commands/datasets
stay version1. Any cutoff/failed/running batch remains unusable by preparation.
The command starts a new exclusive dataset; recovery of dataset generation itself
is not implemented. Learner epoch recovery is separate.

Progress goes to stderr and the final manifest to stdout. Exit 0/status `complete`
means every requested round finished. Exit 2/status `incomplete` means cutoffs;
only fully completed rounds have labels. Exit 1/status `failed` means an error:
never train from a failed run, even if some lines are valid. An interrupted run
retains status `running`; it also must not be consumed. The manifest is replaced
atomically on normal finalization. If the filesystem itself prevents finalizing,
the command fails and cannot guarantee a final manifest. Pick a new directory to
retry; resuming shards is a later training checkpoint.

For automatic evaluation rather than data collection:

```sh
pnpm benchmark:bot --seed mirror-check-001 --pairs 100 --out .local/mirror-check-001.json
```

This checks both colors with identical policies. A 50% paired mirror score is
expected and cannot demonstrate improvement. Later search/trained candidates
must beat frozen previous versions on held-out seeds under equal budgets before
promotion. Keep training, validation and final confirmation round seeds separate;
do not leak adjacent positions from one round across these splits. The remaining
model self-play, strength qualification and device acceptance steps are in the
[roadmap](BOT_ROADMAP.md). Public Single player remains In development until then.

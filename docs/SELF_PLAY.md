# Automatic Mahbusa self-play

The engine plays both sides and labels its own positions from the final round
winner. No lab, annotations or manual move review is required. These are outcome
samples for the future learner; running the command does not train weights.

```sh
pnpm selfplay:bot --seed local-batch-001 --rounds 100 --out .local/local-batch-001
```

Use Node 22.18 or newer. Options: `--seed` (1–256 characters; default
`mahbusa-self-play-v1`), `--rounds` (1–10000; default 100), `--max-turns`
(1–100000 per round; default 2000), `--policy strategy|search` (default strategy),
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
worker, training/parity and device qualification steps are in the
[roadmap](BOT_ROADMAP.md). Public Single player remains In development until then.

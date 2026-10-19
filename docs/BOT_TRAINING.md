# Local experimental value-model training

The first learner trains from automatically completed first-to-three rounds.
It needs no annotations. TypeScript owns the rules and position encoding;
Python consumes checked numeric shards and trains a small CPU network.
Models remain local and experimental. Training does not register a model with
the search worker or enable Single player.

## Run locally

Use Node22.18+ and Python3.12+ from the repository root. Create a project-local
environment once; use its interpreter explicitly so worktree/system Python
versions cannot silently change the run:

```sh
python3 -m venv .local/training-venv
.local/training-venv/bin/python -m pip install -r training/requirements.txt

pnpm selfplay:bot --seed bootstrap-data-001 --rounds 100 --out .local/bootstrap-data-001
pnpm prepare:training --dataset .local/bootstrap-data-001 --out .local/bootstrap-shards-001 --seed bootstrap-split-001
.local/training-venv/bin/python -B training/train.py --data .local/bootstrap-shards-001 --out .local/bootstrap-model-001 --epochs 20 --seed 20261017
pnpm verify:model-parity --model .local/bootstrap-model-001
```

Every output directory must be new; existing runs are preserved. `.local/` is
ignored by Git. Python requires pinned torch2.14.1; NumPy is not needed. CI uses
Python3.12 and the official PyTorch CPU wheel index. See the
[official installation guide](https://pytorch.org/get-started/locally/).
The first local run used Python3.14.6, torch2.14.1 and an Apple Silicon CPU.

Preparation defaults to split seed `mahbusa-training-split-v1`. Training defaults
to20epochs, batch size256, seed20261017 and learning rate0.001. Options are
`--epochs`1–1000, `--batch-size`1–65536, `--seed`0–4294967295 and
`--learning-rate` greater than0 and at most1. All training uses one CPU thread,
a fixed seed and deterministic operations. Identical weights were verified on
repeat runs in the same environment; different Torch/platform versions are not
promised bitwise equality. See PyTorch's
[reproducibility notes](https://github.com/pytorch/pytorch/blob/main/docs/source/notes/randomness.md).

## Data and model contracts

Preparation accepts only a complete, checksum-verified self-play dataset. It
checks round identities, policy, counts, legal pre-roll states and each label
against the completed round winner. Cutoff/failed/running data is refused.
The split is determined for an entire round: SHA-256 of UTF-8 JSON
`['training-split-v1', splitSeed, roundSeed]`, first unsigned32-bit big-endian
word divided by2^32, with values below0.2 assigned to validation. Both splits
must contain a round. Adjacent positions from one round cannot cross splits.

Each little-endian Float32 record has106 values:104 encoded features, a round
win target0 or1, then weight1/positionsInRound. This gives each round equal
total weight, rather than letting long rounds dominate. The manifest records
source revision/dirty state, source manifest/file hashes, split assignments and
actual shard bytes/hashes. Python verifies them before training.

Feature schema `mahbusa-pre-roll-v1` visits points1–24 from the active player's
home: own count/15, opponent count/15, own top bit, opponent top bit at each
point. Then come both borne-off counts/15 and each player's score as three
one-hot values. This preserves pins and color reflection. Dice, future random
streams and history are excluded.

The network is104→128ReLU→128ReLU→1sigmoid. Training uses weighted binary
cross-entropy; inference returns2P(round win)-1. For each dense layer, row-major
weights precede biases, yielding30081 little-endian Float32 values/120324bytes.
The browser-safe loader checks dimensions, versions, SHA-256 and finite values.

## Artifacts and validation

A completed model directory contains:

- `training.json`: configuration, provenance, initial/per-epoch/selected weighted
  BCE and Brier metrics, constant baseline, best epoch and final status.
- `model.json` and `weights.bin`: versioned experimental manifest and checked
  weights; model ID derives from their SHA-256.
- `checkpoint.pt`: selected numeric state, epoch and seed. Use the epoch recovery
  files below for optimizer state and exact resume.
- `parity.json`: Python predictions for real validation inputs and synthetic
  arithmetic probes. Synthetic probes test inference, not legal game states.
- `resume.json` and `resume/epoch-NNNNNN.pt`: last completed-epoch pointer and
  numeric weights/Adam/RNG/best/history snapshots. Older epoch files are retained.

The initial model and every epoch compete on validation BCE; the lowest-loss
checkpoint is exported. Validation therefore tunes model selection and is
**not** a fresh strength holdout. Later overfitting does not replace an earlier
better checkpoint. BCE/Brier improvements alone never qualify playing strength.

The parity CLI requires completed training and matching model identity, then
loads the actual binary through TypeScript. Its absolute tolerance is fixed at
5e-5; artifacts cannot relax it. Partial/failed exports cannot pass. A normal
training failure records `failed`; an interrupted process retains `running`.
Filesystem failure may prevent finalization; neither status is consumable.

Run the small integration tests separately from long experiments:

```sh
.local/training-venv/bin/python -B -m unittest discover -s training/tests -v
pnpm test
pnpm test:engine
```

The first100-round bootstrap selected epoch1; its21-round validation BCE was
0.58370 versus0.69314 for a constant predictor. All162 parity probes passed.
These are pipeline results from a small strategy-mirror dataset, not evidence
that the model outplays strategy or search. Full hashes and measurements are in
[the validation record](VALIDATION.md).

Frozen models now play in [headless benchmarks](BOT_BENCHMARKS.md) and generate
[model-mirror outcomes](SELF_PLAY.md). Both commands share the parity gate and
record full artifact hashes before play. The resulting version1 dataset prepares
and trains through the same commands above; each run still starts from fresh
seeded weights unless a continuation option is supplied.

The first model's actual pilot won only2/200 rounds against strategy, with134
mother losses. Strategy remains the stronger reference. A second candidate was
trained from20 model-mirror rounds to verify the loop, and is also unqualified.
More outcome data and lower loss cannot by themselves establish improvement;
saved tactical cases and frozen-opponent matches must test the learned choices.

## Resume and warm start

```sh
# Continue the last completed epoch, on exactly the same prepared data.
.local/training-venv/bin/python -B training/train.py --data .local/bootstrap-shards-001 --resume .local/bootstrap-model-001 --out .local/bootstrap-resumed-001 --epochs 5

# Start learning on a new batch from the parent's selected best model.
.local/training-venv/bin/python -B training/train.py --data .local/pool-shards-001 --warm-start .local/bootstrap-model-001 --out .local/pool-model-001 --epochs 5 --seed 20261018
.local/training-venv/bin/python -B training/train.py --data .local/pool-shards-001 --resume .local/pool-model-001 --out .local/pool-model-resumed-001 --epochs 5
```

`--resume` and `--warm-start` are mutually exclusive. Epoch count means additional
epochs; cumulative total is at most1000. Resume restores the **last** weights,
Adam state, Torch RNG and shuffle RNG, retaining the global best selected model
and metric history. It requires identical prepared-manifest hash and exact
Python/Torch/platform environment. Omitted seed/batch/lr inherit the checkpoint;
explicit changes are refused. Same-environment split runs match uninterrupted
weights/history exactly, including when the best epoch precedes the last epoch.

Each completed epoch writes a new checked file before atomically replacing the
resume pointer. If a process stops during a later epoch, `--resume` can recover
the previous committed epoch from that running/failed directory. Work since that
epoch is discarded. This is epoch recovery, not mid-batch recovery. No pointer
exists if the first epoch never completed; use the original parent or start anew.
Numeric loading uses `weights_only=True`; malformed/checksum/config/environment
failures are refused. A resumable training checkpoint is not a playing export:
the shared artifact gate still requires completed training and matching parity.

Warm start loads selected weights through the Node artifact/parity gate and
starts a fresh optimizer, RNG, epoch history and validation-best selection on the
new data. It records exact parent model/report/manifest hashes. New runs preserve
unique round-to-split ancestry in `splitHistory`; reused seeds cannot move across
training and validation, even across warm-start generations. This ancestry does
not turn validation used for selection into an untouched qualification holdout.
Exports from before this checkpoint remain playable but lack split ancestry;
recreate them with the original data/options using this learner before warm start.

## Mixed opponents and tactical checks

[Frozen pools](SELF_PLAY.md) now generate version2 source datasets; preparation
still emits the same version1 numeric shards. No Python pool or game logic is
needed. Strategy remains the reference while model roles identify frozen
experimental versions, not accepted champions.

```sh
pnpm check:bot-tactics --model .local/pool-model-resumed-001 --out .local/pool-model-tactics-001.json
```

This diagnostic uses three automatically saved mother-exposure inputs. It checks
actual selected turns against legal alternatives, allowing forced exposure and
immediate wins. Exit0 passes all cases,2 reports tactical failures,1 reports an
invalid artifact/input. Existing outputs are not overwritten. No legal move is
filtered or policy altered; passing these cases alone never qualifies strength.

The first500-round mixed-pool continuation matched uninterrupted learning exactly
and passed all three saved mother cases, but lost all200 strategy-control rounds.
It remains experimental and rejected for promotion. See the actual counts/hashes
and [validation record](VALIDATION.md); these checks separate pipeline correctness
from playing quality.

Next: strategy-guided learning, teacher corrections on candidate-encountered positions,
explicit move-ranking preferences, and fresh-seed strength comparisons
and tactical regressions. Worker registration, phone timing and public enablement
follow qualification. See [the roadmap](BOT_ROADMAP.md).

## Strategy-value distillation

Outcome-only bootstraps have not learned competitive move selection. The next
controlled alternative teaches the existing network the strategy evaluator on
legal complete-turn alternatives:

```sh
pnpm prepare:training --dataset .local/pool-data --out .local/teacher-shards --seed pool-learning-split-2026-10-18 --teacher strategy --turns-per-round 16
.local/training-venv/bin/python -B training/train.py --data .local/teacher-shards --out .local/teacher-model --epochs 20 --seed 20261019
pnpm verify:model-parity --model .local/teacher-model
pnpm check:teacher-ranking --data .local/teacher-shards --model .local/teacher-model --out .local/teacher-ranking.json
```

Source manifests, completed outcomes, states and checksums are still checked.
For each round, up to16 evenly spaced pre-roll positions receive independent
seeded dice; neither future dice nor the eventual winner selects these rolls.
Every legal complete-turn continuation supplies the teacher value from its next
active player's perspective, transformed from[-1,1] to[0,1]. Round wins are exact
in search and need no network target. A game win instead teaches the updated
score and next game's starting player. Each round has equal total weight.

Prepared version2 identifies `strategy-soft-value-v1`, teacher version, sampling
and limits. It retains the same104features/106Float32-record layout and whole-
round20% split. Source outcomes are validated but are not the distillation
labels. Existing outcome preparation remains version1 with binary targets.
Python verifies soft-label semantics and a checked held-out-turn sidecar before
creating output. Resume and warm-start ancestry apply to either objective.

A distilled export explicitly returns `heuristic` values. They approximate a
provisional strategy score, not round-win probabilities. Existing `bce`/`brier`
metric keys describe soft-target cross-entropy/squared teacher-target error here;
they do not measure outcome calibration. The artifact gate
rejects mismatched training/manifest semantics; legacy outcome exports retain
round-win semantics. Architecture, parity tolerance and public registry stay
unchanged.

Ranking diagnostics regenerate validation afterstates/targets and compare their
actual bytes with the numeric validation shard. All roots must belong to the
recorded held-out rounds, use the independent dice and remain outside the model's
training ancestry. The diagnostic replays selected moves through public rules,
counts agreement including teacher ties, reports multi-choice agreement, mean/
maximum teacher regret and avoidable mother exposures. Single-choice/terminal
turns can inflate overall agreement; inspect choice counts and actual matches.
No ranking score or lower soft BCE qualifies playing strength. Long local
experiments and paired matches remain separate from ordinary CI.


The first500-round teacher experiment improved held-out multi-choice agreement
from24.9% to30.4% and avoided all33 prior mother-exposure mistakes on that holdout.
It still won only3/200 strategy-control rounds, with65mother losses; it is rejected
for promotion. Pointwise imitation needs further work on actual encountered
positions and explicit best-turn preferences. See the validation record for exact
hashes/counts; all datasets/models remain local.

## Corrections on played turns and preference training

To correct a frozen candidate on the turns it actually encounters, collect a pool
with that model and strategy, saving the rolled inputs before each choice:

```sh
pnpm selfplay:bot --pool .local/corrective-pool.json --seed corrective-data-001 --rounds 500 --record-turns true --out .local/corrective-source-001
pnpm prepare:training --dataset .local/corrective-source-001 --seed corrective-split-001 --teacher strategy --turns-per-round 16 --ranking true --out .local/corrective-shards-001
.local/training-venv/bin/python -B training/train.py --data .local/corrective-shards-001 --warm-start .local/teacher-model --ranking-weight 1 --seed 20261019 --epochs 20 --out .local/corrective-ranked-001
.local/training-venv/bin/python -B training/train.py --data .local/corrective-shards-001 --warm-start .local/teacher-model --ranking-weight 0 --seed 20261019 --epochs 20 --out .local/corrective-control-001
pnpm check:teacher-ranking --data .local/corrective-shards-001 --model .local/corrective-ranked-001 --out .local/corrective-ranking-001.json
```

Source version3/round version2 record owned `turns` with the actual expanded dice,
position, active and score. Preparation checks all recorded inputs against the
pre-roll observations and seeded dice, including opening ties through public
rules. Teacher sampling uses `even-played-turns-v1` for these datasets; ordinary
sources retain independent-roll sampling. Outcomes/cutoffs/provenance checks
remain. Recording does not change simulation dice/actions/results. The callback
gets an owned input, so an observer cannot change play.

`--ranking true` requires teacher data and creates prepared version3. It retains
the same numeric example layout, plus turn-group signs/terminal flags and checked
24-byte binary preferences in each split. Each nonterminal root pairs its best
rounded teacher value with all strictly worse alternatives (gap>1e-7). Ties and
roots with an exact round win contribute no preference. Signs convert the next
active perspective back to the chooser, including next-game starts. Raw pair
weights sum to1 per round. Both splits must contain preferences.

Python reconstructs every pair from group boundaries, signs and numeric targets;
rehashed changes to row indices, sign, gap or weights are rejected. Held-out
ranking additionally regenerates legal continuations, group metadata and pair
bytes. Group metadata is not a Python implementation of game rules.

The optional loss adds gap-weighted logistic preferences on signed logits to
pointwise BCE. `--ranking-weight` is finite0..10, defaults1 on preparedv3 and0 on
legacy data; a positive value requires paired data. Larger teacher gaps have
higher importance. A separate seeded/restored pair RNG preserves the pointwise
shuffle across matched controls and adds no Adam steps. Zero weight reproduces
legacy pointwise weights on identical examples. Metrics add `ranking`,
`pairAccuracy` and `objective`; validation objective (BCE+weight*ranking) selects
the checkpoint. These remain heuristic imitation metrics, not win probabilities.

Resume inherits and checks ranking weight and both shuffle RNGs, retaining last
optimizer state and best-objective history. Missing pair RNG or inconsistent
objective history is refused before output. Interrupted epoch writes retain the
last committed pointer; split and uninterrupted runs recover identical last
weights, RNGs and history even when the selected best precedes the last epoch.
Warm starts allow a new objective with a fresh optimizer but keep split ancestry.


The first matched played-turn experiment trained204229afterstates/184659pairs.
The ranked model agreed with strategy on48.1% of held-out multi-choice turns,
versus36.8% for the pointwise control. Both had zero avoidable mother exposures
on the1408-root holdout. In fixed matches they won10/200 and8/200 against strategy;
that difference is inconclusive, and neither candidate is qualified. Full
identities, paired comparison and measurements are in the validation record.

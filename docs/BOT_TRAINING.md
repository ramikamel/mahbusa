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

Next: further outcome/TD learning iterations, stronger pools, fresh-seed strength comparisons
and tactical regressions. Worker registration, phone timing and public enablement
follow qualification. See [the roadmap](BOT_ROADMAP.md).

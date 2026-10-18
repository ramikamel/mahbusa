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
- `checkpoint.pt`: selected numeric state, epoch and seed. This is not yet an
  optimizer/opponent-pool resume checkpoint.
- `parity.json`: Python predictions for real validation inputs and synthetic
  arithmetic probes. Synthetic probes test inference, not legal game states.

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

Next: frozen model policies in headless simulation, resumable outcome/self-play
learning against current/old/strategy pools, then fresh-seed strength comparisons
and tactical regressions. Worker registration, phone timing and public enablement
follow qualification. See [the roadmap](BOT_ROADMAP.md).

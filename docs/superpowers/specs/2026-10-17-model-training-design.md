# Local model training foundation

Continue approved checkpoint9 and run an experimental bootstrap, without claiming
checkpoint10's resumable opponent-pool self-play or qualification complete. No
annotations, public bot, backend, paid compute, UI or worker registry changes.
PyTorch runs locally on CPU in ignored .local/training-venv. Pin torch2.14.1;
Python3.12+ little-endian platforms. Record actual Python/Torch/platform/source
versions. Determinism is for the same environment, not across machines/releases.

## TypeScript feature/model boundary

encodePreRoll(state) validates the existing nonterminal engine state then returns
an owned Float32Array of104 features, schema mahbusa-pre-roll-v1. For distances
1..24 from active's home (Light index d-1, Dark index24-d), emit own count/15,
opponent count/15, own-top bit, opponent-top bit. Then own/off15, opponent/off15,
three own-score one-hot slots0..2 and three opponent-score slots. Canonical color
reflection must be identical; dice/history/future RNG are excluded. No Python
encoding or duplicate game rules. Invalid/sparse states fail existing validation.

Model is104→128ReLU→128ReLU→1sigmoid, returning2P(active wins ROUND)-1. Output
kind round-win-expectation denotes the training target, not calibrated strength.
Weights are30081 little-endian Float32 values (120324bytes), each layer's row-major
[out,in] weights then biases. Manifest extends ModelManifest with architecture
 dense-relu-sigmoid-v1, byteLength, status experimental; fixed versions/dimensions,
SHA256, finite weights and exact bytes must validate before evaluator creation.
Model ID derives from weight checksum, no user name reuse. loadDenseModel(raw,
bytes) uses WebCrypto and owned arrays; evaluate encodes states, predict accepts
104 finite Float32 features in[0,1] and returns value. Pure browser TS, no Node or
PyTorch runtime. Float32 activations, stable sigmoid, reject nonfinite math.

## Automatic data preparation

Node CLI scripts/prepare-training.mjs --dataset DIR --out NEW_DIR --seed VALUE
(default split seed mahbusa-training-split-v1). Only a complete version1 self-play
manifest with matching rules/RNG, SHA256/bytes and counts may be consumed. Stream
one round at a time and hash actual consumed bytes. Validate row format/index/
derived seed/aColor/policy/completed result, score winner>=3 loser<3, turn counts,
example count, pre-roll schema/state and every target from final round winner.
Reject duplicates, bad labels, incomplete data and nonfinite/malformed states.

Split entire round seed by SHA256(JSON['training-split-v1',splitSeed,roundSeed]);
first uint32/2^32 <.2 selects validation, otherwise training. At least one round
per split required. No position-level random split. Write train.f32/validation.f32
records of106 little-endian floats:104features, target probability0|1, round
weight1/roundExampleCount. Round weights make each completed round contribute
equally despite length. Include per-round assignment/example counts and binary
hashes/bytes plus original source/data hash, schema/rules/split versions in a
prepared manifest. Exclusive output directory; initial running, final atomic
complete/failed manifest. Failure partial data must not be trainable. No overwrites.

## PyTorch learner/export/parity

training/train.py --data PREPARED_DIR --out NEW_DIR [--epochs20 --batch-size256
--seed20261017 --learning-rate0.001]. Strict finite/bounded arguments, verified
prepared status/schema/rules, binary hashes/shape/values/targets/weights and split
provenance before training. Read only encoded data, never simulate rules. CPU,
one thread, deterministic algorithms and manual_seed. Adam, BCEWithLogitsLoss;
per-row round weights normalized by training mean weight for unbiased minibatch
loss. Validation metrics use exact weighted BCE/Brier per round. Select the best
validation epoch; this validation is tuning data, not an untouched strength test.
Record initial/final train/validation, constant predictor baseline, epoch history,
round/example counts, split/data/source IDs and runtime configuration.

Export best numeric state to checkpoint.pt, weights.bin, model.json and parity.json
(held-out encoded vectors plus synthetic arithmetic probes with Python outputs).
Export binary through little-endian struct, no numpy required. A running/final
complete|failed training report prevents partial runs looking usable; never
replace existing output. No resume/pool training claimed yet. Model remains
experimental and unregistered publicly even if loss improves.

scripts/verify-model-parity.mjs --model DIR validates loader/checksum and checks
all Python vectors against TS predict with fixed absolute tolerance5e-5, reports
max error/count; nonfinite/invalid/empty probes fail. No tolerance supplied by the
artifact can relax this gate. Repeat same-seed tiny training for deterministic
weight hash; test corruption/schema/dimension checks and parity failures.

Run bootstrap on existing100-round automatic dataset; record actual split counts,
losses, checksum, size, parity and local inference cost, with no strength claims.
Keep data/checkpoints ignored/local. Ordinary CI retains TS/Node/build guards;
a separate CPU training job uses pinned official Torch CPU wheels and small
integration fixtures only, with Node22 and Python3.12. Long batches/tournaments
remain outside CI. Fresh independent review, test-first important fixes, merge/
push and CI. Further learning iterations, frozen model matches and device/offline
qualification remain in roadmap before public enablement.

# Corrective turn ranking

## Intent

Continue the strongest-device-local Mahbusa bot without user annotations. The
last pointwise distilled model won3/200 strategy-control rounds despite zero
avoidable mother exposures on its tuning holdout. Collect positions and rolls
it actually encounters, then teach relative turn preferences. This checkpoint
must deliver real data/training/comparisons, not enable an unqualified bot.

## Design

Use the existing simulation/teacher/learner. Adding only more pointwise examples
would not directly train choices; replacing the network/rules would confound
this iteration. Preserve104inputs,128/128hidden layers and the checked export.
Add an optional ranking objective and a matched pointwise control.

Self-play `--record-turns true` saves owned inputs immediately before policy
choice, with actual expanded dice, position, active and score. Source manifestv3
identifies `rolled-turn-input-v1`; completed rowv2 has `turns` aligned with all
pre-roll examples. Cutoffs still emit no training rows. Defaultv1/v2 sources and
rowv1 remain unchanged. Observer mutation cannot change simulation or policy.
Preparation verifies every recorded input against its pre-roll state and the
seeded dice stream, including opening contests through public rules. It never
substitutes a fresh roll for a recorded one.

Teacher sampling selects at most16 evenly spaced played turns per round for
recorded sources; old sources retain independent-roll sampling. Labels remain
strategy-soft-value-v1 from the next active perspective. Exact round wins remain
in rules/search. Version2 prepared data supports both explicit sampling modes.

Optional preparation `--ranking true` emits preparedv3. Numeric examples remain
106little-endianFloat32 fields. Each round stores ordered group metadata:
`groups:[{signs:[-1|1,...],terminal:boolean}],pairs:integer`. Signs convert
continuation-active values to the choosing player. Groups align exactly with
sampled roots, including empty groups for exact round wins. Any root containing
an exact round win contributes no preference pairs. Other groups choose the
first maximum signed Float32 teacher target, pairing it with every alternative
whose gap exceeds1e-7. Teacher ties generate no contradictory preferences.

Per-split pairs metadata records path `<split>-pairs.bin`, count, byte count and
SHA256; format `best-turn-pairs-v1`,24bytes/record: little-endian
`u32 preferredRow,u32 otherRow,f32 preferredSign,f32 otherSign,f32 gap,f32 weight`.
Rows are global within one split, never across a turn/round/split. Each round's
pair weights sum to1 when it has pairs. Both splits require at least one pair.
Python reconstructs every expected pair from encoded targets/group metadata and
checks counts, indices, signs, gaps and weights, not only the checksum. The Node
held-out report additionally regenerates group metadata and validation pair bytes
from legal turns. Existing validation-root byte reconstruction remains.

The CPU loss is weighted pointwise BCE plus `rankingWeight` times gap-weighted
pairwise `softplus(gap - signedLogitDifference)`. Pair importance is round weight
multiplied by teacher gap, normalized by its mean. A single deterministic Adam
step per pointwise minibatch consumes a deterministic contiguous portion of a
separately shuffled pair order from its own seeded/restored generator; pair count cannot exceed example count. Existing
optimizer counter semantics remain. `--ranking-weight` is finite0..10, defaults1
onv3/0otherwise; positive weight requiresv3. Zero supplies the matched control.
Metrics retain BCE/Brier and add ranking loss, pair accuracy and combined
objective onv3. Lowest validation objective selects the export (BCE for legacy).
Resume stores/inherits/refuses changes to ranking weight and preserves exact
optimizer/RNG/best history. Legacy checkpoints default weight0 and keep their
original mathematics. Exports remain heuristic, never win probabilities.

## Experiment protocol

Freeze code; collect500 complete rounds from a frozen pool with current4a172
and strategy in both directed pairings plus a strategy mirror (weights2/2/1).
Use new fixed collection/split seeds. Prepare16played roots/round with pairs.
Warm-start both controls from4a172, same seed/batch/lr,20epochs, weights0 vs1;
select by their declared validation objectives. Compare parent/control/ranked on
the new held-out roots, parity and three saved tactics. Run100color-swapped pairs
against strategy for each new candidate on the same new fixed match seed.
These are diagnostic comparisons, not model promotion. Do not keep extending
matches/adjusting weight after looking. Preserve artifacts and reject a weak
model honestly. If every collection round is not complete, no training occurs.

## Constraints / acceptance

Node22.18+, Python3.12+, installed Torch2.14.1 CPU1thread. No new dependencies,
manual annotation, paid compute, Python game rules, public/UI/worker registration.
Fresh outputs exclusive; completed manifests/checksums and train/validation
ancestry apply throughout. Run correctness/parity/continuation/invalid-input tests
and unchanged public/offline/worker builds. One fresh final whole-branch reviewer;
fix Important/Critical findings with regression tests. Existing session authority
covers inline execution, incremental commits, merge and public GitHub push.

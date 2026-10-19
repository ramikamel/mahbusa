# Resumable learning from frozen opponent pools

Continue approved checkpoint10: preserve learning state across runs and collect
outcomes against frozen current/old/strategy opponents, without annotations,
paid compute, public/worker enablement or duplicate Python rules. The2/200
bootstrap diagnostic means stronger data and tactical checks are required.

## Learner continuation

Keep fresh training defaults/selected model layout compatible. Add mutually
exclusive --resume DIR and --warm-start DIR to training/train.py. --epochs means
additional epochs; cumulative epochs at most1000. Omitted seed/batch/lr inherit
resume configuration; explicit changes are refused. Fresh/warm defaults remain
seed20261017,batch256,lr0.001. CPU one-thread/deterministic behavior unchanged.

At each completed epoch, save numeric last weights, Adam state, Torch RNG,
shuffle-generator state, global best weights/epoch/loss, initial metrics/history,
data hash, config, split history and exact Python/Torch/platform identity to
resume/epoch-NNNNNN.pt. Atomic resume.json points to a completed epoch file with
SHA256/bytes and format mahbusa-training-resume/version1/status complete. Write
the new file before replacing the pointer; an interrupted/failed later epoch
cannot invalidate the previous committed pointer. Resume is epoch-boundary
recovery, not mid-minibatch recovery. Exports still require complete training.

--resume verifies pointer/version/fixed relative path/bytes/checksum, then loads
with torch.load(weights_only=True,map_location='cpu'). It requires identical
prepared-manifest hash, config and environment, validates state shape/finite
values/history and restores both RNGs plus optimizer. It resumes last weights,
not exported best weights. N+M must match uninterrupted training exactly in the
same environment, including selected weights/history. A failed/running export
can resume its last complete epoch but cannot become a playing opponent.

--warm-start validates a completed selected model through the existing Node
artifact/parity gate, restores its selected Float32 weights and starts a fresh
optimizer/shuffle/epoch selection on new prepared data. Record full parent model,
report and manifest hashes. New training reports contain splitHistory (unique
round seed→train/validation assignments, max100000entries); propagate ancestry
and refuse any reused seed assigned to a different split. Legacy exports remain
playable but lack split history; recreate them with this learner before warm
starting. No claim of fresh strength holdout or calibrated probability is added.

## Frozen opponent pools

Add selfplay:bot --pool FILE, mutually exclusive with explicit --policy/--model.
Pool file: format mahbusa-opponent-pool,version1, entrants1..16 with unique
key /^[a-z][a-z0-9-]{0,31}$/, policy strategy|search|model, model directory only
for model (relative to the config file). Matchups1..64 reference entrant keys
in a/b, with integer weight1..100; duplicate a/b pairs are refused. Resolve all
artifacts once before output; no mutable model names or paths in output.

Resolved snapshot definition holds entrants {key,policyId,modelArtifact} and
matchups {a,b,weight}. Hash JSON.stringify(definition) with SHA256. Record this
definition/hash, raw config hash and selectionVersion sha256-weighted-v1.
Selection for index uses createSeededRandom(rootSeed,
`pool-matchup-v1/${snapshot.sha256}/${index}`).int(sumWeights), cumulative
integer weights in declared order. RNG is independent of dice/action streams.

generateSelfPlayRound accepts policies:[A,B] or legacy policy, never both.
Derived round seed, alternating A color, final-round labels and cutoff behavior
stay unchanged. Pool datasets use existing format/version2 and policy
pool-v1/<snapshot.sha256>. Each row still has version1 and actual A/B policy IDs.
Preparation accepts v1 mirrors unchanged and v2 only after snapshot identity,
model provenance and deterministic per-index matchup are checked. Never trust
arbitrary row policy IDs. Binary shards/round splitting stay prepared version1,
so Python still consumes TS features with no game/pool rules.

## Automatic tactical diagnostic

Commit the three saved actual mother-exposure inputs as versioned fixture data,
not manual annotations. Add check:bot-tactics --model DIR [--out NEW_FILE].
Load through the shared artifact gate, replay chosen complete turns, enumerate
legal alternatives and flag mother singleton when an alternative avoids it.
An immediate game win or forced singleton is not a failure. Include tests for
these exceptions, both colors and corrupt fixtures. Exit0 all pass,2 tactical
failures,1 invalid input. Report model hash, fixtures hash, chosen moves and safe
alternative counts. This is a narrow diagnostic, not a full qualification gate,
and does not filter legal moves or modify the policy.

## Experiments and delivery

Recreate the100-round bootstrap with the new learner (same seed/20epochs) and
check whether selected weights reproduce the original. Freeze a pool: strategy
mirror weight2, strategy/current weight1, strategy/old weight1. Generate500
rounds with new seed pool-learning-data-2026-10-18 and max2000turns, prepare using
pool-learning-split-2026-10-18; keep any cutoff run unusable. Warm start from the
recreated baseline for5epochs, then resume5more, checking a separate uninterrupted
10epoch run for exact selected weights/history. This tests real continuation.

Run tactical diagnostic and fixed100-pair candidate-vs-strategy pilot with seed
pool-learning-pilot-2026-10-18. Report actual wins, mother losses, interval,
timing and failures without promotion. Old/current roles are experiment inputs,
not automatically accepted champions. Preserve local ignored artifacts. Larger
batches, TD learning, orchestration and final qualification remain subsequent
iterations. Full tests/type/build/public/offline/worker guards, fresh review,
incremental commits, authorized merge/push and matching-head CI.

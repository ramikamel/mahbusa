# Automatic self-play evaluation

User revision October16: retire the expert lab and do not require annotations.
Evaluation/data generation must run automatically through self-play. Existing
public Single player remains In development until trained qualification.

Remove the development lab entry/component, its unused case/annotation module,
lab-only tests and usage guide. Revert Board's unused editable option. Retain
historical design/validation records as history, labeled superseded where relevant.
Do not delete any user's exported local files. Public multiplayer/rules unchanged.
Remove retired lab-specific production marker guards/tests; preserve existing
development-scenario guards. No new app screens, backend or persistence.

Add an owned pre-roll observation to simulateRound: onPreRoll(state:PreRollState).
Invoke after opening starter is decided, before fresh dice; after handover; after
game score/reset with previous winner starting. Never emit score>=3 or a terminal
winning board as pre-roll input. Callback gets only copied position/active/score,
no current/future dice or RNG. It cannot mutate game state or dice stream.
Keep policy choice timing separate. Existing trace/outcome behavior must match.

generateSelfPlayRound({seed,index,maxTurns?,policy?}) runs the same default
strategy-v1-greedy on both sides, alternating role/color by index. Derive the
round seed from SHA256(JSON ['self-play-v1',rootSeed,index]), domain-separated from
benchmark seeds. Return round result and owned pre-roll examples labeled -1/+1
according to the FINAL first-to-three winner from that state's active perspective.
Never label from a game winner or a heuristic value. Truncated rounds produce zero
examples. MaxTurns default2000, index integer>=0, seed1..256 chars; no mutation/RNG
leakage. State collection is bounded by the existing round turn limit.
This is automatically labeled outcome data, not weight training.

CLI node scripts/self-play-bot.mjs --seed VALUE --rounds N --max-turns N --out DIR.
Default seed mahbusa-self-play-v1, rounds100 (1..10000), maxTurns2000; --out required.
Stream one completed round JSON per line into rounds.jsonl; store incomplete round
indexes/seeds in manifest instead of giving them fake targets. Process one round
at a time to bound memory. Metadata includes format/version, rootseed, policy ID,
RNG/rules versions, source revision+dirty state, counts/status, SHA256/UTF8 bytes of
JSONL, and incomplete round indexes/seeds. Existing output directory is refused.
Write a final manifest on success or failure; partial files are explicitly failed.
stdout prints manifest, stderr progress. Exit0 complete,2 cutoffs,1 errors.
Do not overwrite previous data. Data remains in ignored .local/.
Dataset excludes dice/action observations in state; result metadata may contain
hashes/outcomes but is not model input. Decisions remain checked through engine.
Initial datasets are diagnostic, not silently approved for training/promotion.

Benchmark default becomes strategy-vs-strategy. Add samePolicy flag and comparison
self-play/control to reports. Identical-policy paired scores must not be represented
as engine improvement: complementary scores are expected by construction.
Random remains an optional sanity control. Saved older versions/model snapshots
will be the reference for promotion; never qualify from self-mirror results.
No annotation/review by user required. Later learned model training, held-out
automatic regression suites and fresh-seed matches replace expert-label gates.

Run a bounded local100-round self-play dataset plus100paired mirror evaluation.
Verify complete results, label balance, checksum/metadata, and no annotations.
Update roadmap to automated positions/outcome data, self-play training/opponent
pools, fixed seed/position holdouts and automated promotion gates. Optional user
feedback can inform rules, but never blocks workflow. Keep dice-aware search,
workers, PyTorch/export/parity, training, device/offline qualification as next work.

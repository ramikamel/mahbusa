# Seeded simulation and paired benchmarks

Roadmap checkpoint 6. Purpose: run complete local rounds through authoritative
TypeScript rules, reproduce failures, and measure the strategy baseline against
explicit opponents. No public bot, training, search, worker or production RNG change.

Use a Node-only SHA-256 counter stream (version sha256-counter-v1). Hash UTF-8
JSON [version, seed, stream, counter], counter starts at zero, read digest words
little-endian. Rejection sampling maps uint32 values to bounded integers without
modulo bias. Dice and each entrant's actions have separate domain labels.
Seeds/stream names are nonempty strings <=256 chars. This replaces the biased
LCG approach for new simulation; existing unrelated test RNG remains test-only.

Policies: random-legal-v1 chooses uniformly among distinct generated complete
results; strategy-v1-greedy chooses the highest ranked complete turn. Also expose
first-legal-v1 for deterministic test controls. A policy receives an owned current
turn input, current score, and only its action RNG. Validate every move through
availableMoves/applyMove, then verify final board/dice/outcome and turn completeness.
Reject illegal, partial or falsely described plans. No dice RNG passed to policies.

Play a first-to-3 round from the real opening contest, fresh opening pair, automatic
handover rolls, immediate wins and previous-winner starts. Default maximum 2000
turns per round; limit returns explicit incomplete result with no winner. No
truncation counted as a win/draw. Record role-normalized scores, games, turns,
passes, mother losses, dice/decision trace hashes and decision timings.
Rules identifier mahbusa-engine-v1; CLI records source Git revision as well.

Each pair uses the same per-pair seed for two fresh rounds with entrant A's color
swapped. The dice stream is replayed from its start in each leg; different play
can consume it differently. Action streams follow entrant role, independent of
seat. Pair seeds derive from JSON [rootSeed,pairIndex]; no future dice revealed.
Report wins/points/mother losses/timings, raw paired results and paired mean score.
For fully completed samples, provide a conservative 95% Hoeffding interval over
bounded pair mean scores: epsilon=sqrt(log(40)/(2*n)). Clamp to [0,1].
If any round is truncated, suppress aggregate win rate/interval to avoid censoring
bias. This is a diagnostic benchmark, not a strength-promotion decision or Elo.
Seeds are a deterministic pseudo-random experiment; inference assumes representative
independent pairs. Qualification still needs held-out positions/seeds and budgets.

CLI: node scripts/benchmark-bot.mjs --seed VALUE --pairs N --max-turns N --out PATH.
Default seed mahbusa-benchmark-v1, pairs100 (1..500), max-turns2000. Default A
strategy, B random; allow --a/--b strategy|random|first. Progress to stderr, report
JSON to stdout and optional explicit output path; no automatic dataset storage.
Use .local/ ignored for local reports. Bad arguments/policy errors exit nonzero;
incomplete sample exits2 after printing its report. Run a bounded diagnostic batch
locally; no model promotion. CI includes short correctness simulations, not tournaments.

Three sequential commits: RNG/contracts; checked round runner/policies;
paired report/CLI/validation. RNG and CLI scaffolding could be parallelized after
interfaces freeze, but execute inline with one fresh whole-branch review.
Node runtime imports use explicit .ts and noEmit allowImportingTsExtensions;
existing Node>=22.18 minimum already supports this. No dependency additions.

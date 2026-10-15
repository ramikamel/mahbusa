# Mahbusa single-player engine roadmap

Agreed October 15, 2026. The public start page/placeholder is complete. The next
authorized work is checkpoints 2–3, not a public bot or training run.

## Product requirements

- Strongest available play, with no deliberately weak difficulty settings.
- Mahbusa rules stay authoritative in the existing TypeScript engine. No GNU
  Backgammon weights and no duplicate Python rules implementation.
- Offline, device-local inference; no login, backend, telemetry, or saved games.
- Difficult turns may think for 3–5 seconds. Target 4 s search / 4.5 s watchdog;
  publish an early validated complete plan, then improvements. A watchdog may use
  only a plan already received; otherwise stop safely and offer retry.
- Maximize first-to-3 round wins, not just pip progress or the current game's
  points. Updated score, previous-winner start, and immediate mother wins matter.
- Single player stays In development until a trained model passes qualification.
- Train locally first. Paid compute requires a separate decision.

## Architecture and strategy

Generate complete turns across different checkers and deduplicate resulting
position/dice/outcome states. A simple exhaustive test oracle precedes shared
memoized legality and turn traversal. Preserve early wins and forced-dice rules.
Generation takes only valid position, active player, and remaining dice. It does
not roll, score, switch players, or construct UI history. Replay its moves through
the public rules engine to award points and advance the game.

Search considers all 21 unordered rolls with probabilities 1/36 for doubles and
2/36 otherwise. Complete shallow chance averages before spending time deepening.
Use deterministic budgets for repeatable tests and foreground time budgets on
devices. Never pass future dice into search. Worker request IDs and game revision
prevent stale results; cancellation terminates/recreates the worker.

An inspectable strategy evaluator seeds development opponents and training:
mother exposure, safe captures, pin location/cover and release pressure,
passing checkers before release, retaining pins through bear-off, supported
movement, mobility, and progress. Preferences never remove legal moves. Tests
must cover strategic exceptions and forced exposure as well as desirable play.

Learned evaluation measures round-win expectation at pre-roll boundaries from
the active player's perspective. The common score scale is [-1,1]; learned
value is 2P(win round)-1, and changing perspective negates value. A heuristic
score uses the same scale but is not labeled a probability.

Train a small PyTorch network locally (initially two 128-unit ReLU hidden layers
and sigmoid output), with Node actors using the actual rules and encoding.
Export Float32 weights, schema/rules versions and checksum to typed-array TS
inference. Verify cross-language prediction parity first. Initial 10,000-round
batches are experimental sizes, not guarantees; use outcome training then
temporal-difference self-play against a mix of old/current/strategy opponents.
Keep datasets/checkpoints local and untracked, approve only validated models.

Before simulation, replace the test-only LCG-modulo dice approach: adjacent
outputs alternate parity, excluding doubles. Use a tested seeded sampler with
unbiased bounded draws, independent action/dice streams, and recorded seeds.
Production crypto dice remain unchanged.

## Commit checkpoints and dependencies

1. **Done:** start page, placeholder and same-device Multiplayer entry.
2. Contracts, literal strategy/rules fixtures, persisted roadmap and scoped plan.
3. Complete-turn reference oracle, optimized generation and equivalence tests.
4. Strategy evaluator and inspectable feature contributions.
5. Development-only expert lab: edit board/score/dice, preview candidates,
   annotate preferred/acceptable/bad plays, explicit JSON import/export.
6. Headless seeded rounds, RNG validation and reproducible paired benchmarks.
7. Dice-aware search, caches, iterative deepening and measured performance.
8. Worker/controller, progress fallback, cancellation and lifecycle tests.
9. Local training environment, shards, model encoding/export and TS parity.
10. Bootstrap data, trained candidate and resumable self-play improvements.
11. Held-out expert review and strength qualification.
12. Development-only bot UI: human color, automatic bot opening/turns, visible
    playback (~180 ms/step), human-turn Undo, reset/back cancellation.
13. Offline model/worker assets, actual iPhone foreground timing, failure recovery.
14. Public enablement with an approved model; retain previous app/model rollback.

After checkpoint 2 freezes interfaces, generator and evaluator work can run in
parallel isolated worktrees; lab UI can use stubs. After 3–4, search, simulation/
training scaffolding, and stubbed controller can run in parallel. Serious data
generation waits for verified legality and inference. Qualification waits for a
trained candidate. Public enablement waits for qualification plus device/offline
acceptance. One coordinator integrates commits sequentially and publishes.

## Qualification and iteration

- Exact tactical fixtures and valid complete turns are hard requirements;
  strategic labels allow multiple acceptable moves and expert disagreement.
- Hold out positions/seeds from tuning; use fresh confirmation seeds for finalists.
- Paired color-swapped matches start at 100 pairs and may extend to 500. A paired
  95% interval must support improvement over baseline/current champion before
  promotion. Inconclusive comparisons do not promote. Compare equal runtime
  budgets; report points, mother losses, round wins and timing. Define the
  statistical stopping rule before running repeated looks.
- Ordinary CI runs correctness, parity, short deterministic simulations, and
  production/offline guards; long training and tournaments run separately.
- Diagnose bad play as generation/evaluation/search/runtime, add regression,
  change one major variable, retrain, compare, review, then promote or reject.
- Initial model sizes/batch counts can change when evidence warrants it. Larger
  models, exact endgames, or cloud training follow measured weaknesses.

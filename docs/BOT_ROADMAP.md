# Mahbusa single-player engine roadmap

Revised October 19, 2026: evaluation runs automatically through self-play; no
annotation or expert-lab work is required from the user. The start page and engine
checkpoints 2–9 plus automatic outcome data are complete. A first experimental
model is trained and passes Python/TypeScript inference parity. Frozen model
opponents now play headless matches and generate model-mirror training data.
Epoch recovery, checked warm starts and frozen mixed-opponent pools now support
learning iterations. Candidate strength and public bot play remain unqualified.

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
Keep datasets/checkpoints local and untracked; promote only automatically
validated models. Group holdouts by round/seed, never by neighboring positions
from the same round. Self-play labels come from the completed first-to-three
round winner, not a provisional game winner. Cutoffs yield no targets.

Seeded simulation uses tested SHA-256 counter streams, unbiased bounded draws,
independent action/dice streams and recorded seeds. Production crypto dice remain
unchanged. Use [automatic self-play](SELF_PLAY.md) to generate reproducible local
outcome data with the strongest current policy on both sides. This supplies data;
it does not update weights itself. The [local learner](BOT_TRAINING.md) prepares
checked round-separated shards, trains and exports experimental weights.

## Commit checkpoints and dependencies

1. **Done:** start page, placeholder and same-device Multiplayer entry.
2. **Done:** contracts, literal strategy/rules fixtures, persisted roadmap and scoped plan.
3. **Done:** complete-turn reference oracle, optimized generation and equivalence tests.
4. **Done:** strategy evaluator, inspectable feature contributions and complete-turn
   ranking with score-aware game/round continuation. Versioned strategy-v1 weights
   are provisional heuristics, not trained probabilities or qualified bot strength.
5. **Retired:** the development expert lab was removed at the user's request.
   Manual move labels are not part of the required workflow; local exports are
   left untouched. Historical plans describe the superseded approach.
6. **Done:** headless seeded rounds, RNG validation and reproducible paired
   benchmarks. See [benchmark usage](BOT_BENCHMARKS.md). Static strategy beat the
   random control in the initial diagnostic; this is not strength qualification.
6a. **Done:** automatic completed-round outcome samples and streaming JSONL,
    dataset checksums/provenance, cutoff/failure protection and strategy mirror
    evaluation. No annotations needed; this checkpoint itself only generates data.
7. **Done:** full-width dice-aware search, bounded local value cache, completed-
   depth iterative updates, deterministic/time budgets and measured performance.
   [Search usage](BOT_SEARCH.md) documents the experimental reference policy and
   pilot limits. Stronger-than-greedy play has not been qualified.
8. **Done:** native search worker/controller, checked progress/watchdog fallback,
   cancellation/replacement/disposal and stale-reply protection. Real Chrome
   lifecycle smoke passed; [worker usage](BOT_WORKER.md) records the API and
   caller revision/cancellation duties. Public bot remains disabled.
9. **Done:** local CPU training environment, round-separated weighted shards,
   canonical104-feature encoding, checked120324-byte model export and TS parity.
   [Training usage](BOT_TRAINING.md) describes the CLI and experimental boundary.
10. **Started:** first100-round outcome bootstrap trained; best validation epoch
    frozen locally. Model policies now run in simulation through one checked
    artifact/parity gate, with full weight identities and recorded provenance.
    Model-mirror and checked mixed current/old/strategy outcomes feed the learner.
    Exact epoch recovery restores optimizer/RNG state; checked warm starts carry
    selected weights and train/validation split ancestry to new batches. The bootstrap is
    unqualified and is not registered in the worker or public app.
    Its first100-pair diagnostic won2/200 rounds against strategy with134 mother
    losses. Strategy remains the reference. Saved automatic mother-exposure
    cases must guide learning/tactical regressions; loss improvements alone
    are insufficient. A20-round model-mirror batch completed the data-to-second-
    candidate loop, without demonstrating stronger play.
    Automatic mother-exposure diagnostics now replay three saved failures, with
    forced-exposure/winning exceptions. Further learning/TD iterations and
    orchestration remain; tactical and fresh-seed qualification must precede
    a development/public bot, regardless of lower prediction loss.
    The500-round frozen pool trained a resumable candidate that passed all three
    saved mother cases but won0/200 strategy-control rounds. It is rejected for
    promotion. Next learning must test strategy-informed ranking/priors or
    stronger search; more outcome-only mirror training is not assumed sufficient.
    Strategy-value distillation is now implemented and measured:193523 legal
    afterstates, checked heuristic exports, held-out turn agreement/regret and
    mother diagnostics. Multi-choice agreement improved24.9%->30.4% and avoidable
    mother exposures33->0 on1616held-out turns; the candidate still won only3/200
    strategy-control rounds and is rejected. Next: teacher corrections on the
    candidate's own encountered positions plus explicit best-turn preferences,
    with fresh-seed matches. Pointwise value imitation alone is insufficient.
    Played-roll corrections and explicit best-turn preference training are now
    implemented and tested. The matched500-round experiment improved held-out
    choice agreement48.1%vs36.8%, but won only10/200 vs the pointwise control's
    8/200 against strategy on the same seeds; strength improvement is inconclusive.
    Both candidates are rejected. Strategy remains the reliable reference;
    prioritize strategy-guided search and diagnosis of concrete multi-turn losses
    before more unqualified imitation-only batches.
    The fixed strategy-search follow-up completed 100 pairs: 107/200 rounds won
    against greedy, with paired 95% interval [39.92%,67.08%]. This is inconclusive
    and does not promote search. The 1000-node limit changed only 1.58% of moves;
    just 20.39% of decisions with alternatives completed lookahead. A 48-root
    development profile at 20000 nodes completed 45/48 versus 23/48, changing
    three additional decisions. Three replayed mother losses were forced on
    the exposing turn; earlier choices need diagnosis. Next: freeze those
    regressions, optimize exact generation/copying, then compare frozen search
    budgets on fresh seeds. [Investigation and next tasks](BOT_SEARCH_INVESTIGATION.md).
    Exact performance work is now implemented: a frozen 57-position corpus and
    three mother-loss histories protect original turns/search choices. Compact
    collision-free keys and owned typed evaluator copies reduced the local
    median sweep 13.36s to 6.70s with identical plans, values and counters.
    [Performance evidence](BOT_PERFORMANCE.md) records limits and reproduction.
    The frozen fresh-seed 100-pair budget comparison is complete: 20000-node
    search won131/200 against1000-node search, paired95% interval[51.92%,79.08%],
    no cutoffs. Multi-choice depth1 completion was85.20%versus21.48%; mother
    losses11versus30. This supports larger search against that smaller control,
    not superiority to greedy or equal-runtime/device qualification.
    [Protocol and result](BOT_BUDGET_COMPARISON.md). Next: freeze unchanged
    larger search versus greedy on100fresh color-swapped pairs, with a single
    prespecified decision and no clock cutoff. Then use actual evidence to
    select confirmation/equal-runtime work or diagnose losing lines. Do not
    retune on completed seeds or enable single player before qualification.
11. Automated strength qualification: fixed tactical regressions, held-out
    positions/round seeds and fresh-seed matches against frozen champions.
12. Development-only bot UI: human color, automatic bot opening/turns, visible
    playback (~180 ms/step), human-turn Undo, reset/back cancellation.
13. Offline model/worker assets, actual iPhone foreground timing, failure recovery.
14. Public enablement with an approved model; retain previous app/model rollback.

After checkpoint 2 freezes interfaces, generator and evaluator work can run in
parallel isolated worktrees. After 3–4, search, simulation/
training scaffolding, and stubbed controller can run in parallel. Serious data
generation waits for verified legality and inference. Qualification waits for a
trained candidate. Public enablement waits for qualification plus device/offline
acceptance. One coordinator integrates commits sequentially and publishes.

## Qualification and iteration

- Legal complete turns and exact tactical/rules regressions are hard requirements.
  Automatically saved self-play positions/outcomes replace required annotations.
  Optional user strategy feedback can add regressions but never blocks progress.
- Mirror self-play checks consistency and generates data. Identical deterministic
  policies have complementary color-swapped scores (50%); that cannot demonstrate
  strength improvement or qualify a model. Compare different frozen versions.
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

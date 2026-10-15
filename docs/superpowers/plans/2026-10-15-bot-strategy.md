# Bot Strategy Evaluator Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans with test-first work
> and one independent whole-branch review. Track steps with checkboxes.

**Goal:** Complete roadmap checkpoint 4, an inspectable development evaluator
and one-turn ranking, without enabling public bot play.

**Architecture:** Analyze valid pre-roll positions and return bounded heuristic
values from a specified perspective. Rank generated turns by their actual round
or next-game continuation, leaving rules, RNG and UI unchanged.

**Tech Stack:** Existing TypeScript, Vitest, Node and Svelte/Vite validation.

**Spec:** docs/BOT_ROADMAP.md, including the user's mother/pin/support principles.

## Global constraints

- No training, worker, UI, RNG changes, or claim of calibrated probabilities.
- Preserve every legal generated turn, including forced mother exposure/release.
- Explain raw feature values, weights and contributions; use tanh(raw/100) in
  [-1,1]. Values are heuristics, not winning probabilities.
- A round-winning outcome is exactly +1 and overrides all positional estimates.
- Assume engine-valid positions. Validate active/perspective and integer scores
  0–2 at the pre-roll boundary; finished rounds use the ranking terminal branch.

## Review focus

- Color/perspective transformations and next-player initiative must be consistent.
- Mother attacks include combined dice/doubles and respect intermediate blocks.
- Normal pin threats/mobility are proxies, not exact full-turn risk probabilities.
- Finished games reset the board, award points once, and let the winner start;
  finished rounds must not reset or evaluate another board.
- Contributions must explain the actual score, with no mutation or hidden RNG.

## Initial strategy-v1 features

Normalize per-player features then score own minus opponent, with these initial
weights: score 180, progress 36, borne off 28, pinned checkers -90, exposed mother
-90, mother-capture roll probability -360, pins 42, pin cover reserves 28,
pieces past pins 18, two-point leverage 28, direct blot pressure -60, isolation
-24, supported checkers 12, single-die mobility 12, initiative 1.

Score uses score/3; progress is 1-pips/360; borne-off/pinned/supported counts use
/15. Pins use location factor 1 + max(0,(7-distance)/6); aggregate pin features
divide by 5 and clamp to 1. Cover reserves use log2(cover)/4; passage uses the
fraction borne off or beyond that pin. Two-point leverage requires opponent
off=0, the captive outside its home, and own score below 2. It is not a forecast
of forced release or a guaranteed two-point win.

Blot pressure counts directly attacking single-die faces, weighted by starting
distance and /15. Isolation is singleton support gap beyond 6 (/18, /15), only
where an unpinned enemy can approach. Mobility is raw legal single-die source
options /90. All are cheap static proxies to improve later with search/reviews.

Mother threat enumerates the 21 weighted rolls and tests monotonic checker
routes to the exposed mother. Reuse rawMoves on a virtual source checker for
blocking; other friendly moves cannot remove an opponent block. Wins stop the
route immediately, so forced use of leftover dice does not invalidate capture.
This is exact immediate mother-capture reachability, not general pin probability.

### Task 1: Explainable position evaluator

**Files:** src/lib/bot/strategy.ts; tests/bot-strategy.test.ts.

**Interfaces:** evaluateStrategy(state: PreRollState): PositionValue;
explainStrategy(state: PreRollState, perspective?: Player): StrategyExplanation;
strategyEvaluator implements PositionEvaluator with versioned id strategy-v1.

- [x] Write real fixture comparisons and exact mother-threat fractions first.
- [x] Run with a neutral stub; protected/exposed mother comparison must fail.
- [x] Implement normalized features, weighted breakdown and bounded value.
- [x] Verify color mirroring, perspective inversion, finite/deterministic output,
  input immutability and invalid score/player rejection; run full suites. Commit.

### Task 2: Rank complete turns and handle terminal values

**Files:** src/lib/bot/rank-strategy.ts; tests/bot-ranking.test.ts.

**Interface:** rankStrategyTurns(input: TurnInput & { score: Pair }): RankedTurn[].
Each row includes plan, value, explanation, continuation (or null for round win),
and kind handover/next-game/round-win. Explanation perspective is input.active.

- [x] Write failing tests for round wins, one-vs-two point outcomes at different
  scores, blocked handover, forced moves, symmetry and preservation of all plans.
- [x] Replay outcome scoring once; next-game continuation uses initialPosition
  and winning starter. Nonwinning turns hand over; stable sorting retains ties.
- [ ] Run focused and full suites, type/build/offline checks and record timing.
  Commit; independent review; integrate and push after checks. No site deployment.

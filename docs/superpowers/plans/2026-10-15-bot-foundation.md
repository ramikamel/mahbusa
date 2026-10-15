# Bot Turn Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans for this scoped work,
> with one fresh whole-branch review. Steps use checkbox syntax for tracking.

**Goal:** Complete roadmap checkpoints 2–3 without changing public gameplay.

**Architecture:** Keep rules authoritative in engine.ts, reuse its private
transition and memoized legality analysis for complete-turn traversal. Bot
contracts are separate from UI history, RNG and score advancement.

**Tech Stack:** Existing TypeScript, Node 22, Vitest and Svelte/Vite checks.

**Spec:** docs/BOT_ROADMAP.md

## Global Constraints

- No bot UI enablement, evaluator implementation, training, or production RNG change.
- Preserve all existing rule outcomes and same-device behavior.
- Each generated plan is complete, unique by final position/dice/outcome, and
  replayable through applyMove. Inputs and separate outputs must not alias.
- Remaining dice are sorted; winning plans clear remaining dice as applyMove does.
- Run existing suites and production/offline build; commit coherent checkpoints.

## Review Focus

- Blocked/empty dice must yield one zero-move pass, not zero plans.
- Alternate winning die orders and mixed-checker moves cannot disappear.
- Immediate wins stop even if dice remain; no score or history side effects.
- Pinned owners cannot move and releasing the last cover restores ownership.
- Cache keys must include remaining dice, including partial doubles.

### Task 1: Contracts and fixtures (roadmap commit 2)

**Files:** src/lib/bot/types.ts; tests/helpers/bot-fixtures.ts; docs/BOT_ROADMAP.md;
docs/PLAN.md; this plan.

**Interfaces:** TurnInput (position, active, remaining), TurnPlan (moves, position,
remaining, outcome), PreRollState (position, active, score), evaluator/worker/model
contracts. No executable evaluator or model loader yet.

- [ ] Save roadmap, contracts and literal fixtures for opening, blocks, forced
  dice, mother capture, pins, unsupported mother, bearing off and doubles.
- [ ] Run Svelte/TypeScript check and existing 36 tests. Commit.

### Task 2: Reference and full-turn behavior

**Files:** tests/helpers/reference-turns.ts; tests/bot-turns.test.ts; src/lib/engine.ts.

**Interfaces:** generateTurns(input: TurnInput): TurnPlan[]. The reference uses
only public checked moves; optimized generation shares no traversal/dedup code.

- [ ] Write explicit expected-result tests for multi-checker play, deduplication,
  blocks, forced order/higher die, doubles, pins, wins, and bearing off; add oracle
  equivalence, both colors, invalid dice/player, immutability and replay checks.
- [ ] Run tests with a stub returning no plans: expected behavior assertions fail.
- [ ] Implement generation and a shared memoized legal-move analyzer. Keep applyMove
  checked; search uses the existing private step only on generated legal moves.
- [ ] Run focused tests, full suites and checks; inspect performance on spread-board
  doubles. Record measurements without promising a device-wide timing guarantee.

### Task 3: Review, integrate and validate (roadmap commit 3)

- [ ] Fresh independent whole-branch review, especially Review Focus above.
- [ ] Address important findings with a failing regression first, then green suite.
- [ ] Production/offline build; confirm public app code is unchanged.
- [ ] Commit implementation and validation record, integrate on main and push.
- [ ] Leave Single player as In development. Next checkpoint is strategy evaluation.

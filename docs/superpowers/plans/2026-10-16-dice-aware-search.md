# Dice-aware Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Execute inline with
> superpowers:executing-plans, then one fresh whole-branch review.

**Goal:** Add deterministic, bounded chance search and automatic evaluation hooks.
**Architecture:** Reuse generated complete turns/shared score continuation;
full-width expectimax with completed-depth publication and per-call value cache.
**Tech Stack:** Existing TypeScript/Node; no UI or dependency changes.
**Spec:** docs/superpowers/specs/2026-10-16-dice-aware-search-design.md

## Global Constraints
- No user annotations, random rollouts or strategic legal-move filters.
- All21 dice outcomes weighted1/36 doubles,2/36 otherwise; four moves for doubles.
- Score once, winner starts next game; sign changes iff active changes.
- Defaults maxDepth2,maxNodes20000,cacheEntries10000; optional budgetMs<=60000.
- Only complete full-root/full-roll iterations may replace baseline.
- nodes excludes mandatory baseline; atomic operations may overshoot time.
- Tables bounded/local; owned states/updates; invalid values throw.
- No trained/public bot or promotion claim; preserve greedy ID/behavior and UI.

## Review Focus
- Same-player next-game continuations must not be negated or double-scored.
- Deadline/node exhaustion partway through later root candidates must retain the
  previous complete iteration, never a mixed-depth winner.
- Cache identity must separate scores, active color, stack top, off and depth;
  incomplete values must never enter the table or survive another call.
- Progress/evaluator mutations must not corrupt gameplay or returned plans.
- CLI policy provenance must distinguish frozen greedy and search configurations;
  a tiny pilot or mirror result must not qualify the candidate.

### Task 1: Complete-turn chance search and bounded iteration
**Files:** new src/lib/bot/continuation.ts/search.ts; modify rank-strategy.ts;
new tests/bot-search.test.ts and tests/helpers/search-oracle.ts.
**Interfaces:** continuationAfterTurn(input,plan) => {kind,state,winner};
searchTurns(TurnInput & {score:Pair}, SearchOptions?) => SearchResult.
SearchOptions/result/stats/update and limits per spec, all exported from search.ts.
- [ ] Write/run failing tests for shared continuation vs public engine, all36
  ordered-roll oracle, literal -17/18 depth1 and -611/648 depth2 forced-pin race,
  next-game perspective, root round win, pass/doubles/mirrored colors.
- [ ] Implement shared continuation, all21 chance recursion, greedy fallback,
  bounded value cache, iterative full-depth updates and budget checks.
- [ ] Prove interrupted iterations retain depth0/last complete depth; exact
  node limits, fake-clock expiry, cache equality, input/evaluator/update ownership,
  invalid options/value/callback failures and unchanged greedy behavior.
- [ ] Run full Vitest/Node and typecheck; commit.

### Task 2: Automatic pilot integration, profiling and roadmap
**Files:** new src/lib/bot/search-policy.ts; modify scripts/benchmark-bot.mjs,
scripts/self-play-bot.mjs and CLI/domain tests; docs/BOT_ROADMAP.md,
BOT_BENCHMARKS.md,SELF_PLAY.md,VALIDATION.md; new docs/BOT_SEARCH.md.
**Interfaces:** createSearchPolicy({maxDepth?,maxNodes?,cacheEntries?}) => BotPolicy;
CLI selection search, self-play --policy strategy|search with actual manifest ID.
Default depth1/nodes1000/cache10000 reference, deterministic ID includes all values.
- [ ] Fail factory/CLI tests for reproducible legal plans, distinct IDs, explicit
  search selection and dataset manifest policy. Preserve strategy defaults.
- [ ] Implement adapter/CLI selectors. Full suite/type/build/offline.
- [ ] Profile opening, contact, spread doubles and bearoff under4000ms; record
  completion depth, work, cache hits and overshoot; eight paired rounds seeds
  against frozen greedy plus small search self-play dataset, inspect provenance.
- [ ] Update roadmap/usage/validation; commit. Fresh review, test-first important
  fixes, integrate/push and verify CI. No public enablement or model training.

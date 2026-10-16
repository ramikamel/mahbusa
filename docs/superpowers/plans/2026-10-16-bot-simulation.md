# Seeded Simulation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, TDD, one fresh review.

**Goal:** Complete checkpoint 6 with reproducible full-round benchmarks.
**Architecture:** Node-only independent seeded streams, checked public-engine
replay and paired color-swapped rounds. Existing strategy is the baseline.
**Tech Stack:** Node crypto, TypeScript, Vitest; no dependencies.
**Spec:** docs/superpowers/specs/2026-10-16-bot-simulation-design.md

## Global Constraints
- No UI, production RNG, training, search or public bot changes.
- SHA-256 counter v1, uint32 rejection; separate dice/action streams.
- Full public-engine first-to-3 rounds; incomplete results cannot become wins.
- Default2000 turns; pairs1..500, default100; explicit JSON output only.
- Report source revision and seed/version; heuristic benchmarks do not qualify bots.

## Review Focus
- Rejection thresholds and zero/maximum bounds cannot bias or hang normal draws.
- Policy mutation/illegal plans cannot corrupt rules, score or conservation.
- Previous-winner starts, mother wins and opening ties use authoritative transitions.
- Paired role/color mapping and incomplete samples must not misstate win rates.
- Runtime Node imports work on project's Node22 floor and no Node code enters app.

### Task 1: Independent seeded random streams
**Files:** src/lib/bot/seeded.ts; tests/bot-seeded.test.ts.
**Interfaces:** SeededRandom={uint32():number,int(bound:number):number};
createSeededRandom(seed:string,stream:string):SeededRandom;
boundedInteger(next:()=>number,bound:number):number; RNG_VERSION constant.

- [x] Write tests: known SHA stream words, seed repeatability/separation,
  reject top remainder values before mapping, bounds/invalid source validation,
  deterministic 36 ordered dice outcomes including doubles and broad count checks.
- [x] Run missing/stub failure, implement, run focused/full suite and commit.

### Task 2: Checked policies and complete rounds
**Files:** src/lib/bot/simulation.ts; tests/bot-simulation.test.ts;
runtime imports in strategy.ts/rank-strategy.ts; tsconfig.json.
**Interfaces:** BotPolicy={id,choose(input:TurnInput&{score:Pair},random:SeededRandom):TurnPlan};
randomPolicy/strategyPolicy/firstPolicy;
replayPlan(game:Game,plan:TurnPlan):Game;
simulateRound({seed,aColor,policies:[BotPolicy,BotPolicy],maxTurns?}):RoundResult.
RoundResult includes complete/turn-limit status, role winner|null, score, turns,
games, passes, motherLosses, hashes and per-role decisionMs/maxDecisionMs.

- [x] Tests fail for bad/partial plans, false result metadata, no mutation,
  immediate mother/bearoff scoring, complete repeatable rounds, independent dice,
  explicit cutoff, role/color mapping. Implement and run focused/full tests.
- [x] Make Node runtime imports explicit .ts, allowImportingTsExtensions under
  noEmit; keep shared rules unchanged. Typecheck and commit.

### Task 3: Paired benchmark and usable CLI
**Files:** src/lib/bot/benchmark.ts; scripts/benchmark-bot.mjs;
tests/bot-benchmark.test.ts; tests/benchmark-cli.node.test.mjs; package.json;
.gitignore; docs/BOT_ROADMAP.md; docs/VALIDATION.md; docs/BOT_BENCHMARKS.md.
**Interfaces:** runBenchmark({seed,pairs,maxTurns,policies,onPair?}):BenchmarkReport;
summarizePairs(results:[RoundResult,RoundResult][]):metrics.
CLI options/defaults and report fields follow spec.

- [x] Fail tests for color-swapped complete pair means/intervals, deterministic
  hashes, censored samples suppressing statistics, bad CLI args and Node import path.
- [x] Implement, run bounded diagnostic match batch and save ignored report;
  include seed, count, points/mother losses and limits. No promotion claim.
- [x] Full suites/typecheck/build/offline, fresh review, fix important findings
  test-first; commit, FF merge, integrated checks, push and CI.

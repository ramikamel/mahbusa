# Corrective Ranking Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline/test-first.
> One fresh whole-branch reviewer; no implementer agents.

**Goal:** Teach preferences on the bot's actual encountered turns and measure a matched control.
**Architecture:** Owned rolled inputs -> checked teacher groups/pairs -> deterministic CPU ranking loss -> checked exports and fixed comparisons.
**Tech Stack:** Existing Node22.18+, TS/Vitest, Python3.12+, Torch2.14.1 CPU1thread.
**Spec:** docs/superpowers/specs/2026-10-19-corrective-ranking-design.md

## Global Constraints
- Preserve104/128/128/1, no new dependencies, manual labels, paid compute or Python rules.
- No public/UI/worker registration; fixed5e-5 parity and split ancestry remain.
- Exclusive outputs, checked completed manifests, frozen model identities.
- Legacy source/prepared/export/checkpoint behavior remains supported.

## Review Focus
- Recorded input observers must not mutate actor inputs or change dice/action streams.
- Preference orientation must handle next-game starts, handovers, ties and exact wins.
- A rehashed pair crossing roots/rounds/splits or changing signs must fail before output.
- Ranking resume must preserve objective/optimizer/RNG when selected best precedes last.
- Imitation metrics, controlled ablations and fresh match evidence must not claim public readiness.

### Task 1: Actual rolled inputs and teacher corrections
**Files:** simulation.ts,self-play.ts,self-play-bot.mjs,teacher-data.mjs,prepare-training.mjs,
training/data.py,teacher-ranking.mjs; tests/teacher-data.node.test.mjs,self-play tests.
**Interfaces:** `recordTurns?:boolean`, sourcev3/rowv2 `turns`, `playedRolls(seed,count)`,
`validateRecordedTurns(row)`, explicit `even-played-turns-v1` teacher sampling.
- [x] RED observer ownership/unchanged seeds, actual rolls including doubles,
  aligned recorded rows, CLI/preparation roundtrip and altered state/dice rejection.
- [x] Implement opt-in records and checked sampling; legacy data stays unchanged.
- [x] Node/Vitest/Python/type guards pass; commit.

### Task 2: Checked best-turn pair shards
**Files:** new scripts/lib/teacher-pairs.mjs,prepare-training.mjs,teacher-ranking.mjs,
new training/ranking.py,training/data.py; Node/Python tests.
**Interfaces:** `teacherGroup(input)`, `buildRoundPairs(groups,startRow)` -> metadata,
bytes; preparedv3 with per-split pair metadata; `load_pairs(...)` numeric validation.
- [x] RED literal sign/tie/terminal pairs, both orientations, binary bytes,
  rehashed index/group/sign/gap/weight corruption, legal validation regeneration.
- [x] Implement generation/reader/report checks and zero-pair refusal. No Python rules.
- [x] Full targeted suites pass; commit.

### Task 3: Deterministic ranking objective and continuation
**Files:** training/ranking.py,train.py,checkpoints.py,training/tests/test_ranking.py,
usage docs.
**Interfaces:** `--ranking-weight 0..10`, metrics/objective, checkpoint config.
- [x] RED gradient orientation and weighted loss, actual CPU loss/paired metrics,
  exact1+1==2 and best selection, warm starts, changed/invalid config refused.
- [x] Implement additional pair order/minibatch slices without changing Adam step
  count; preserve weight0 legacy trajectories and heuristic parity/export gates.
- [x] Full tests/type/public/offline/worker smoke pass; commit.

### Task 4: Controlled real experiment, review and integration
**Files:** docs/BOT_TRAINING.md,SELF_PLAY.md,BOT_ROADMAP.md,VALIDATION.md.
**Interfaces:** Task1 collectedv3 -> Task2 pairedv3 -> Task3 controls -> existing benchmarks.
- [x] Freeze code;500rounds pool2/2/1;16roots/round; same parent/options20epochs
  weight0vs1; parent/control/candidate ranking, parity/tactics,100paired matches
  each on one fixed new seed. Preserve results, record actual acceptance/rejection.
- [x] Record full local verification, preserve evidence and commit experiment docs.

## Final review and integration
One fresh whole-branch review after all task commits; fix Important/Critical
findings RED->GREEN, collect rulings, then merge/push and matching-head CI.

All tasks are sequential: records define groups, groups define loss/continuation,
and frozen artifacts precede comparisons. The final review can run alongside
read-only artifact checks. Current approval is to continue implementing this
roadmap; no repeated approval gate is needed for these local training changes.

# Resumable Pool Learning Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline/test-first;
> one fresh whole-branch review, no implementer agents.

**Goal:** Resume exact CPU learning, warm start across checked batches and collect
outcomes against frozen mixed opponents; diagnose actual mother exposure.
**Architecture:** Checked epoch snapshots separate from selected playing exports;
Node resolves deterministic pool snapshots and validates v2 source datasets.
**Tech Stack:** Existing Node22.18+,TypeScript/Vitest, Python3.12+,torch2.14.1 CPU.
**Spec:** docs/superpowers/specs/2026-10-18-pool-learning-design.md

## Global Constraints
- No public/UI/worker enablement, manual annotations, paid compute or Python rules.
- Resume exact data/config/environment, CPU1thread; safe weights_only loading.
- Epoch pointer atomic/checksummed; last optimizer state distinct from best export.
- Warm start fresh optimizer; inherited split history cannot cross train/validation.
- Frozen pool artifacts loaded once; v1 mirrors unchanged; v2 policies checked.
- Fixed5e-5 parity; no automatic promotion from tactics/loss/diagnostic matches.

## Review Focus
- Resuming a run whose selected best precedes its last epoch must restore the
  last optimizer/RNG while retaining the correct best; interruption keeps old pointer.
- Changed/corrupt data/checkpoints/config/environment and reused seeds with changed
  split must be rejected; weights_only loading must not execute arbitrary objects.
- Pool weights/keys/relative paths and deterministic selection must bind actual
  policy IDs/provenance before play; source tampering cannot invent matchups.
- Mixed A/B/color outcome labels and round holdouts must reach the real learner
  unchanged; cutoff/failed input remains unusable.
- Mother diagnostics must permit forced exposure/immediate wins and report bad
  model decisions honestly; no weak artifact can become a qualified public model.

### Task 1: Exact epoch resume and checked warm starts
**Files:** training/checkpoints.py (new),train.py; training/tests/test_continuation.py
(new),test_training.py.
**Interfaces:** train CLI --resume DIR|--warm-start DIR; resume.json and epoch
state per spec; splitHistory in reports/checkpoints; existing model export stable.
- [x] RED realCPU tests:1+1 equals2epoch weights/history; best-before-last recovery;
  failed next snapshot preserves previous resume pointer; tamper/mismatch/flags
  refused; selected-weight warm start exact initial metrics; split leakage refused.
- [x] Implement helpers/learner continuation with existing CPU math and exports;
  update export-failure injection to target actual checkpoint.pt write.
- [x] Run full Python/TS/Node/type/build guards. Expected all pass. Commit.

### Task 2: Frozen pool generation and verified mixed source preparation
**Files:** scripts/lib/opponent-pool.mjs (new),self-play-bot.mjs,prepare-training.mjs;
src/lib/bot/self-play.ts; tests/opponent-pool.node.test.mjs (new),bot-self-play.test.ts,
training/tests/test_continuation.py,package.json.
**Interfaces:** loadOpponentPool(path),validatePoolSnapshot(snapshot),
selectPoolPolicies(snapshot,seed,index); --pool FILE; source v2/prepared v1.
- [x] RED pure/CLI tests: literal seeded weighted pair sequence, model paths and
  full snapshot hashes, both-color mixed labels, complete6rounds→shards→Python;
  duplicate/invalid weights/keys/models/stray flags/tampered pairing refused.
- [x] Implement shared snapshot/selection before output; preserve mirror seeds,
  labels/defaults and failure handling. No Python pool/game encoding.
- [x] Run full suites/type/build/offline/worker smoke. Expected all pass. Commit.

### Task 3: Tactical diagnostic and real learning iteration
**Files:** scripts/check-bot-tactics.mjs,scripts/lib/mother-tactics.mjs (new),
tests/fixtures/model-tactics-v1.json,tests/bot-tactics.node.test.mjs (new),package.json;
docs/BOT_TRAINING.md,SELF_PLAY.md,BOT_ROADMAP.md,VALIDATION.md.
**Interfaces:** check:bot-tactics --model DIR [--out NEW_FILE], exit0/2/1.
- [x] RED actual model/fixture tests for avoidable mother, forced/immediate-win
  exceptions, both colors, owned legal replay and invalid inputs. Implement.
- [x] Freeze source; recreate baseline,500round frozen pool, warm5+resume5 and
  uninterrupted10 match; parity/tactics/fixed100pair pilot, preserve evidence.
- [x] Document actual results/limits, full verification, commit, fresh review;
  important fixes RED→GREEN, merge/push and matching-head CI.

# Frozen Model Play Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline/test-first;
> one fresh whole-branch review, no implementer subagents.

**Goal:** Make frozen local models play and generate checked outcome data.
**Architecture:** Existing depth0 full-width ranking and dense evaluator; one
Node artifact/parity gate shared by both CLIs. Preserve version1 dataset flow.
**Tech Stack:** Existing TypeScript/Node22.18+, Vitest, CPU PyTorch2.14.1.
**Spec:** docs/superpowers/specs/2026-10-18-frozen-model-play-design.md

## Global Constraints
- No public/worker/UI enablement, annotations, paid compute or Python game rules.
- Policy identity nn-greedy-v1/<full64hexsha>, deterministic depth0 selection.
- Complete/checksum/parity gate before play/output; fixed5e-5 tolerance.
- Existing default CLI, labels/seeds/cutoff/version1 formats remain compatible.
- Local artifacts ignored; no strength promotion from mirror games or loss.

## Review Focus
- Handover sign, game-winning starter/score and exact round wins must use the
  same authoritative continuation as search, including both colors and passes.
- File edits after load must not alter policy behavior or recorded byte hashes;
  incomplete/corrupt/mismatched/parity-failing artifacts must fail before play.
- CLI model flags must attach to the intended entrant; stray/missing paths must
  fail before any output, and full hashes must distinguish frozen opponents.
- Model-mirror labels and identity must remain consumable by preparation and
  the real Python learner, with no cutoff targets or cross-round split leakage.
- Diagnostic comparisons must record timing/cutoffs and never qualify/enable
  a model automatically; old strategy/search defaults must remain unchanged.

### Task 1: Frozen model policy and shared artifact gate
**Files:** new src/lib/bot/model-policy.ts,scripts/lib/model-artifact.mjs,
scripts/lib/resolve-policy.mjs; modify verify-model-parity.mjs,prepare-training.mjs;
tests/bot-model-policy.test.ts,tests/model-artifact.node.test.mjs,
tests/prepare-training.node.test.mjs; helper tests/helpers/model-artifact.mjs.
**Interfaces:** createModelPolicy(DenseModel,sha256):BotPolicy;
loadModelArtifact(dir):Promise<{model,manifest,parityResult,provenance}>;
resolvePolicy(name,modelDirectory?):Promise<{policy,modelArtifact}>.
- [ ] Write RED tests: literal handover move1→0 instead of off with an increasing
  opponent-value/off97 model; own-score2 model picks2point game; exact round win,
  color reflection, ties, replay all fixtures, stable identity/no RNG mutation.
- [ ] Write RED real-file tests: hashes/parity/immutable loaded weights, distinct
  identities, corrupt/incomplete/missing/mismatched/parity-failing exports and
  directory flag validation; source extra digest cannot override consumed hash.
- [ ] Implement shared gate, wrappers and policy using searchTurns depth0;
  no duplicated rules or changed public registry.
- [ ] Run focused tests then full tests/type/build. Expected all pass. Commit.

### Task 2: CLI model opponents and consumable self-play
**Files:** scripts/benchmark-bot.mjs,self-play-bot.mjs; tests/model-play.node.test.mjs;
training/tests/test_training.py,package.json.
**Interfaces:** benchmark --a|--b model with --a-model|--b-model DIR;
selfplay --policy model --model DIR; model provenance as defined by spec.
- [ ] Write RED real-CLI tests: model on A/B/both, full IDs/provenance, mirror
  completion/labels/preparation, cutoffs, bad artifacts/stray flags no output.
  Extend actual CPU export test to invoke both model CLIs.
- [ ] Implement resolve-before-play, optional provenance in reports/manifests;
  preserve default behavior and existing seed/label/output semantics.
- [ ] Run Node tests,190+Vitest, Python integration/type/build/offline/worker
  smoke. Expected all pass, public bundle unchanged. Commit.

### Task 3: Run frozen-model experiments and record evidence
**Files:** docs/BOT_TRAINING.md,BOT_BENCHMARKS.md,SELF_PLAY.md,BOT_ROADMAP.md,VALIDATION.md.
**Interfaces:** actual local bootstrap model and CLI controls from Task2.
- [ ] Run fixed100-pair diagnostic, preserve report and hashes. Generate small
  model-mirror batch, prepare it and train/verify second candidate, exclusive
  .local paths. Record failures/cutoffs as actual results, no promotion.
- [ ] Document commands, actual outcomes/loss/parity/timing, limitations and
  next resumable/pool checkpoint. Full verification then commit.
- [ ] Fresh whole-branch review; important fixes RED→GREEN; merge/push and CI.

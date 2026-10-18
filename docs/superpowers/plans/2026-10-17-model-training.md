# Local Model Training Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline/test-first,
> then one fresh whole-branch review. No implementer subagents.

**Goal:** Produce a checked experimental local model and matching TS inference.
**Architecture:** One authoritative TS encoder, Node round-grouped binary shards,
CPU PyTorch learner/export, checksum-validated browser typed-array evaluator.
**Tech Stack:** Existing TS/Node/Vitest; Python3.12+, torch2.14.1, no numpy or UI.
**Spec:** docs/superpowers/specs/2026-10-17-model-training-design.md

## Global Constraints
- No annotations, duplicate Python game rules, paid compute or public bot.
-104 canonical features; schema mahbusa-pre-roll-v1; model104/128/128/1.
-30081 little-endian Float32 weights/120324bytes; fixed model dimensions/checksum.
- Whole-round deterministic80/20 split;106float records include probability label
  and1/roundLength weight; at least one round in each split.
- Only complete/hash-checked data; exclusive output directories and failure status.
- CPU deterministic same-environment training, fixed parity tolerance5e-5.
- Unqualified artifact stays experimental/local; no worker registry change.

## Review Focus
- Encoding must preserve pins/counts/score and reflected color perspective while
  excluding dice; Python must consume these exact TS features.
- Round targets, seed identity and split provenance must prevent cutoff labels,
  duplicate rounds and neighboring-position train/validation leakage.
- Failed/changed/corrupt input or partial output must not be treated as trainable.
- Float layout, layer order, model schema/checksum and finite inference must fail
  closed; parity tolerance cannot be relaxed by artifact metadata.
- Validation loss is tuning evidence only, never automatic strength promotion or
  permission to enable a model in public/worker gameplay.

### Task 1: Canonical encoder and browser-safe model inference
**Files:** new src/lib/bot/encoding.ts,dense-model.ts; modify types.ts;
tests/bot-model.test.ts.
**Interfaces:** encodePreRoll(PreRollState):Float32Array; constants schema/input;
loadDenseModel(manifest:unknown,bytes:Uint8Array):Promise<DenseModel>, evaluator
plus predict(Float32Array):number; fixed dimensions/weight layout per spec.
- [ ] Fail tests: literal features/score/pins, color reflection, ownership/invalid
  states, hand-calculated dense outputs, checksum/shape/version/NaN tampering.
- [ ] Implement encoder/model; full suites/type/build; commit.

### Task 2: Verified round-level training shards
**Files:** scripts/prepare-training.mjs; tests/prepare-training.node.test.mjs;
package scripts/ignore rules as needed.
**Interfaces:** CLI/output metadata106float records and split hash per spec.
- [ ] Fail CLI tests on real seeded fixtures: exact float inputs/targets/weights,
  stable round disjoint split, metadata/hashes, tampered labels/checksum/duplicates,
  incomplete input, missing split and overwrite refusal/failure status.
- [ ] Implement stream preparation with authoritative validation/encoding, full
  tests/typechecks and commit.

### Task 3: CPU learner, export, parity and experimental bootstrap
**Files:** training/requirements.txt,train.py,tests/test_training.py;
scripts/verify-model-parity.mjs, Node parity tests; package/CI/docs/BOT_TRAINING.md,
BOT_ROADMAP.md,VALIDATION.md.
**Interfaces:** Python CLI/manifest/weights/probes and Node parity gate per spec.
- [ ] Project-local environment and pinned official Torch; fail real tiny CPU
  training/export/repeat-hash/parity and invalid data/artifact/option tests.
- [ ] Implement learner/export/parity; Python tests plus full TS/Node/build guards.
- [ ] Prepare existing100rounds, train an experimental bootstrap, verify TS parity
  and inference timing, document counts/metrics/limits; preserve local artifacts.
- [ ] Add small CPU CI job, fresh review, important fixes RED→GREEN, merge/push/CI.

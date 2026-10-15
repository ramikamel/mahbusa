# Expert Lab Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline with test-first
> domain work and one independent whole-branch review. Track tasks with checkboxes.

**Goal:** Complete roadmap checkpoint 5 so the expert can curate engine positions.
**Architecture:** DEV-only Svelte lab over checked domain validation, canonical
result annotations and existing ranking/replay. No persistence or public bot.
**Tech Stack:** Existing Svelte 5, TypeScript, Vite/Vitest and Node.
**Spec:** docs/superpowers/specs/2026-10-15-expert-lab-design.md

## Global Constraints
- Keep Single player In development; no training, search, worker or RNG changes.
- No new dependencies, backend, storage or public deployment.
- Preserve public board geometry; editable defaults false.
- Explicit JSON import/export; 1 MiB UTF-8, 20 cases, 100 annotations per case,
  IDs80/title160/note4000 chars. Scores0–2, 15 checkers each, full-roll dice.
- Invalid input must not reach ranker; failed import must preserve all cases.
- New analyzed positions preserve previously annotated cases.

## Review Focus
- Malformed mixed stacks, captured mothers and completed boards must be rejected.
- Labels must attach to final result identity, not candidate ordering.
- Editing, loading and failed imports must not silently overwrite expert labels.
- Prefix previews must use checked rules and avoid next-game reset confusion.
- All lab code/styles/entry points must be excluded from production.

### Task 1: Validated case format and checked replay

**Files:** src/lib/lab/cases.ts; tests/lab-cases.test.ts.
**Interfaces:**
- LabInput = TurnInput & {score:Pair}; LabCase={id,title,input,annotations}.
- LabAnnotation={resultKey,judgment:'preferred'|'acceptable'|'bad',note}.
- LabCollection={format:'mahbusa-expert-lab',version:1,cases:LabCase[]}.
- validateLabInput(input:unknown):LabInput; resultKey(plan:TurnPlan):string.
- parseLabCollection(text:string):LabCollection; exportLabCollection(data):string.
- previewTurn(input:LabInput,plan:TurnPlan|null,steps:number):Game.

- [ ] Write failing tests: valid both-color contact/pin and opening inputs; reject
  totals/counts/top/pins/mothers/off/scores/dice violations; reject oversized,
  duplicate/stale and unknown JSON; preserve multi-label round trip and own data;
  checked prefix replay stops at wins, rejects out-of-range step.
- [ ] Run focused tests with missing module/stub; expected meaningful failures.
- [ ] Implement validating/canonicalizing boundaries and checked preview.
- [ ] Run focused/full Vitest and typecheck, expect all pass. Commit.

### Task 2: Development-only editor and expert review UI

**Files:** src/components/lab/ExpertLab.svelte; src/App.svelte;
src/components/Board.svelte.
**Interfaces:** consume Task1, rankStrategyTurns; ExpertLab onClose callback;
Board editable?:boolean defaults false.

- [ ] Run dev browser before adding entry; Expert lab absent, establishing baseline.
- [ ] Build isolated lab editor, presets, full-roll dice, score/player controls;
  explicit Analyze, preserve changed inputs as new cases, export/restart at capacity.
- [ ] Add paged candidates, terminal/continuation copy, checked prefix preview,
  per-feature breakdown, multiple labels and notes; stable result identity.
- [ ] Add explicit JSON export/textarea/file import with replacement confirmation,
  atomic failure and reload warning. Keep drafts distinct from saved case inputs.
- [ ] Gate dynamic lab import and header entry with DEV; support ?lab=1.
- [ ] Typecheck/full tests; Chrome interaction QA for edit/analyze/preview,
  validation, labels, input changes preserving cases, round-trip and failed import,
  keyboard/narrow view and existing multiplayer. Expect no console errors. Commit.

### Task 3: Production exclusion, delivery and roadmap

**Files:** scripts/offline.mjs; tests/offline.node.test.mjs;
docs/BOT_ROADMAP.md; docs/VALIDATION.md; docs/EXPERT_LAB.md.
**Interfaces:** use Task2's unique Expert lab/mahbusa-expert-lab/lab-workspace markers.

- [ ] Write failing Node packaging tests for lab JS/CSS markers.
- [ ] Extend guard to cover JS and CSS; run Node/full suites/typecheck/build.
  Expect all pass and no markers in production assets.
- [ ] Chrome production smoke with ?lab=1: no lab, placeholder and multiplayer
  work. Record scope, usage, test count and practical limits. Commit.
- [ ] Fresh independent read-only whole-branch review; fix important findings
  test-first. Finish verification, FF merge main, push, and check CI.

# Automatic Self-Play Implementation Plan

> **For agentic workers:** Execute inline with superpowers:executing-plans,
> test-first domain work and one fresh whole-branch review.

**Goal:** Replace required expert annotation with automatic self-play evaluation/data.
**Architecture:** Retire lab UI; expose owned pre-roll simulation samples; label
completed rounds by final round outcome; stream versioned local JSONL and compare
both colors automatically. No learned model or public bot in this checkpoint.
**Tech Stack:** Existing TS/Node/Svelte, no new dependencies.
**Spec:** docs/superpowers/specs/2026-10-16-automatic-self-play-design.md

## Global Constraints
- User never has to annotate, curate or approve moves to advance the engine.
- Same strongest current policy on both sides; random only optional sanity control.
- Targets use completed ROUND winner, not game winner or heuristic.
- No dice/future RNG in pre-roll examples; callback/data ownership cannot alter play.
- Incomplete rounds have no targets; output existing directories refused;
  one-round memory bound, failure manifest and dataset hash required.
- No training claim/public enablement; preserve human multiplayer.

## Review Focus
- Round winner/color mapping and later-game score boundaries cannot mislabel data.
- Observation mutation must not change outcomes/dice or leak rolled/future dice.
- Cutoffs/write failures must never appear as a completed training dataset.
- Identical-policy mirror win rates cannot be called improvement.
- Retirement must remove lab entry without deleting local exports or changing rules.

### Task 1: Retire lab and expose automatic outcome samples
**Files:** App.svelte, Board.svelte; remove components/lab/ExpertLab.svelte,
lib/lab/cases.ts, tests/lab-cases.test.ts, docs/EXPERT_LAB.md;
simulation.ts; new self-play.ts and tests/bot-self-play.test.ts.
Also retire only lab-specific offline guard tests/markers.

**Interfaces:** simulateRound RoundOptions gains onPreRoll?:(state:PreRollState)=>void.
generateSelfPlayRound({seed:string,index:number,maxTurns?:number,policy?:BotPolicy})
returns {format:'mahbusa-self-play-round',version:1,index,result,examples:
{state:PreRollState,target:-1|1}[]}. Owned states and final outcome targets.

- [ ] Add failing tests: copied pre-roll state has no dice, true round boundaries,
  repeatable correct final labels for both active colors, cutoff no examples,
  observer mutation isolation, invalid index/seed. Missing/stub fails.
- [ ] Implement simulation hook and automatic examples with authoritative transitions.
- [ ] Remove lab-only code/entry/annotation dependencies. Full suites/typecheck,
  development browser smoke home/multiplayer without lab, commit.

### Task 2: Streaming self-play CLI, mirror benchmark and revised roadmap
**Files:** scripts/self-play-bot.mjs; tests/self-play-cli.node.test.mjs;
benchmark.ts; benchmark-bot.mjs; benchmark tests; package.json;
docs/BOT_ROADMAP.md/BOT_BENCHMARKS.md/SELF_PLAY.md/VALIDATION.md.

**Interfaces:** CLI flags/status/files per spec; runBenchmark report adds
samePolicy:boolean, comparison:'self-play'|'control'. Default A/B both strategy.

- [ ] Fail CLI tests: completed JSONL targets/checksum/manifest, cutoff no fake data,
  output overwrite refusal, bad flags; mirror report flags/defaults.
- [ ] Implement streaming generation, final failure/partial status, manifests,
  default self-play evaluation. Full suites/type/build/offline.
- [ ] Run100self-play rounds and100paired mirror cases; inspect labels/checksum
  and metadata, no promotion claim. Document and commit.
- [ ] Independent review, important fixes test-first, integrate/push and CI.

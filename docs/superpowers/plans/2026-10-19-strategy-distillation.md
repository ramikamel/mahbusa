# Strategy-guided value learning

The outcome-only network lost all 200 strategy-control rounds. Teach the same
104/128/128/1 network the stronger strategy evaluator on complete-turn alternatives,
then measure actual choices. This is heuristic distillation, not a round-win
probability or a claim of stronger play. Keep public single-player disabled.

## Sequential commits

1. Add deterministic teacher afterstates to checked dataset preparation. Reuse
   source checks, round splits and encoding. Sample up to 16 evenly spaced turns
   per round, derive independent dice from round/turn identity, enumerate complete
   legal alternatives, and label nonterminal continuations from their active
   player's perspective. Exact round wins stay in rules/search. Version2 prepared
   shards explicitly identify the teacher/soft-target semantics and preserve a
   checked validation-turn sidecar. Outcome version1 stays unchanged.
2. Let the CPU learner consume checked soft targets; preserve exclusive outputs,
   resume/warm-start ancestry, parity and numeric architecture. Export heuristic
   value semantics and reject inconsistent artifacts. Add a checked held-out
   turn-ranking report: agreement (including ties), teacher regret, mother
   exposure and source/model identity. These are imitation metrics, not strength.
3. Run a frozen local experiment, validate parity/tactics, compare 100 paired
   matches against strategy on a fixed new seed, and record acceptance/rejection.
   Compare the prior rejected network on the same ranking holdout. Do not tune on
   match seeds or promote from loss/agreement alone. Commit evidence and docs,
   integrate/push and require matching-head CI.

Implementation is sequential because data semantics determine learner/export and
report contracts, and experiments require frozen code. No parallel agents needed.

## Validation

- Literal deterministic rolls, both-color handover and next-game perspective,
  forced/pass turns and exact round wins; labels from legal alternatives rather
  than completed outcomes. Source corruption, cutoffs, invalid options fail.
- Real prepared data -> CPU learner -> checked TypeScript artifact; soft labels
  refused under outcome schema, invalid teacher/version/shards/audit refused.
- Teacher-valued exports report heuristic kind; legacy artifacts still load;
  mismatched report/manifest semantics fail. Continuation equality remains exact.
- Held-out report uses only validation rounds, verifies sidecar/count/identity and
  replays legal policy moves, including immediate wins and tied teacher choices.
- Full Vitest, Node, Python, Svelte and public/offline/worker smoke builds.

## Progress

- [x] Teacher data
- [x] Learner and ranking report
- [x] Actual experiment, documentation and integration

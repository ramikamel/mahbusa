# Larger search versus greedy, October 21, 2026

The preceding [budget comparison](BOT_BUDGET_COMPARISON.md) supported 20000-node
search over 1000-node search. It did not test that larger search against greedy.
This follow-up changes only the opponent and independent seed stream; it does
not tune the evaluator or engine on the preceding results.

## Protocol, frozen before matches

- A: `expectimax-v1/strategy-v1/d1/n20000/c10000`, unchanged search and strategy
  evaluator. B: `strategy-v1-greedy`, unchanged full-turn greedy ranking.
- Root seed: `strategy-greedy-control-2026-10-21`. Exactly 100 color-swapped
  pairs/200 first-to-three rounds, max2000turns per round. No optional stopping,
  result-dependent extension, weight changes or clock cutoff.
- Pair i uses SHA-256 of UTF-8 JSON `[rootSeed,i]`, i=0..99. Each pair runs A
  as color0 then color1; both legs restart the same dice stream. Subsequent
  consumption may diverge as their game paths diverge. Neither policy sees
  future dice. Moves replay through the authoritative checked game rules.
- Primary decision: the paired 95% Hoeffding interval from 100 independent pair
  scores, not 200 independent rounds. Any turn-limit cutoff suppresses aggregate
  win rate/interval; a cutoff is not a draw. An interval containing50% is
  inconclusive. An interval entirely above50% supports this larger search
  against frozen greedy; entirely below50% favors greedy. Inspect outcomes only
  after the fixed run finishes. This is one diagnostic, not release qualification.
- Report round wins, points, mother losses, games, turns, passes, cutoffs and
  paired interval. Report search completion, node/cache work, stop reasons,
  root widths and deviations from its own depth-zero baseline. These counters
  describe encountered positions, not a paired identical-root comparison.

## Execution and integrity

Four local Node processes own global indices `i % 4`, one per partition. Before
the run, compare instrumented execution to ordinary sequential `runBenchmark`
with factory policies on a separate smoke seed; all non-clock fields and
trace/dice hashes must agree. Check duplicate-worker exclusion and immutable
pair publication separately before freezing the wrapper.

Freeze clean source revision, Node version, policy IDs and wrapper SHA-256 in a
manifest before workers begin. Exclusive partition locks prevent duplicate
workers; unique temporary directories and non-replacing hard links publish
fully written pair records. Preserve completed pairs. On pause/resume, require
the same source/script/Node identities and run missing pairs only. A stale lock
may be removed only after confirming its recorded process has stopped; do not
start a replacement while that process can still publish.

After all four workers exit, require each index0..99 exactly once in canonical
order. Regenerate pair seeds, role mappings, raw file hashes, aggregate metrics
and search counters with a separate verification pass. Back up immutable
artifacts byte-for-byte to the canonical checkout before recording results.

No paid compute or public enablement. Contended four-process desktop timing is
diagnostic, not isolated latency, equal-runtime evidence or an iPhone guarantee.
The greedy opponent uses much less compute. Preserve the prior frozen wrapper
and results unchanged; use a separate wrapper and artifact directory for this run.

## Result and next decision

Pending the frozen run. Reproduce the pair definitions sequentially with:

```sh
pnpm benchmark:bot --a search --a-search-nodes 20000 --b strategy --pairs 100 --max-turns 2000 --seed strategy-greedy-control-2026-10-21 --out .local/strategy-greedy-control-2026-10-21.json
```

If supported, retain the larger search as an experimental candidate and move
to equal-runtime/device qualification and concrete tactical loss diagnosis.
If inconclusive or worse, inspect losing lines and search horizon/evaluation
before another large experiment. Do not retune on these seeds, rerun until a
preferred result, restart unqualified neural batches, change public defaults,
or require human annotations. Development UI/public release are separate steps.

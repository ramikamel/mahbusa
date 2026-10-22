# Larger search versus greedy, October 21–22, 2026

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

All 100 pairs/200 rounds completed, with no cutoffs. Search won125–75 (62.5%);
the paired 95% Hoeffding interval is [48.91898%,76.08102%]. It contains50%, so
the fixed comparison is **inconclusive**. Do not promote the policy or extend
this run to obtain a preferred result. The win count and fewer mother losses
are useful diagnostic observations, not a passed qualification gate.

| Metric | A: 20000-node search | B: greedy |
| --- | ---: | ---: |
| Round wins | 125 | 75 |
| Points | 494 | 341 |
| Mother losses | 13 | 24 |
| Decisions | 26796 | 26734 |

There were53530turns,551games and3124passes. Search completed depth1 on
23342/26796decisions (87.11%) and changed4246moves from its own depth-zero
baseline (15.85%). Among21729turns with alternatives,18379completed depth1
(84.58%). It stopped at the node cap3329times and found125immediate round
wins. Work totals:170545907uncached visits,16108212cache hits. These counters
describe encountered positions, not identical-root comparisons.

Summed decision clocks were8224293.870ms for search and14191.590ms for greedy;
per-policy means306.922ms and0.531ms, maxima13536.880ms and70.384ms. The run used
four contending local processes and included a brief process sample. These are
diagnostic desktop clocks, not isolated timing, equal-runtime evidence or phone
latency. The13536.880ms maximum warrants a separate isolated investigation;
it does not identify which engine operation was slow or predict phone latency.

The user paused after53pairs on October21 and resumed on October22. All53saved
pairs were preserved; only missing pairs ran after source/script/Node identity
checks. All four resumed workers exited0. Manifest-to-report elapsed time is
80948317ms and includes the overnight pause and aborted unfinished work; it is
not active compute time or a performance comparison.

Next work is diagnosis, not another large unchanged tournament:

1. Freeze automatic replay cases from the first three search mother-loss rounds
   in canonical pair/color order, including the preceding own decisions. Verify
   original dice/trace hashes before classifying forced versus avoidable exposure.
   Inspect earlier choices where the final exposure is forced; do not assume a
   different legal move would have won the round.
2. Separately replay the two rounds with the largest recorded search-decision
   maxima, freeze their broad decision positions and run an isolated deterministic
   profile. This is development selection, not a strength holdout. Distinguish
   turn generation, evaluation and discarded partial lookahead before optimizing.
3. After the cases are frozen, tactical diagnosis and profiling can proceed in
   parallel. Any evaluator/search/runtime fix follows those findings sequentially,
   changes one major variable, and protects legal turns and completed-depth
   behavior with regressions. Use a new prespecified seed set for later matches.

Keep public defaults unchanged. Single player remains in development; tactical,
bounded runtime, device/offline checks and strength qualification still precede
release. No human labels or annotations are required.

## Reproduction and integrity

Reproduce the pair definitions sequentially with:

```sh
pnpm benchmark:bot --a search --a-search-nodes 20000 --b strategy --pairs 100 --max-turns 2000 --seed strategy-greedy-control-2026-10-21 --out .local/strategy-greedy-control-2026-10-21.json
```

Frozen clean source: `9ba932bc821f1bff374c7cc7d51fa943cead42f9`, Node `v26.11.1`.
The only tracked change from the preceding checkpoint was this protocol; app,
rules, evaluator and search code stayed unchanged. Pre-run261Vitest tests and
eight real CLI tests passed. Independent pre-run review reran the separate
two-pair/eight-turn smoke and duplicate-lock/immutable-publication checks.

Aggregation checked all100indices exactly once. A separate verifier regenerated
metrics without importing the benchmark summary helper, derived seeds/role
mappings, raw hashes and all counters. An additional check confirmed all200
completed-round terminal scores. There were no cutoffs or incomplete pair files.

All103run artifacts are preserved byte-for-byte in both local checkouts under
`.local/greedy-control-2026-10-21/`, together with scripts and execution logs.
These are local research artifacts, excluded from the app and Git. SHA-256:

- Wrapper: `dc814bf6ac5cd1d00ffa4c9546ef39010e340d3b49df825594294a66ec4904ab`.
- Manifest: `2ba82b8e24ea8be86dfe0cf37c8dd6a4784caf7fbc6bc589153cc4ba8fb59765`.
- Report, including all100pair hashes: `e20e5266e3fadbf9fcf6505dbd0ceb549d8f3290130c9da17992c61528bf818d`.
- Verified summary: `00ede146e76bfb39f11d01112028ac6f4a1340610424a3817be35125eb6d44cd`.

# Frozen search-budget comparison, October 21, 2026

Purpose: determine whether the additional complete lookahead enabled by the
exact performance improvements wins more rounds. The previous 1000-node versus
greedy study was inconclusive; the 57-root corpus establishes equivalence and
speed, not strength.

## Protocol, frozen before matches

- A: `expectimax-v1/strategy-v1/d1/n20000/c10000`.
- B: `expectimax-v1/strategy-v1/d1/n1000/c10000`.
- Seed: `strategy-budget-control-2026-10-21`; exactly 100 pairs/200 first-to-three
  rounds, maximum 2000 turns per round. No result-dependent stopping or extension.
- Pair i uses SHA-256 of UTF-8 JSON `[seed,i]`, i=0..99, just as `runBenchmark`.
  Run both colors with A's color0 then1. Each leg restarts the same dice stream;
  its subsequent consumption may diverge as the games diverge.
- Both policies use the same frozen rules, strategy evaluator, complete legal
  turns, score continuation and cache size. Depth is1. Neither consumes future
  dice or changes weights during the matches.
- No clock cutoff: fixed node work preserves reproducibility. This compares
  different compute budgets; it is not equal-runtime or device qualification.
  Report all wins, points, mother losses, cutoffs and paired95% Hoeffding interval.
  Any cutoff suppresses win rate/interval; it is not a draw.
- Record per-policy completed depths, stop reasons, cache/node visits, root
  widths and moves changed from that policy's depth-zero baseline. These are
  descriptive on each policy's encountered positions, not paired evaluations
  of identical roots.

Run the independent pairs in four local Node processes, assigning pair i to
worker `i % 4`. Validate this orchestration against a short ordinary sequential
benchmark before the frozen run. Instrumented policies must produce identical
trace/dice hashes to their uninstrumented factories on that smoke seed.
Save completed pairs atomically, with global indices, pair seeds, frozen source
and script identities. Never overwrite a completed pair. A pause can resume
only missing pairs under the same identities; partial work yields no winner.
Final aggregation must contain each index0..99 exactly once in canonical order
and regenerate all metrics from the raw results.

Source and scripts are frozen before workers begin; record clean Git revision,
Node version and script checksum in the run manifest. CPU contention makes the
parallel clocks unsuitable as isolated latency measurements. Do not infer phone
timing from these results. The timing corpus remains the separate desktop probe.

## Decision rule and follow-up

Assess the one fixed 100-pair result after all pairs complete. An interval
containing50% is inconclusive and does not promote a policy. An interval entirely
above50% supports the larger budget against this frozen smaller control in this sample;
it does not establish superiority to greedy, strength against experienced humans,
or equal-runtime/device qualification. Do not promote a learned model or enable
public single player in this checkpoint.

After recording the result, choose the next task from the evidence: a fresh-seed
confirmation/control comparison if warranted, or diagnosis of the losing lines
and evaluator/search horizon before another large run. Keep the raw artifacts
locally and update the roadmap with the actual result, including uncertainty.

## Result

Completed all 100 pairs/200 rounds, with no cutoffs. The larger budget won
131–69 (65.5%); the paired 95% Hoeffding interval is [51.91898%,79.08102%].
This supports the larger search against the smaller frozen search. It does not
establish superiority to greedy or qualify public single player.

| Metric | A: 20000 nodes | B: 1000 nodes |
| --- | ---: | ---: |
| Round wins | 131 | 69 |
| Points | 517 | 335 |
| Mother losses | 11 | 30 |
| Decisions | 26822 | 26751 |
| Changed from own greedy baseline | 4226 (15.76%) | 460 (1.72%) |
| Completed depth1 | 23481 (87.54%) | 8859 (33.12%) |
| Completed depth1 with multiple choices | 18621/21856 (85.20%) | 4504/20973 (21.48%) |
| Node-budget stops | 3210 | 17823 |
| Immediate round wins | 131 | 69 |
| Uncached visits | 169220718 | 19881793 |
| Cache hits | 16093126 | 3163332 |

There were 53573 total turns, 556 games and 3055 passes. Search counters describe
different encountered positions, not identical-root comparisons. The four-worker
run took 1895.678s wall time. Summed decision clocks were 6510189.708ms and
639005.392ms; maxima were 5104.314ms and 282.304ms. These contended desktop clocks
are diagnostic only, not phone latency or an equal-runtime comparison.

Next: freeze a fresh-seed 100-pair comparison of the unchanged larger search
against greedy strategy, with the same no-clock deterministic controls and one
prespecified decision. Keep promotion separate: equal-runtime comparisons,
tactical regressions and actual iPhone timing still remain. Do not retune on
these seeds or restart outcome-only neural training based on this result.

## Reproduction and integrity

Clean source: `c84a1e76da69057b9e2947436de758122ee0ae16`, Node `v26.11.1`.
The CLI reproduction command is in [benchmark usage](BOT_BENCHMARKS.md); the
local parallel wrapper changes execution order, not pair definitions or behavior.
The short orchestration smoke matched ordinary sequential benchmark trace/dice
hashes and all non-clock fields before the frozen run. All four workers exited0.
Aggregation and a separate verifier checked all 100 indices, derived pair seeds,
color-role mappings, raw file hashes, counters and regenerated paired metrics.

Artifacts are preserved under `.local/budget-control-2026-10-21/` in both local
checkouts, with identical bytes. They are research artifacts, excluded from the
app and Git. SHA-256:

- Wrapper: `b0f0c4b28807686b4cbde363db6907b4090df4ad1f24fa135d7870048e82edd6`.
- Manifest: `d656eb7756824fe6ed26b0a90d7f31a2e9e4a9f95448f2f7688dcbb1a87b2709`.
- Report (including all pair-file hashes): `3778d006dc5edf4640e1be307b7a4ace71f146e357edeedde4b7f7f6ee6cff10`.
- Verified summary: `20e55ab140ea787667d405d030aada3d1c9901b1fabf9b4db8a0a837e28eff00`.

The frozen private wrapper requires exactly one process per partition. Its shared
temporary filename is unsafe for duplicate instances of the same worker; use
unique, exclusively created temporary files before reusing it with duplicate
worker protection. No duplicates ran here. Preserve this original script for
provenance rather than changing it after the experiment.

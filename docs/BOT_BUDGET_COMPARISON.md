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
containing50% is inconclusive and does not promote a policy. A positive interval
supports the larger budget against this frozen smaller control in this sample;
it does not establish superiority to greedy, strength against experienced humans,
or equal-runtime/device qualification. Do not promote a learned model or enable
public single player in this checkpoint.

After recording the result, choose the next task from the evidence: a fresh-seed
confirmation/control comparison if warranted, or diagnosis of the losing lines
and evaluator/search horizon before another large run. Keep the raw artifacts
locally and update the roadmap with the actual result, including uncertainty.

## Result

Pending the frozen run. The CLI reproduction command is in
[benchmark usage](BOT_BENCHMARKS.md); the local parallel wrapper changes execution
order, not the pair definitions or policy behavior.

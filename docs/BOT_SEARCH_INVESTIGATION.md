# Strategy search investigation, October 19, 2026

Purpose: establish whether the existing strategy-guided expectimax deserves
further investment after learned candidates consistently lost to greedy strategy.
This is an automatic research checkpoint; it does not enable a public bot.

## Frozen protocol

Record this protocol before starting the experiment. Use the existing
`expectimax-v1/strategy-v1/d1/n1000/c10000` against `strategy-v1-greedy`, without
changing either policy. Run exactly 100 color-swapped pairs, seed
`strategy-search-control-2026-10-19`, maximum 2000 turns per round. Do not stop
early based on results. Record the complete source revision and clean status.

Use the benchmark's paired Hoeffding interval, all wins/points/mother losses and
cutoffs. Add descriptive search counters: completed depth, stop reason, root
candidate counts, node/cache visits and how often the final move differs from
the mandatory depth-zero baseline. Instrumentation must not change the selected
plan, random streams or node budget. Preserve raw round results locally.

This comparison measures benefit from additional compute; the policies have
unequal compute budgets. Even a positive result cannot establish equal-budget
qualification or justify public enablement. It is a fixed diagnostic, not an
adaptive promotion tournament.

After the match, profile 48 actual played roots from the existing corrective
dataset: the first 12 completed records, each at indices
`floor((turns.length - 1) * q)` for q = 0, 0.25, 0.5, 0.75. These are development
positions, not a new held-out qualification set. Preserve full roots and source
dataset checksum. For each, compare depth 1 with 1000 nodes against depth 1 with
20000 nodes, both cache capacity 10000 and a cooperative 4000 ms cap. Record
completion, nodes, wall time, changed moves, root width and all returned values.
Run profiles after the tournament so their CPU load does not distort its clocks.

Questions:

1. Does existing search beat greedy in this fixed sample, and with what uncertainty?
2. How much of the time is search actually finishing lookahead?
3. Does increasing work finish more roots and change decisions often enough to
   motivate a larger experiment?
4. Is the next useful task better search efficiency, evaluator improvement, or
   a development bot for human play? Answer from the measurements, without
   treating completion depth or heuristic values as proof of stronger play.

## Results

Completed October 19; analysis completed October 20 after a requested pause.
Both the tournament and the 48-position profile used clean source
`57065dc41a6702572d079ccfd2c75d8e01ce989e`, Node 26.11.1. The added observer was
checked against the uninstrumented policy on a 24-turn seeded replay: identical
move-trace and dice hashes. No engine, evaluator, search limit or public UI changed.

### Fixed 100-pair tournament

| Metric | Search | Greedy strategy |
| --- | ---: | ---: |
| Rounds won | 107 | 93 |
| Points | 442 | 404 |
| Mother losses | 15 | 25 |
| Total decision time | 1246.047 s | 18.806 s |
| Maximum decision | 362.762 ms | 82.639 ms |

All 200 rounds completed, with zero cutoffs: 55467 turns, 564 games and 3503
passes. Search's paired score was 53.5%; the benchmark's conservative 95%
Hoeffding interval was [39.9189848%, 67.0810152%]. **Inconclusive; no promotion.**
Search consumed about 66 times as much decision time. Its apparent 7-point round
advantage and fewer mother losses do not establish stronger play. Wall time was
1274.621 s; local timings include instrumentation and are not device guarantees.

Across search's 27739 decisions:

- 18400 stopped at the node limit, 9232 completed depth 1 and 107 returned an
  immediate round win. Depth-zero results include those exact wins, not just
  budget fallbacks.
- Only 439 decisions (1.58%) changed the mandatory greedy baseline.
- 5842 turns (21.06%) had one legal complete result, where search could not
  change the move. Of the 21897 turns with alternatives, only 4464 completed
  depth 1 (20.39%).
- Root widths 11..50 completed depth 1 on 856/11091 turns; widths above 100 did
  so on only 2/654. The budget is especially ineffective on wider decisions.
- There were 20432025 uncached visits and 3355887 cache hits. Search elapsed
  median/p95/p99 were 47.861/100.415/164.782 ms.

### Larger-budget development positions

| Metric, 48 roots | 1000 nodes | 20000 nodes |
| --- | ---: | ---: |
| Completed depth 1 | 23 | 45 |
| Node-limit stops | 25 | 3 |
| Time-limit stops | 0 | 0 |
| Moves different from greedy | 8 | 11 |
| Median wall time | 44.327 ms | 56.008 ms |
| p95 wall time | 105.548 ms | 878.905 ms |
| Maximum wall time | 123.334 ms | 1100.287 ms |

The larger budget changed only three additional decisions. It supplies more
lookahead on these development roots, not evidence that those decisions win
more rounds. The deterministic sample includes opening positions and is not
a worst-case, held-out or iPhone workload. Both versions retained every legal
root and the last completed iteration; neither silently used partial averages.

### Mother-loss diagnosis and CPU profile

Replayed the first three round results with search mother losses and verified
their original full-round trace/dice hashes. Each last search turn before a
mother capture was also the first turn in that game to leave the mother alone.
All complete legal alternatives exposed it: respectively 3/3, 1/1 and 1/1.
Two of those turns completed depth 1; one exhausted its node budget.

The exploratory traceback preserves the earlier decisions in each game. For
example, earlier non-forced decisions at turns 169, 277 and 138 all fell back
to depth zero; the nearer decision at turn 171 in the first loss completed
depth 1. This identifies useful replay roots for investigating how
the bot becomes trapped; it does **not** prove those choices caused the loss,
that another line wins, or that all 15 mother losses were unavoidable.

An additional CPU sample on October 20 replayed the first 12 profile roots at
depth 1/20000 nodes/4000 ms. In that roughly 2.75-second sampled run,
`structuredClone` accounted for about 23% of self samples; the engine's state-key
function and its point mapper about 22%; turn traversal about 12%; and raw move
generation about 8%. Startup and GC are included. These are local diagnostic
samples, not a promised speedup or a representative profile of every turn.
In particular, removing evaluator copies would break the existing mutation
isolation contract; any faster implementation must preserve that protection.

## Next commit-sized tasks

1. **Done: freeze a performance/regression corpus.** Preserve the 48 development roots,
   the three mother-loss histories and a few broad doubles. Verify legal replay,
   complete-turn identity, stable ties, score continuation and evaluator/observer
   mutation isolation. Keep performance measurements outside ordinary CI timing
   assertions. These positions become development data, not qualification data.
2. **Exact key/copy optimization done; forced-turn bypass deferred.** First measure an
   equivalent compact engine state key and typed board/state copies. Preserve
   every legal turn, representative move ordering, independent oracle agreement
   and public engine behavior. Separately assess bypassing speculative search
   when a policy has only one complete legal result; retain the value-search
   API's existing semantics. No approximate beam or new strategic filter is
   justified by this investigation.
   The implemented corpus and exact key/copy measurements are recorded in
   [performance evidence](BOT_PERFORMANCE.md). The measured speedup retains
   frozen choices and does not establish stronger play.
3. **Compare frozen search budgets after correctness/performance checks.** Use
   a fixed fresh-seed color-swapped test of the existing 1000-node policy versus
   a larger-budget strategy policy. Record completion rates, changed decisions,
   points/mother losses and clocks. Predeclare sample size and the runtime cap;
   do not rerun this seed until a favorable result appears. Trace earlier trap
   decisions and test deeper search there without claiming isolated examples
   establish strength.
4. **Qualification and UI follow measured evidence.** A development/public bot
   still needs the roadmap's tactical, fresh-seed and device/lifecycle gates.
   Pause further imitation-only neural batches until there is a stronger teacher
   or a diagnosed deficiency they address. No model or search promotion occurred.

Task 1 precedes optimization. Once its contracts are frozen, state-key work and
copy/evaluator profiling can be investigated independently, provided agents use
separate files/worktrees. One coordinator must integrate and verify them before
the sequential frozen match. Device validation and public enablement remain later.

## Reproduction and local artifacts

The uninstrumented tournament can be reproduced from the frozen revision with:

```sh
node scripts/benchmark-bot.mjs --a search --b strategy --pairs 100 --seed strategy-search-control-2026-10-19 --max-turns 2000 --out .local/strategy-search-reproduction.json
```

The instrumentation, profile, replay and verification scripts/reports remain
under `.local/strategy-search-*` in both local checkouts. They are research
artifacts, not public app assets. SHA-256 identities:

| Artifact | SHA-256 |
| --- | --- |
| `strategy-search-control-2026-10-19.json` | `9b7570ee20a63059bd85384bf9733324e26502b23d4893c7679008be2fa448d4` |
| `strategy-search-profile-2026-10-19.json` | `afca8dcd87e79eda66bfe03a6356f1ba6a8e9d699e0a436f88c4938dac217978` |
| `strategy-search-diagnosis-2026-10-19.json` | `6c039ec720f696c031ce0bf50df848d41164ab4b20f5c28d8c7d455d96a0bb58` |
| `strategy-search-traceback-2026-10-20.json` | `5a771c2ef6b068fffe7f74a8045c11068acb834ae080a0727a9b7624b6132395` |
| `strategy-search-cpu-2026-10-20.cpuprofile` | `e637839d69e9640e01efc2d01e406cfc16d894bcda3841a54ba0f47439e084d4` |
| Source `corrective-source-2026-10-19/rounds.jsonl` | `43ec0fd1ad3858abcab6c0aa7923a1bff0827e0b4cb3f5ab4181a339681d101c` |

The checked local summary regenerates paired metrics from all raw round results,
checks counter totals, source identity, profile controls and replay identities.
Checksums protect against accidental mismatches, not an authenticated history.

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

Pending the frozen experiment. Local scripts and reports will remain under
`.local/strategy-search-*`; they are research artifacts, not public app assets.

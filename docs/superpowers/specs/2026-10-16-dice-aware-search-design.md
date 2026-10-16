# Dice-aware search checkpoint

Continue the approved strongest-engine roadmap, automatically validated with no
expert lab or required annotations. Public Single player stays In development.
This architectural checkpoint adds internal search; workers and learned weights
remain later checkpoints. Keep rules, public UI, greedy strategy-v1 and saved
self-play exports unchanged. No new dependencies or paid services.

Use full-width expectimax, rather than sampled rollouts or beam pruning: all 21
unordered rolls, weight1/36 for doubles and2/36 otherwise, doubles expanded to
four moves. Every decision uses generateTurns (including forced passes) and a
shared score/round continuation helper extracted from rankStrategyTurns. Validate
that helper against authoritative applyMove/endTurn/nextGame. A game win adds
points once then resets with its winner starting; a round win is exact +1 for
its actor. Evaluate pre-roll states from active's perspective; change sign only
when active changes, including same-player next-game transitions. Chance depth
counts future whole turns after the current root turn. Depth0 is greedy evaluation.

src/lib/bot/search.ts exports searchTurns(input, options?) and DICE_OUTCOMES.
Input is TurnInput & {score:Pair}, no RNG, opening roll or future dice.
Options: maxDepth integer0..4 (default2), maxNodes integer1..1000000 (default20000),
cacheEntries integer0..50000 (default10000), optional budgetMs finite>0 <=60000,
optional evaluator:PositionEvaluator (default strategyEvaluator), now:()=>number
(default performance.now), onUpdate:(update:SearchUpdate)=>void.
Node-only deterministic searches omit budgetMs; foreground callers later use4000ms.
An evaluator must return a finite [-1,1] value and receives copied state.

Return owned plan/value/stats and stopReason depth|nodes|time|round-win. Stats
extend SearchStats with cacheHits,cacheSize,baselineCandidates. nodes counts
uncached pre-roll visits during lookahead, not mandatory root enumeration/ranking.
First enumerate and evaluate every legal root result to establish the baseline,
then publish an owned update. If an immediate root round win exists, return it
without unnecessary lookahead. Iteratively evaluate EVERY root and EVERY roll at
one depth before publishing that iteration. An interrupted iteration never
replaces the last complete one or mixes estimates from different depths. Ties
keep deterministic generator order. No legal plan is filtered by strategic rules.

A search-local bounded value table keys board counts/top/off, active, score and
remaining depth. Cache only completed values; capacity0 disables caching; full
capacity stops insertion, not search. No table persists between calls/evaluators.
Check budget before/after atomic engine/evaluator operations and inside loops.
Mandatory baseline work and indivisible generateTurns/evaluate calls can overshoot
wall time; this is cooperative cancellation, not a hard foreground deadline.
Never return partial/illegal moves on exhaustion. Future worker watchdog enforces
hard lifecycle control. Invalid options/evaluator output and callback failures
throw rather than fabricate a score. Caller, evaluator and observer mutations
must not alter internal state or returned data.

Keep frozen strategy-v1-greedy for comparisons. New search-policy.ts factory
createSearchPolicy({maxDepth?,maxNodes?,cacheEntries?}) supplies deterministic
bounded choices with a versioned ID including configuration and evaluator identity.
Defaults depth1/nodes1000/cache10000 are an experimental reference budget, not
public difficulty levels or proven strongest play. Policy has no time budget for
reproducibility. Explicit benchmark --a/--b search and self-play --policy search
select it; existing strategy defaults stay until strength qualification. Manifest
records actual policy ID. No automatic promotion from mirror scores.

Validate with a separate public-engine 36 ordered-roll oracle on small valid
positions, literal weighted terminal fixtures, both colors, score/reset/pass
boundaries, completed-depth cutoff behavior, caches on/off, owned updates and
bad options/evaluator values. Profile opening/contact/spread-double/bearoff under
4000ms plus deterministic budgets; record achieved depth and atomic overshoot.
Run a bounded eight-pair search-vs-greedy pilot and a small search self-play batch.
This pilot is diagnostic, not the roadmap's 100-pair qualification or proof of
improvement. A search that cannot complete an iteration keeps the greedy plan.
Document evidence and limits, then fresh whole-branch review, merge/push and CI.

# Dice-aware Mahbusa search

`searchTurns(input, options)` in `src/lib/bot/search.ts` compares complete legal
turns using full-width expectimax. Depth0 is the existing strategy evaluation;
depth1 examines the next player's complete turn for every possible roll, and
depth2 includes one further turn. All21 unordered rolls use their correct1/36 or
2/36 weights. Doubles use four moves. Forced passes remain real turns.

Round wins have exact value1. Game wins award points once, reset the board, and
keep the winner starting; perspective changes sign only when the active player
changes. Other values remain heuristic estimates, not trained probabilities.
The evaluator interface can later accept a qualified learned model.

The search first produces a complete greedy baseline, then publishes an owned
update after each **fully completed** depth across all root moves and dice.
A partial iteration is discarded. An immediate root round win returns directly.
No moves are removed by strategic filters and no future random dice are supplied.
A search-local bounded transposition table caches only completed values, keyed
by board counts/top/off, active color, score and depth. Cache capacity limits
insertion, not the legal choices considered. No cache crosses calls or models.

Controls:

- `maxDepth`0..4, default2: future whole turns after the current turn.
- `maxNodes`1..1000000, default20000: uncached pre-roll visits during lookahead.
- `cacheEntries`0..50000, default10000:0 disables caching.
- Optional `budgetMs`>0..60000: foreground target later4000ms. Omit it for
  deterministic headless work budgets. `now` supports controlled-clock testing.
- `evaluator` defaults to `strategy-v1`; finite values must be within[-1,1].
- `onUpdate` receives copied plan/value/stats; callbacks and evaluator failures
  propagate. Evaluators receive copied pre-roll states.

Results include a legal owned complete plan, value, stop reason, completed depth,
uncached nodes, cache hits/size, root candidate count and elapsed time. Mandatory
root generation/evaluation is outside the node cap so a safe baseline always
exists. It can exceed the requested wall time, as can one indivisible engine or
evaluator call. Time cancellation is cooperative; a future worker/controller
must supply the hard watchdog and prevent stale results. More nodes do not always
mean a different move: if a whole depth cannot finish, the baseline is retained.

For reproducible automatic experiments:

```sh
pnpm benchmark:bot --a search --b strategy --pairs 8 --seed search-pilot-001 --out .local/search-pilot-001.json
pnpm selfplay:bot --policy search --rounds 2 --seed search-data-001 --out .local/search-data-001
```

The CLI `search` policy uses depth1,1000 uncached nodes and10000 cache entries,
without a clock cutoff. Its ID is
`expectimax-v1/strategy-v1/d1/n1000/c10000`. Programmatic `createSearchPolicy`
accepts different depth/node/cache limits and includes every limit in the ID.
These are experimental compute budgets, not public difficulty levels. Existing
CLI defaults remain strategy-v1 until a different engine is qualified. Preserve
source revision plus policy ID when comparing frozen versions.

A tiny pilot is diagnostic and uses a larger compute budget than greedy; it
cannot satisfy equal-budget promotion or the held-out100-pair qualification gate.
No public bot, worker, learned model or model training is enabled here. Automatic
self-play/outcome data remains the iteration workflow; no annotations are needed.

The October16 diagnostic completed16 rounds: search11–greedy5, with no cutoffs.
Its conservative interval includes50%, and search used much more compute. It is
not a promotion result. Locally, a4000ms search completed two future turns for
opening/contact fixtures and one for a174-candidate spread double (about2ms time
overshoot). The1000-node reference falls back to greedy on that large fixture.
See [recorded validation](VALIDATION.md) for seeds, exact configuration and limits.

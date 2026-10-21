# Exact engine performance

The October 19–20 investigation identified serialization and copying as useful
optimization targets. This checkpoint preserves policy behavior while reducing
that work; it does not tune strategy weights or qualify stronger play.

`tests/fixtures/exact-search-v1.json` is frozen from source
`87ac2bd073170796b3367ec9b5b1d2647795d0b7`, before production changes. Its 57 roots
contain the prespecified 48 played positions, six decisions immediately around
the three sampled mother losses, and three literal spread-board doubles. Three
compact search-decision histories preserve earlier game context and the original
replay hashes. These positions are development data, not strength holdouts.

The corpus SHA-256 is
`47e3bfa2bded1a12b9ca16648339c70da0684ce1f920994cf689306215230a64`.
Expected turn digests include every complete result and its representative move
order. Search digests/values/counters cover both 1000 and 20000 nodes at depth 1,
with 10000 cache entries and no clock cutoff. Never regenerate these expectations
using an optimized implementation to make a mismatch pass.

The corpus tests independently replay generated plans, enumerate the real mother
roots through checked public rules, and verify the recorded history decisions.
Existing rules, oracle, score-continuation and evaluator/observer mutation tests
remain required. Per-case test deadlines accommodate CPU variation; they are not
performance acceptance thresholds.

For local timing, run sequentially without concurrent training/tests:

```sh
node scripts/profile-search.mjs --out .local/exact-before.json
# After correctness checks on the optimized implementation:
node scripts/profile-search.mjs --out .local/exact-after.json
```

Each run discards one warmup and records three complete sweeps of all 57 roots.
Defaults: depth 1, 20000 nodes, 10000 cache entries, no time cutoff. It verifies
every returned plan/value/counter against the frozen baseline before reporting
timing. `--nodes 1000` and `--repetitions 1..5` support smaller diagnostics.
Reports include source revision/dirty state, Node version and corpus checksum;
existing output files are never overwritten. Report total sweep time, not just
the fastest favorable root. These are desktop diagnostics, not iPhone, worst-case
latency or evidence of stronger play.

## Measurements

Measured sequentially on October 20, Node 26.11.1, clean source at each stage:

| Stage | Source revision | Three sweep times (seconds) | Median (seconds) |
| --- | --- | --- | ---: |
| Original implementation | `2d0d85eb758bfe63a92bcd1ab4752731fbed96f8` | 13.253, 13.361, 13.447 | 13.361 |
| Compact exact keys | `ed74357a376b9c87abf6aa579ab62f463c0cf4f7` | 10.187, 10.192, 10.205 | 10.192 |
| Keys plus typed evaluator copies | `3bec0a4f1312c43d00c930bbb43363dc9e13077a` | 6.663, 6.698, 6.716 | 6.698 |

The final median is 49.87% less time, approximately 1.99 times the throughput on
this corpus. All 1631 complete root turns, chosen plans, value kinds/values,
stop reasons, completed depths, node counts and cache counters retained their
frozen results. Tests also legally replay all 82 saved search-history decisions.
These are repeated desktop measurements in fixed stage order, not randomized
timing trials, strength evidence or an iPhone guarantee.

The keys in `src/lib/state.ts` encode each point's two counts and top color into
one UTF-16 code unit, followed by one unit for the two off counts. Counts are
0..15 in valid Mahbusa positions; top is null/0/1. The fixed 25-unit prefix is
injective on that domain. Turn keys append sorted single-digit dice; search
keys append fixed-width active/score/depth fields. These are internal identities,
not exported game formats or hashes. Validity remains the caller's contract;
this is not new input validation or support for arbitrary malformed boards.

Evaluator inputs still own every point record, checker-count array, off array
and score array. A schema-specific copy replaces `structuredClone` at that hot
boundary; the search's outer input/progress snapshots retain their existing
copying behavior. Mutating evaluators and observers remain isolated.

Local report SHA-256 identities, preserved in both checkouts:

| Report | SHA-256 |
| --- | --- |
| `.local/exact-state-before-2026-10-20.json` | `7ff421d978add243f881ff124ffb1bf48418266e382579b6a6eaf862ce6eca4d` |
| `.local/exact-state-keys-2026-10-20.json` | `c70de50e215f7e6d37192771a45d6e1d54dae9422498e76a823c43291cc41800` |
| `.local/exact-state-after-2026-10-20.json` | `14b9d235f5efd0dc144554d23f116447922f300fad8745d29115ed7df71759f0` |

Local verification: 261 Vitest, 85 Node and 20 CPU Python tests (366 total),
zero Svelte errors/warnings, production/offline and worker smoke builds passed.
Chrome checked separate opening rolls, combined-dice movement, Undo, automatic
next-turn dice and reset. The native worker smoke page passed all six lifecycle
checks while the interface remained responsive. Public asset version is now
`f13c630eb2ad2fd9` because the shared engine changed; public game behavior and
single-player availability are unchanged.

The next strength experiment must use fresh seeds and frozen search budgets.
Skipping speculative work on forced turns remains a separate possible policy
optimization; this checkpoint leaves that behavior and all search limits intact.

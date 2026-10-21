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

Baseline and optimized measurements pending. Candidate changes must retain the
same frozen results and mutation isolation before a speed improvement is claimed.

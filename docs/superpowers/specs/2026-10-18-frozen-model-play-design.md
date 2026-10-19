# Frozen model opponents in headless Mahbusa

Continue the approved engine roadmap with the next testable part of checkpoint10:
use the existing experimental network to make legal complete turns in simulation,
compare frozen opponents automatically and generate model-mirror outcome data.
No annotations, public bot, paid compute or UI changes. Optimizer/pool resume,
mixed opponent selection and strength qualification remain subsequent work.

## Approach and boundaries

Use the existing full-width search at depth0 with the checked dense evaluator.
This ranks every complete turn, including handover perspective, updated scores,
winner-started next games and exact round wins. It avoids a second ranking/rules
implementation. A search-backed model is a future alternative once the learned
evaluator is diagnosed; directly replacing the public worker is premature.

Pure createModelPolicy(model:DenseModel,sha256:string):BotPolicy validates the
digest and model ID correspondence, then returns a deterministic policy with ID
`nn-greedy-v1/<full64hexsha>` (77characters, within existing80 limit). Weight hash
identifies frozen model behavior together with the policy algorithm and report
source revision. No action RNG or wall-clock budget influences the selection.
Exact round wins take precedence; other ties retain generator order.

## One checked artifact gate

Extract the existing parity CLI's actual checks into Node-only
scripts/lib/model-artifact.mjs. loadModelArtifact(directory) reads training.json,
model.json,parity.json and weights.bin once, checks complete training identity,
loads owned/checked weights, and verifies every parity probe with fixed5e-5
tolerance. Return {model,manifest,parityResult,provenance}. Provenance includes
modelId, weightsSha256, manifestSha256, trainingReportSha256, paritySha256 and
the actual parity result, all derived from consumed bytes. It contains no local
paths. Failed/running/missing/corrupt/mismatched exports cannot become opponents.
The existing parity CLI becomes a thin wrapper over the same gate.

Node-only scripts/lib/resolve-policy.mjs resolves strategy/search/random/first
or model plus directory, returning {policy,modelArtifact:null|provenance}.
Only model accepts a directory; it requires one. No cache or global registry.
Resolve all requested artifacts before gameplay/output creation; after loading,
later disk edits cannot change a running policy or its recorded provenance.

As part of this provenance chain, fix the previous deferred source-manifest hash
override by spreading source metadata before assigning its computed digest.
Dataset contents and original provenance checks remain intact.

## CLI compatibility

Benchmark adds --a model --a-model DIR and --b model --b-model DIR. Either or
both may be models; default strategy/strategy and existing flags remain.
Optional modelArtifacts:[Aprovenance|null,Bprovenance|null] appears only when a
model is used. Existing paired seeds/color swapping/cutoff exit semantics stay.
Report IDs alone use full weight digest; distinct old/current artifacts can be
compared without mutable names or model promotion.

Self-play adds --policy model --model DIR. Both sides use that same frozen
policy; the existing version1 dataset policy/round IDs remain consistent and
the manifest includes modelArtifact provenance. No change to seed derivation,
outcome labels, cutoffs, exclusive output or round-separated preparation.
The resulting dataset must prepare and train through the existing learner.
This checkpoint supports mirrors; it does not claim mixed pools or resume.

## Verification and experiment

Test real dense-model choices with hand-derived off/score preferences, exact
round wins, deterministic ties and both colors. Replay choices through public
rules across all existing fixtures; check no caller/RNG mutation or identity
aliasing. Exercise both CLIs with real exported fixture files, changed weights,
bad/missing models and inconsistent flags; invalid artifacts create no output.
Generate complete model self-play and verify labels/source hashes/prepared data.
Python CI's real training test also exercises exported model benchmark/self-play,
so checked fixture arithmetic cannot conceal actual exporter incompatibility.

Freeze source, then run100 paired rounds of the existing bootstrap vs strategy
with seed frozen-model-pilot-2026-10-18,2000turn limit, no repeated-look promotion.
The diagnostic uses the same complete-turn generation for both opponents but
different evaluation runtime; report decision timing and conservative interval.
Cutoffs invalidate aggregate win rate. No result automatically enables a model.
Generate a small model-mirror batch and prepare/train a second experimental
candidate to prove the automatic outcome loop end to end. Keep all artifacts
ignored/local; record actual data/metrics/parity and any weak play honestly.

Ordinary CI remains small; full suites, Python integration, type/public/offline/
worker builds, a fresh review, incremental commits, merge/push and remote CI.

# Search worker/controller checkpoint

Continue approved roadmap checkpoint8. Search must not run on the UI thread;
reset/back/replacement/disposal must stop old work. Public bot remains disabled
until trained qualification. No expert lab, annotations, game persistence or UI
redesign. No dependencies or cloud services. Native browser module Worker.

Use one lazy worker per search, terminated on every settlement. This trades a
small startup cost for simple isolation/cancellation; a persistent worker or
cooperative cancel message cannot interrupt synchronous engine work reliably.
Default search target4000ms; main-thread watchdog4500ms includes startup. Worker
runs existing searchTurns with maxDepth4/maxNodes1000000/cache10000, streaming
complete-depth updates then completion. Only strategy-v1 evaluator is supported
now. No Node-only simulation/crypto imports in browser worker/controller.

Worker protocol keeps SearchRequest {type,requestId,revision,state,budgetMs,modelId}.
SearchReply error gains modelId so every reply carries matching identity. Validate
request IDs (nonempty <=80), revision (nonnegative safe integer), budget finite
>0 <=60000, supported model and valid in-progress TurnInput/score at the boundary.
Boards have24 points, valid integer counts/top ownership (one buried checker),
15 checkers per side including off; no already borne-off or mother-pin terminal
board. Dice follow existing remaining-dice rules, score0..2, active0|1.
Extract pure checked replay from Node simulation to replay.ts, preserve simulation
export/API and deterministic traces. Validate unknown proposed moves by public
availableMoves/applyMove, reject illegal/partial turns and false final metadata.
Use structural board/outcome comparisons, not property-order JSON equality.

Files: validation.ts/replay.ts/worker-runtime.ts/search.worker.ts/worker-factory.ts
and controller.ts. runSearchRequest(raw,send) validates, sends progress/complete,
or correlated error. Invalid envelope identity throws because no safe correlation
exists. Browser entry just connects onmessage/postMessage. Factory uses Vite's
new Worker(new URL('./search.worker.ts', import.meta.url), {type:'module'}).

createBotController({createWorker?,budgetMs?,watchdogMs?,modelId?,onProgress?})
returns {search(state,revision):Promise<BotSearchOutcome>,cancel(),dispose()}.
Factory defaults native Worker; budget4000/watchdog4500; require watchdog>budget,
finite <=60000 and supported nonempty model identity length. Model not installed
produces correlated worker error (no silent strategy fallback). No eager worker.
Each invocation cancels its predecessor and clones/validates input. Internally
increment requestId; match worker instance/generation plus requestId/revision/
modelId. Wrong/stale replies are ignored, including captured callbacks after
termination. Main-thread checked replay validates every accepted plan/stats.
Stats nodes/depth are nonnegative safe integers (depth<=4), elapsed finite>=0.
Retain monotonic complete-depth progress, ignore duplicate/older progress; reject
completion older than accepted progress. Progress observers receive owned copies.

Outcome has identity and status complete|fallback (owned plan/stats), cancelled,
or error (message). Fallback only for watchdog, using last validated progress;
no progress => retryable error, no invented move. Worker error/messageerror,
correlated error, malformed matching reply, factory/post failure => error and
cleanup. No automatic board mutation. onProgress exceptions => error/cleanup.
Cancel/dispose/replacement must settle promises, clear timers/listeners, terminate
workers; dispose is idempotent and later searches error. Cancellation of an old
job cannot settle a reentrant newer job. Caller must cancel on any board change
not accompanied by a new search; UI integration is later checkpoint12.

Test independently controlled worker transport and fake timers at the real
controller boundary, plus real runSearchRequest with engine fixtures. Prove
clone ownership, malformed request/reply handling, complete turns/doubles/pins,
wrong IDs/revisions/models, old worker same-envelope callbacks, partial plans,
watchdog with/without baseline, crash/setup/observer failures, reset/replacement/
dispose and reentrancy. Preserve existing simulation hashes and full checks.

A developer test HTML in tests/browser/worker.html runs the actual Vite module
worker via the controller. No app/header/lab entry. Browser checks show heartbeat
continues while thinking, baseline progress then completion, cancellation and
fresh request after reset, watchdog with/without a received plan and error/retry.
Keep any deliberate worker faults in test-only worker files, never product.
Validate worker bundle separately with the smoke HTML as a temporary Vite build
entry under ignored .local/, excluding it from the public production shell.
Public worker/model offline packaging and actual iPhone remain checkpoint13.
Document evidence, fresh whole-branch review, integrate/push and CI. No training
or stronger-engine claims from lifecycle tests.

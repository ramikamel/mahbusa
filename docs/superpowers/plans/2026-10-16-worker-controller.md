# Search Worker and Controller Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans inline, test-first,
> and one fresh independent whole-branch review.

**Goal:** Move search off-thread with safe validated progress and cancellation.
**Architecture:** Pure request validation/checked replay, isolated module worker
per job, revision-aware controller with4500ms watchdog and4000ms search target.
**Tech Stack:** Existing TS/Vite/Vitest, native Worker, no dependencies.
**Spec:** docs/superpowers/specs/2026-10-16-worker-controller-design.md

## Global Constraints
- No public bot, annotations, storage, layout or trained-strength changes.
- Worker search depth4/nodes1000000/cache10000; default budget4000/watchdog4500.
- Valid owned states and legal complete received plans only; no invented fallback.
- Match requestId/revision/model and worker generation; one worker per search.
- Terminate/clear handlers/timer on success, error, cancellation and timeout.
- No Node imports in browser path; preserve existing simulation exports/hashes.

## Review Focus
- A timed-out/cancelled worker's captured callback cannot affect a new request,
  even if the envelope is copied; reset without replacement must invalidate work.
- Watchdog may use only already received and checked progress, including a blocked
  pass. A malformed/partial move must never become fallback or board mutation.
- Progress observers can mutate/cancel/replace/throw without corrupting data,
  leaking a worker, leaving promises pending or settling another job.
- Startup/post/message decode/runtime failures must settle and allow retry.
- Real browser worker must bundle without Node dependencies or development-only
  faults entering production; timer heartbeat and cancellation must be visible.

### Task 1: Worker boundary and browser-safe checked replay
**Files:** new src/lib/bot/validation.ts,replay.ts,worker-runtime.ts,search.worker.ts,
worker-factory.ts; modify simulation.ts/types.ts; tests/bot-worker-runtime.test.ts.
**Interfaces:** validateSearchState(unknown) => asserts valid TurnInput & score;
replayPlan(Game,unknown)=>Game (same simulation re-export); runSearchRequest(raw,
send:(SearchReply)=>void):void. SearchReply errors include modelId.
- [ ] Fail tests: copied progress/complete identity and replay; unsupported model,
  malformed envelope/state/dice/top/conservation/terminal cases; error replies;
  pure replay rejects partial/false data and ignores property insertion order.
- [ ] Implement extracted replay/request validation/worker runtime/factory. Run
  all tests/typecheck and confirm simulation golden hashes. Commit.

### Task 2: Controller lifecycle and watchdog
**Files:** new src/lib/bot/controller.ts; tests/bot-controller.test.ts.
**Interfaces:** createBotController options/methods/outcomes per spec; exported
WorkerLike transport interface for deterministic external worker test harness.
- [ ] Fail lifecycle tests for lazy startup, legal completion, copied input and
  progress, stale IDs/revisions/models/generation, out-of-order replies, malformed
  plans/stats, watchdog with/no progress, blocked pass, cancellation/replacement/
  dispose, setup/post/crash/messageerror/observer errors, reentrant callbacks.
- [ ] Implement minimal controller; run full suite/typecheck, commit.

### Task 3: Actual browser smoke, bundle and docs
**Files:** tests/browser/worker.html,worker-smoke.ts plus fault-worker.ts;
docs/BOT_WORKER.md,BOT_ROADMAP.md,VALIDATION.md; include smoke bundle verification
in package/CI only if useful without changing public production entry.
**Interfaces:** developer HTML runs real native workers and visibly reports actual
results; no new app screen, lab or production entry.
- [ ] Browser smoke real progress/completion and timer heartbeat, cancel/reset
  followed by fresh search, watchdog with/no progress, worker error/retry.
- [ ] Build temporary smoke entry into .local/ and confirm emitted module worker
  contains no Node runtime. Check public build/offline assets unchanged.
- [ ] Full test/type/build/offline; record browser evidence and scope limits;
  fresh review, important fixes test-first, merge/push and verify CI.

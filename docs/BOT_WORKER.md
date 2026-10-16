# Search worker and controller

Search runs in a native browser module worker. `createBotController()` creates no
thread until `search(state, revision)` is called. Each request owns a new worker,
which is terminated after completion, cancellation, timeout or error. Replacement
searches cancel their predecessors. This keeps synchronous engine work off the
UI thread and makes cancellation independent of the search's cooperation.

```ts
import {createBotController} from './src/lib/bot/controller';
const bot=createBotController({onProgress:update=>showThinking(update.stats)});
let revision=0;
function boardChanged(){revision++;bot.cancel();}
const requestedRevision=revision;
const result=await bot.search({position,active,remaining,score},requestedRevision);
if(result.revision===revision){
  if(result.status==='complete'||result.status==='fallback')playCheckedPlan(result.plan);
  else if(result.status==='error')showRetry(result.message);
}
// On component teardown:
bot.dispose();
```

The example's render/playback helpers are caller responsibilities, not APIs in
this checkpoint. Increment the owning board revision and cancel on reset, back,
new game, human move, undo or any other external board change. A new search
cancels automatically. `cancel()` settles the promise as cancelled and returns
no move, even after progress. `dispose()` is idempotent; future searches return
error. The controller itself never applies moves or changes the board. UI bot
integration remains a later checkpoint; the public menu still says In development.

Every reply must match the request ID, revision, evaluator ID and originating
worker generation. Old/mismatched replies are ignored. Inputs are cloned and
validated (24-point board,15 checkers per side, valid tops/pins/off/dice/score,
nonterminal state). Every accepted complete plan is independently replayed through
public rules; partial/illegal moves or false result metadata cannot become
progress, completion or fallback. Stats must be finite/valid and depth cannot
regress. Observers receive copies and can cancel/replace safely.

Default search target is4000ms, watchdog4500ms including startup. Worker searches
up to four future turns, one million uncached nodes and10000 cache entries with
strategy-v1. Budgets are adjustable for tests: positive finite values <=60000ms,
with watchdog strictly greater than search target. Only already received,
validated progress can become watchdog fallback. With none, the controller
returns a retryable error and no move. A legal blocked pass is valid fallback.
Runtime/message decode/model/protocol errors also settle as errors and allow a
fresh retry. No synchronous backup search runs on the main thread.

The watchdog terminates the worker even during an indivisible engine operation.
It relies on the browser scheduling the main-thread timer; background suspension
and busy UI code can delay timers. Main-thread plan validation itself uses public
legality checks and is not a hard latency guarantee. Actual iPhone/Safari timing,
background lifecycle and public offline worker/model packaging remain checkpoint13.

`modelId` currently supports only `strategy-v1`; missing models return errors.
There is no silently substituted trained model and no weights trained here.
The runtime, controller and pure checked replay import no Node APIs. Simulation
reuses the same replay boundary and keeps its existing `replayPlan` export.

Run automated checks and real browser smoke:

```sh
pnpm test
pnpm check
pnpm build:worker-smoke
node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4175 --outDir .local/worker-smoke-build
# Open http://127.0.0.1:4175/tests/browser/worker.html
```

Click Run worker checks, then Ping interface while it thinks. The page verifies
real search/progress plus a heartbeat, cancellation/reset/fresh revision,
watchdog with/without progress, crash/retry and disposal. Deliberately stuck/faulty
threads exist only in `tests/browser/fault-worker.ts`. The separate build emits
under ignored `.local/worker-smoke-build`, verifies an actual worker artifact and
rejects Node externalization. CI builds it; Chrome smoke is a manual agent check.
It is not a new app screen or expert lab, and neither it nor its fault workers are
included in public `dist/`. The public asset cache is unchanged this checkpoint.

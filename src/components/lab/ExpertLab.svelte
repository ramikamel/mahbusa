<script lang="ts">
  import { tick } from 'svelte';
  import Board from '../Board.svelte';
  import { createGame, emptyPosition, initialPosition } from '../../lib/engine';
  import type { Game, Move, Player } from '../../lib/engine';
  import { rankStrategyTurns } from '../../lib/bot/rank-strategy';
  import type { RankedTurn } from '../../lib/bot/rank-strategy';
  import { exportLabCollection, MAX_LAB_BYTES, parseLabCollection, previewTurn, resultKey, validateLabInput, withLabCase } from '../../lib/lab/cases';
  import type { Judgment, LabCase, LabCollection, LabInput } from '../../lib/lab/cases';

  let { onClose }: { onClose: () => void } = $props();
  const names = ['Light', 'Dark'];
  const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
  function opening(): LabInput { return { position: initialPosition(), active: 0, score: [0, 0], remaining: [2, 4] }; }
  const initial: LabCase = { id: crypto.randomUUID(), title: 'Opening', input: opening(), annotations: [] };
  let cases = $state<LabCase[]>([initial]);
  let caseId = $state(initial.id);
  let draft = $state<LabInput>(copy(initial.input));
  let title = $state(initial.title);
  let dieA = $state(2), dieB = $state(4);
  let point = $state(23), preset = $state('opening');
  let rows = $state<RankedTurn[]>([]);
  let analyzed = $state(false), busy = $state(false);
  let candidate = $state(0), step = $state(0), page = $state(0);
  let message = $state(''), error = $state(''), jsonText = $state('');
  let pending = $state<LabCollection | null>(null);
  let confirmAction = $state<'import' | 'restart' | 'leave'>('import');
  let confirmation: HTMLDialogElement;

  const current = $derived(cases.find(c => c.id === caseId)!);
  const input = $derived({ ...draft, remaining: dieA === dieB ? [dieA, dieA, dieA, dieA] : [dieA, dieB] });
  const validation = $derived.by(() => {
    try { validateLabInput(input); return ''; }
    catch (err) { return err instanceof Error ? err.message : 'Invalid position.'; }
  });
  const row = $derived(rows[candidate]);
  const annotation = $derived(row ? current.annotations.find(a => a.resultKey === resultKey(row.plan)) : undefined);
  const totals = $derived([0, 1].map(p => draft.position.off[p] + draft.position.points.reduce((n, stack) => n + stack.count[p], 0)));
  const shownGame = $derived.by((): Game => analyzed && row
    ? previewTurn(current.input, row.plan, step)
    : { ...createGame(), ...input, position: draft.position, phase: 'moving' });
  const pages = $derived(Math.max(1, Math.ceil(rows.length / 20)));

  function invalidate() { rows = []; analyzed = false; candidate = 0; step = 0; page = 0; message = ''; error = ''; }
  function saveCase(next: LabCase) {
    cases = withLabCase({ format: 'mahbusa-expert-lab', version: 1, cases }, next).cases;
  }
  function changeTitle(element: HTMLInputElement) {
    if (!analyzed) { title = element.value; return; }
    try {
      if (!element.value.trim()) throw new Error('Enter a case title.');
      saveCase({ ...current, title: element.value }); title = element.value; error = '';
    } catch (err) { element.value = title; error = err instanceof Error ? err.message : 'Title was not saved.'; }
  }
  function loadCase(id: string) {
    caseId = id;
    const saved = cases.find(c => c.id === id)!;
    draft = copy(saved.input); title = saved.title;
    dieA = saved.input.remaining[0]; dieB = saved.input.remaining[saved.input.remaining.length - 1];
    invalidate();
  }
  function loadPreset() {
    let value = opening();
    if (preset !== 'opening') {
      const position = emptyPosition();
      const stacks = preset === 'mother'
        ? [[1, 1, 0], [23, 14, 0], [0, 0, 1], [12, 0, 14]]
        : [[2, 3, 1], [4, 12, 0], [12, 0, 14]];
      for (const [i, light, dark] of stacks) position.points[i] = { count: [light, dark], top: light ? 0 : 1 };
      value = { position, active: 0, score: [0, 0], remaining: [1, 2] };
    }
    draft = value; title = preset === 'opening' ? 'Opening' : preset === 'mother' ? 'Mother contact' : 'Held pin';
    dieA = value.remaining[0]; dieB = value.remaining[1]; point = preset === 'pin' ? 2 : 23;
    invalidate();
  }
  function countChange(player: Player, value: number) {
    const stack = draft.position.points[point];
    stack.count[player] = Number.isFinite(value) ? Math.max(0, Math.min(15, value)) : 0;
    if (!stack.count[0] && !stack.count[1]) stack.top = null;
    else if (!stack.count[0]) stack.top = 1;
    else if (!stack.count[1]) stack.top = 0;
    invalidate();
  }
  async function analyze() {
    error = ''; message = ''; busy = true;
    await tick();
    try {
      const clean = validateLabInput(input);
      if (!title.trim() || title.length > 160) throw new Error('Enter a case title (1–160 characters).');
      const ranked = rankStrategyTurns(clean);
      if (JSON.stringify(clean) !== JSON.stringify(current.input)) {
        const next: LabCase = { id: crypto.randomUUID(), title, input: clean, annotations: [] };
        saveCase(next); caseId = next.id;
        message = 'New position saved as a separate case. Existing labels are preserved.';
      } else saveCase({ ...current, title });
      rows = ranked; analyzed = true; candidate = 0; page = 0; step = ranked[0]?.plan.moves.length ?? 0;
    } catch (err) { error = err instanceof Error ? err.message : 'Analysis failed.'; }
    finally { busy = false; }
  }
  function selectCandidate(index: number) { candidate = index; step = rows[index].plan.moves.length; error = ''; }
  function label(value: string, note = annotation?.note ?? ''): boolean {
    if (!row) return false;
    const key = resultKey(row.plan), existing = current.annotations.find(a => a.resultKey === key);
    if (!value) { saveCase({ ...current, annotations: current.annotations.filter(a => a.resultKey !== key) }); return true; }
    if (value !== 'preferred' && value !== 'acceptable' && value !== 'bad') return false;
    if (!existing && current.annotations.length >= 100) { error = 'Use at most 100 labels per case.'; return false; }
    const next = { resultKey: key, judgment: value as Judgment, note: note.slice(0, 4000) };
    try {
      saveCase({ ...current, annotations: [...current.annotations.filter(a => a.resultKey !== key), next] });
      message = 'Label saved in memory. Export JSON to keep it.'; error = '';
      return true;
    } catch (err) {
      error = err instanceof Error ? err.message : 'Label was not saved.'; message = '';
      return false;
    }
  }
  function exported(download = false) {
    try {
      jsonText = exportLabCollection({ format: 'mahbusa-expert-lab', version: 1, cases });
      message = 'Export includes analyzed cases and labels. Unanalyzed draft edits are not included.'; error = '';
      if (download) {
        const url = URL.createObjectURL(new Blob([jsonText], { type: 'application/json' }));
        const link = document.createElement('a'); link.href = url; link.download = 'mahbusa-expert-cases.json'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
      }
    } catch (err) { error = err instanceof Error ? err.message : 'Export failed.'; }
  }
  function requestImport() {
    try {
      pending = parseLabCollection(jsonText); confirmAction = 'import'; confirmation.showModal(); error = '';
    } catch (err) { error = err instanceof Error ? err.message : 'Import failed.'; }
  }
  async function readFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > MAX_LAB_BYTES) throw new Error('JSON exceeds 1 MiB.');
      jsonText = await file.text(); message = 'File loaded into JSON text. Review it, then Import JSON.'; error = '';
    } catch (err) { error = err instanceof Error ? err.message : 'File could not be read.'; }
  }
  function confirm() {
    confirmation.close();
    if (confirmAction === 'leave') { onClose(); return; }
    if (confirmAction === 'import' && pending) {
      cases = pending.cases; pending = null;
    } else if (confirmAction === 'restart') {
      cases = [{ id: crypto.randomUUID(), title: 'Opening', input: opening(), annotations: [] }];
    } else return;
    loadCase(cases[0].id); message = confirmAction === 'import' ? 'Collection imported.' : 'New collection started.';
  }
  function ask(action: 'restart' | 'leave') { confirmAction = action; confirmation.showModal(); }
  const moveText = (move: Move) => (move.from + 1) + ' → ' + (move.to === -1 ? 'off' : move.to + 1) + ' (' + move.die + ')';
</script>

<svelte:head><title>Expert lab · Mahbusa</title></svelte:head>
<div class="lab-workspace">
  <header class="lab-heading">
    <div><span class="eyebrow">MAHBUSA · DEVELOPMENT ONLY</span><h1>Expert lab<span>.</span></h1></div>
    <button onclick={() => ask('leave')}>Back to game</button>
  </header>
  <p class="lab-intro">Set a position, inspect the engine's choices, and record your judgment. Scores are provisional heuristics, not winning probabilities.</p>
  <p class="lab-warning">Cases stay in memory only. Export before reloading or leaving. Loading a case or preset replaces unanalyzed draft edits.</p>
  <div class="lab-toolbar">
    <label>Saved case <select value={caseId} onchange={e => loadCase(e.currentTarget.value)}>{#each cases as saved}<option value={saved.id}>{saved.title} · {saved.annotations.length} labels</option>{/each}</select></label>
    <label>Preset <select bind:value={preset}><option value="opening">Opening</option><option value="mother">Mother contact</option><option value="pin">Held pin</option></select></label>
    <button onclick={loadPreset}>Load preset</button>
    <button onclick={() => ask('restart')}>New collection</button>
    <span>{cases.length}/20 cases</span>
  </div>
  {#if error}<p class="lab-error" role="alert">{error}</p>{/if}
  {#if message}<p class="lab-message" role="status">{message}</p>{/if}
  <main class="lab-grid">
    <section aria-label="Position and candidates">
      <div class="lab-board">
        <Board game={shownGame} selected={analyzed ? null : point} moves={[]} destinations={[]}
          editable={!analyzed} choosePoint={i => { if (!analyzed) point = i; }} bearOff={() => {}} />
      </div>
      {#if analyzed && row}
        <div class="lab-preview" aria-label="Candidate replay">
          <strong>Candidate {candidate + 1} · Step {step}/{row.plan.moves.length}</strong>
          <button disabled={step === 0} onclick={() => step = 0}>Start position</button>
          <button disabled={step === 0} onclick={() => step--}>Previous step</button>
          <button disabled={step === row.plan.moves.length} onclick={() => step++}>Next step</button>
          <button disabled={step === row.plan.moves.length} onclick={() => step = row.plan.moves.length}>Final position</button>
        </div>
        <p class="lab-sequence">{row.plan.moves.map(moveText).join(' · ') || 'Blocked turn — pass.'}</p>
        {#if shownGame.outcome}<p class="lab-message">{names[shownGame.outcome.winner]} wins {shownGame.outcome.points} points. Preview shows the winning board.</p>{/if}
        {#if row.kind === 'round-win'}<p>Round won. Exact value +1.</p>
        {:else if row.kind === 'next-game'}<p>Evaluation continues from a fresh board: {names[row.continuation!.active]} starts, score {row.continuation!.score.join('–')}.</p>
        {:else}<p>Evaluation is from {names[current.input.active]}'s perspective; {names[row.continuation!.active]} rolls next.</p>{/if}
        <div class="lab-list-heading"><h2>{rows.length} legal results</h2><span>Page {page + 1}/{pages}</span></div>
        <div class="lab-candidates" aria-label="Ranked candidates">
          {#each rows.slice(page * 20, page * 20 + 20) as option, offset}
            {@const index = page * 20 + offset}
            {@const tag = current.annotations.find(a => a.resultKey === resultKey(option.plan))?.judgment}
            <button class:chosen={index === candidate} aria-pressed={index === candidate} onclick={() => selectCandidate(index)}>
              <span><strong>Candidate {index + 1}</strong> <span class="lab-value">{option.value.value.toFixed(3)}</span></span>
              <small>{option.plan.moves.map(moveText).join(' · ') || 'Pass'}</small>
              {#if tag}<span class="lab-tag">{tag}</span>{/if}
            </button>
          {/each}
        </div>
        {#if pages > 1}<div class="lab-pagination"><button disabled={page === 0} onclick={() => page--}>Previous page</button><button disabled={page + 1 === pages} onclick={() => page++}>Next page</button></div>{/if}
      {:else}<p class="lab-hint">Select any point on the board or in the editor. Analyze when the position is ready.</p>{/if}
    </section>
    <aside aria-label="Editor and expert review">
      <section class="lab-panel">
        <div class="lab-list-heading"><h2>Position</h2>{#if analyzed}<button onclick={invalidate}>Edit position</button>{/if}</div>
        <label>Case title <input maxlength="160" value={title} oninput={e => changeTitle(e.currentTarget)} /></label>
        {#if !analyzed}
          <label>Player to move <select bind:value={draft.active} onchange={invalidate}><option value={0}>Light</option><option value={1}>Dark</option></select></label>
          <div class="lab-fields">
            {#each [0, 1] as p}<label>{names[p]} score <select bind:value={draft.score[p]} onchange={invalidate}>{#each [0, 1, 2] as n}<option value={n}>{n}</option>{/each}</select></label>{/each}
            <label>Die 1 <select bind:value={dieA} onchange={invalidate}>{#each [1,2,3,4,5,6] as n}<option value={n}>{n}</option>{/each}</select></label>
            <label>Die 2 <select bind:value={dieB} onchange={invalidate}>{#each [1,2,3,4,5,6] as n}<option value={n}>{n}</option>{/each}</select></label>
          </div>
          {#if dieA === dieB}<small>Doubles use four moves.</small>{/if}
          <label>Edit point <select bind:value={point}>{#each Array.from({length:24}, (_, i) => i) as i}<option value={i}>Point {i + 1}</option>{/each}</select></label>
          <div class="lab-fields">
            {#each [0, 1] as p}<label>{names[p]} on point <input type="number" min="0" max="15" step="1" value={draft.position.points[point].count[p]} oninput={e => countChange(p as Player, e.currentTarget.valueAsNumber)} /></label>{/each}
          </div>
          {#if draft.position.points[point].count[0] && draft.position.points[point].count[1]}
            <label>Top checker <select bind:value={draft.position.points[point].top} onchange={invalidate}><option value={0}>Light</option><option value={1}>Dark</option></select></label>
          {/if}
          <div class="lab-fields">
            {#each [0, 1] as p}<label>{names[p]} borne off <input type="number" min="0" max="14" step="1" value={draft.position.off[p]} oninput={e => { draft.position.off[p] = Number.isFinite(e.currentTarget.valueAsNumber) ? Math.max(0, Math.min(14, e.currentTarget.valueAsNumber)) : 0; invalidate(); }} /></label>{/each}
          </div>
          <p class="lab-totals">Total: Light {totals[0]}/15 · Dark {totals[1]}/15</p>
          {#if validation}<p class="lab-error" role="status">{validation}</p>{/if}
          <button class="lab-primary" disabled={!!validation || busy} onclick={analyze}>{busy ? 'Analyzing…' : 'Analyze position'}</button>
          <small>Changed positions become new cases. Existing labels are kept.</small>
        {:else}<p>{names[current.input.active]} to play · {current.input.remaining.join(', ')}<br />Score {current.input.score.join('–')}</p>{/if}
      </section>
      {#if analyzed && row}
        <section class="lab-panel">
          <h2>Your judgment</h2>
          <label>Candidate label <select value={annotation?.judgment ?? ''} onchange={e => { if (!label(e.currentTarget.value)) e.currentTarget.value = annotation?.judgment ?? ''; }}><option value="">Unreviewed</option><option value="preferred">Preferred</option><option value="acceptable">Acceptable</option><option value="bad">Bad</option></select></label>
          <label>Expert note <textarea rows="3" maxlength="4000" disabled={!annotation} value={annotation?.note ?? ''} oninput={e => { if (!label(annotation!.judgment, e.currentTarget.value)) e.currentTarget.value = annotation?.note ?? ''; }} placeholder="Why would you play or avoid this?"></textarea></label>
          <small>You can mark multiple results preferred or acceptable. Choose Unreviewed to remove a label.</small>
        </section>
        <section class="lab-panel">
          <h2>Why this score?</h2>
          {#if row.explanation}
            <p>{row.explanation.evaluatorId} · raw {row.explanation.rawValue.toFixed(2)} · value {row.value.value.toFixed(3)}</p>
            <div class="lab-table"><table><caption>From {names[current.input.active]}'s perspective. Contribution = (own − opponent) × weight.</caption><thead><tr><th>Feature</th><th>Own</th><th>Opp.</th><th>Weight</th><th>Effect</th></tr></thead><tbody>
              {#each row.explanation.contributions as feature}<tr><th>{feature.label}</th><td>{feature.own.toFixed(3)}</td><td>{feature.opponent.toFixed(3)}</td><td>{feature.weight}</td><td>{feature.contribution.toFixed(2)}</td></tr>{/each}
            </tbody></table></div>
          {:else}<p>Immediate round win: exact +1. No positional estimate is needed.</p>{/if}
        </section>
      {/if}
    </aside>
  </main>
  <section class="lab-panel lab-json" aria-label="JSON collection">
    <h2>Keep your cases</h2><p>Export analyzed cases and labels. Import replaces this collection only after validation and confirmation. Maximum 1 MiB / 20 cases.</p>
    <div class="lab-toolbar"><button onclick={() => exported()}>Show JSON</button><button onclick={() => exported(true)}>Download JSON</button><button onclick={requestImport}>Import JSON</button></div>
    <label>Collection JSON <textarea rows="7" value={jsonText} oninput={e => jsonText = e.currentTarget.value} spellcheck="false"></textarea></label>
    <label>Read JSON file <input type="file" accept=".json,application/json" onchange={e => { void readFile(e.currentTarget.files?.[0]); e.currentTarget.value = ''; }} /></label>
  </section>
</div>
<dialog bind:this={confirmation} aria-labelledby="lab-confirm-title">
  <h2 id="lab-confirm-title">{confirmAction === 'import' ? 'Replace this collection?' : confirmAction === 'leave' ? 'Leave expert lab?' : 'Start a new collection?'}</h2>
  <p>Current cases and labels will leave memory. Export JSON first if you want to keep them.</p>
  <div class="dialog-actions"><button onclick={() => { pending = null; confirmation.close(); }}>Keep working</button><button class="lab-danger" onclick={confirm}>{confirmAction === 'import' ? 'Replace collection' : confirmAction === 'leave' ? 'Leave lab' : 'Start new collection'}</button></div>
</dialog>

<style>
  .lab-workspace{max-width:1500px;margin:auto;padding:24px;color:#29372d;font-size:15px;line-height:1.5}
  .lab-heading,.lab-toolbar,.lab-preview,.lab-list-heading,.lab-pagination{display:flex;align-items:center;gap:12px;flex-wrap:wrap}
  .lab-heading,.lab-list-heading{justify-content:space-between}.lab-heading h1{margin:4px 0;font-size:32px;letter-spacing:-1px;font-weight:600}.lab-heading h1 span{color:var(--accent)}
  .lab-intro{max-width:800px;margin:12px 0}.lab-warning{padding:10px 14px;border:1px solid #ded6b9;border-radius:8px;background:#f4efdF;font-size:14px}
  .lab-grid{display:grid;grid-template-columns:minmax(0,1fr) 380px;gap:24px;margin-top:20px;align-items:start}
  .lab-workspace button,dialog button{padding:10px 14px;border:1px solid #ccd5c5;border-radius:7px;background:#e9eee2;color:#304d3c;font:inherit;min-height:44px}
  .lab-workspace button:hover:not(:disabled){background:#dce5d2}.lab-workspace .lab-primary{background:#3f604d;color:white;width:100%;margin:10px 0}
  .lab-toolbar{margin:12px 0}.lab-toolbar label{flex:1;min-width:140px}.lab-toolbar span{font-size:13px}
  .lab-workspace label{display:flex;flex-direction:column;gap:5px;font-size:14px;margin:9px 0}
  .lab-workspace input,.lab-workspace select,.lab-workspace textarea{font:inherit;color:inherit;border:1px solid #c5cebd;border-radius:6px;padding:8px;background:#fff;min-width:0;width:100%}
  .lab-workspace textarea{resize:vertical}.lab-workspace input[type=file]{font-size:13px}
  .lab-panel{border:1px solid #d5ddcd;border-radius:12px;background:#fdfdf7;padding:16px;margin-bottom:16px;min-width:0}
  .lab-panel h2,.lab-list-heading h2{margin:0 0 8px;font-size:20px;letter-spacing:-.3px;font-weight:600}
  .lab-panel p{margin:8px 0}.lab-fields{display:grid;grid-template-columns:1fr 1fr;gap:10px}.lab-panel small{display:block;color:#65705e;font-size:13px}
  .lab-error{color:#9d3028;background:#f9e8e3;padding:10px;border-radius:6px}.lab-message{color:#365b40;background:#e6efdf;padding:10px;border-radius:6px}.lab-totals{font-weight:600}
  .lab-board{margin:0 0 16px}.lab-board :global(.board-shell){height:auto!important;aspect-ratio:840/462}.lab-board :global(.board){height:100%;max-height:none}
  .lab-board :global(g[role=button]:not([aria-disabled=true])){cursor:pointer}.lab-preview strong{flex-basis:100%}.lab-preview button{padding:6px 10px;font-size:14px}
  .lab-sequence{overflow-wrap:anywhere}.lab-hint{color:#65705e}.lab-list-heading{margin:16px 0 8px}.lab-list-heading span{font-size:13px}
  .lab-candidates{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-height:420px;overflow:auto;padding:4px}
  .lab-candidates button{display:flex;flex-direction:column;gap:4px;text-align:left;background:#fafbf4;font-size:14px}.lab-candidates button>span:first-child{display:flex;justify-content:space-between;gap:10px;width:100%}
  .lab-candidates button.chosen{border:2px solid #3f604d;background:#e6efdf}.lab-candidates small{font-size:13px}.lab-value{font-variant-numeric:tabular-nums}.lab-tag{font-size:12px;text-transform:capitalize;border-radius:20px;padding:2px 8px;background:#d9e4ce}
  .lab-table{overflow-x:auto}.lab-table table{border-collapse:collapse;font-size:12px;width:100%}.lab-table caption{text-align:left;font-size:12px;color:#65705e;padding-bottom:8px}
  .lab-table th,.lab-table td{padding:6px 4px;border-bottom:1px solid #e1e5d8;text-align:right;font-variant-numeric:tabular-nums}.lab-table th:first-child{text-align:left}.lab-table tbody th{font-weight:500}
  .lab-json{margin-top:24px}.lab-json textarea{font-family:ui-monospace,monospace;font-size:12px}.lab-danger{background:#b33a32;color:white;border:0}
  @media(max-width:1000px){.lab-grid{grid-template-columns:minmax(0,1fr) 320px;gap:16px}.lab-workspace{padding:16px}.lab-candidates{grid-template-columns:1fr}}
  @media(max-width:760px){.lab-grid{grid-template-columns:1fr}.lab-workspace{padding:12px}.lab-heading h1{font-size:27px}.lab-toolbar{gap:8px}.lab-toolbar label{flex-basis:45%}}
</style>

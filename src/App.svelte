<script lang="ts">
  import { onMount } from 'svelte';
  import Board from './components/Board.svelte';
  import { createGame, startRound, openingRoll, roll, applyMove, availableMoves, undo, endTurn, nextGame, randomDie } from './lib/engine';
  import type { Game, Move, Pair } from './lib/engine';
  let game: Game = $state(createGame());
  let selected: number | null = $state(null);
  let choices: Move[] = $state([]);
  let notice = $state('');
  let online = $state(true);
  let rulesDialog: HTMLDialogElement;
  let resetDialog: HTMLDialogElement;
  let devScenarios: Record<string, () => Game> = $state({});
  let forced = $state('');
  const names = ['Light', 'Dark'];
  const moves = $derived(availableMoves(game));
  const finished = $derived(game.phase === 'gameOver' || game.phase === 'roundOver');
  const shownDice = $derived(game.dice ?? (game.phase === 'opening' || game.phase === 'roll' ? game.opening : null));
  const dots: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const primaryLabel = $derived(game.phase === 'ready' ? 'Start round' : game.phase === 'opening' ? (game.opening ? 'Reroll tie' : 'Roll to start') : game.phase === 'roll' ? 'Roll dice' : game.phase === 'moving' ? 'End turn' : game.phase === 'gameOver' ? 'Next game' : 'New round');
  const status = $derived(notice || (game.phase === 'ready' ? 'Two players. One device. First to 3.' :
    game.phase === 'opening' ? (game.opening ? 'A tie! Roll again to decide who starts.' : 'Each player rolls one die. Higher roll starts.') :
    game.phase === 'roll' ? `${names[game.active]} to roll${game.opening ? ' — take a fresh roll to begin' : ''}.` :
    game.phase === 'moving' ? (moves.length ? (selected === null ? 'Choose a checker. Legal moves will light up.' : 'Choose a highlighted destination.') : 'No moves remaining. End your turn when ready.') :
    game.phase === 'roundOver' ? `${names[game.outcome!.winner]} wins the round.` : `${names[game.outcome!.winner]} wins this game.`));
  onMount(() => {
    const update = () => { online = navigator.onLine; };
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    if (import.meta.env.DEV) {
      import('./lib/scenarios').then(({ scenarios }) => {
        devScenarios = scenarios;
        const name = new URLSearchParams(location.search).get('scenario');
        if (name && scenarios[name]) game = scenarios[name]();
      });
    }
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  });
  function clear() { selected = null; choices = []; notice = ''; }
  function dice(): Pair {
    if (import.meta.env.DEV && /^[1-6],[1-6]$/.test(forced)) {
      const pair = forced.split(',').map(Number) as Pair; forced = ''; return pair;
    }
    return [randomDie(), randomDie()];
  }
  function commit(move: Move) { game = applyMove(game, move); clear(); }
  function destination(to: number) {
    const possibilities = moves.filter(m => m.from === selected && m.to === to);
    if (possibilities.length === 1) commit(possibilities[0]);
    else if (possibilities.length > 1) choices = possibilities;
  }
  function choosePoint(point: number) {
    if (game.phase !== 'moving') return;
    notice = ''; choices = [];
    if (moves.some(m => m.from === selected && m.to === point)) { destination(point); return; }
    if (moves.some(m => m.from === point)) { selected = selected === point ? null : point; return; }
    const p = game.position.points[point];
    notice = p.count[game.active] && p.top !== game.active ? 'That checker is pinned until its cover moves away.' : 'That point has no legal move. Choose a highlighted destination.';
  }
  function primary() {
    clear();
    if (game.phase === 'ready' || game.phase === 'roundOver') game = startRound();
    else if (game.phase === 'opening') game = openingRoll(game, dice());
    else if (game.phase === 'roll') game = roll(game, dice());
    else if (game.phase === 'moving' && !moves.length) game = endTurn(game);
    else if (game.phase === 'gameOver') game = nextGame(game);
  }
  function reset() { game = startRound(); clear(); resetDialog.close(); }
</script>

<svelte:head><title>Mahbusa · Two players. One board.</title></svelte:head>
<div class="app-wrap">
  <header class="site-header">
    <a class="wordmark" href="/" onclick={(event) => event.preventDefault()} aria-label="Mahbusa home"><span class="brand-icon" aria-hidden="true"><i></i><i></i></span>mahbusa<span class="wordmark-dot">.</span></a>
    <div class="header-right"><span class="local-label"><span class="status-dot"></span>{online ? 'LOCAL PLAY' : 'OFFLINE PLAY'}</span><button class="text-button" onclick={() => rulesDialog.showModal()}>How to play <span aria-hidden="true">↗</span></button></div>
  </header>
  <main>
    <section class="game-heading" aria-label="Round scoreboard">
      <div class="heading-copy"><div class="eyebrow">A LITTLE STRATEGY. A LITTLE LUCK.</div><h1>Make your move.</h1></div>
      <div class="scoreboard">
        {#each names as name, player}
          <div class="player-score" class:active-player={game.active === player && !finished && game.phase !== 'ready' && game.phase !== 'opening'}>
            <span class="player-disc" class:dark-disc={player === 1}></span><span>{name}</span><strong>{game.score[player]}</strong>
          </div>
        {/each}
        <div class="round-target">FIRST TO <strong>3</strong></div>
      </div>
    </section>
    <div class="portrait-prompt"><span aria-hidden="true">↻</span><h2>A little more room to play.</h2><p>Turn your phone sideways for the board.</p><small>Your current game stays right here.</small></div>
    <section class="play-area" aria-label="Game">
      <div class="board-region">
        <Board {game} {selected} {moves} {choosePoint} bearOff={() => destination(-1)} />
        {#if game.phase === 'ready'}
          <div class="welcome-note"><span class="eyebrow">WELCOME TO THE BOARD</span><h2>Good company.<br />A good game.</h2><p>No sign-up. Just sit down and play.</p></div>
        {/if}
        {#if finished}
          <div class="result-card" role="status"><div class="eyebrow">{game.phase === 'roundOver' ? 'ROUND COMPLETE' : 'GAME COMPLETE'}</div><h2>{names[game.outcome!.winner]} wins<span>.</span></h2><p>{game.outcome!.reason === 'mother' ? 'Mother piece pinned' : game.outcome!.points === 2 ? 'All checkers off. Opponent has none off.' : 'All checkers borne off.'}</p><div class="points-award">+{game.outcome!.points} {game.outcome!.points === 1 ? 'point' : 'points'}</div></div>
        {/if}
      </div>
      <div class="turn-panel">
        <div class="turn-info"><span class="turn-marker" class:dark-marker={game.active === 1}></span><div><div class="eyebrow">{game.phase === 'opening' ? 'WHO GOES FIRST?' : finished ? 'WELL PLAYED' : game.phase === 'ready' ? 'READY WHEN YOU ARE' : `${names[game.active].toUpperCase()}'S TURN`}</div><p aria-live="polite">{status}</p></div></div>
        <div class="turn-actions">
          <div class="dice-area" aria-label={shownDice ? `Dice ${shownDice.join(' and ')}` : 'Dice not rolled'}>
            <div class="dice-pair">{#each [0, 1] as index}<div class="die" class:die-spent={game.phase === 'moving' && shownDice && !game.remaining.includes(shownDice[index])} aria-hidden="true">{#if shownDice}{#each Array(9) as _, cell}<span class:visible-pip={dots[shownDice[index]].includes(cell)}></span>{/each}{:else}<span class="die-dash">—</span>{/if}</div>{/each}</div>
            <span class="dice-caption">{game.phase === 'opening' ? 'LIGHT / DARK' : game.phase === 'moving' ? `${game.remaining.length} ${game.remaining.length === 1 ? 'MOVE' : 'MOVES'} LEFT` : 'LET IT ROLL'}</span>
          </div>
          <button class="undo-button" aria-label="Undo last move" disabled={game.phase !== 'moving' || !game.history.length} onclick={() => { game = undo(game); clear(); }}><span aria-hidden="true">↶</span> Undo</button>
          <button class="primary-button" disabled={game.phase === 'moving' && moves.length > 0} onclick={primary}>{primaryLabel}<span aria-hidden="true">→</span></button>
        </div>
      </div>
      {#if choices.length}
        <div class="die-choice" role="group" aria-label="Choose die for move"><span>Use which die?</span>{#each choices as move}<button onclick={() => commit(move)}>Use {move.die}</button>{/each}<button class="text-button" onclick={() => choices = []}>Cancel</button></div>
      {/if}
      {#if moves.some(m => m.from === selected && m.to === -1)}<button class="bear-off-button" onclick={() => destination(-1)}>Bear off selected checker →</button>{/if}
    </section>
    <footer class="game-footer"><span>Two players. One board. No distractions.</span><button class="text-button" onclick={() => resetDialog.showModal()}>Reset round</button></footer>
    {#if import.meta.env.DEV && Object.keys(devScenarios).length}
      <details class="dev-tools"><summary>Development scenarios</summary><div><label>Board fixture <select aria-label="Board fixture" onchange={(event) => { const name = event.currentTarget.value; if (devScenarios[name]) { game = devScenarios[name](); clear(); } }}><option value="">Choose a scenario</option>{#each Object.keys(devScenarios) as name}<option>{name}</option>{/each}</select></label><label>Next dice <input aria-label="Next dice" placeholder="e.g. 2,3" bind:value={forced} /></label><small>Only included in development. Production dice are random.</small></div></details>
    {/if}
  </main>
</div>
<dialog bind:this={rulesDialog} aria-labelledby="rules-title">
  <div class="dialog-heading"><span class="eyebrow">THE RULES OF THE BOARD</span><button class="close-button" aria-label="Close rules" onclick={() => rulesDialog.close()}>×</button></div><h2 id="rules-title">How to play.</h2>
  <p>Race your 15 checkers around the board and bear them off. Light moves from point 24 toward 1; Dark moves from 1 toward 24.</p>
  <ol><li><strong>Roll & move.</strong> Tap your checker, then a highlighted destination. Each move uses one die. Doubles give four moves. Use as many dice as possible; if only one can be used and either is playable, use the higher die.</li><li><strong>Pin, don't hit.</strong> Land on one opposing checker to pin it. It cannot move until your final covering checker leaves. Two opposing checkers, or an opposing checker covering yours, block a point.</li><li><strong>Protect your mother.</strong> The last checker on your starting point is your mother. If it is pinned, your opponent immediately wins 2 points.</li><li><strong>Bring them home.</strong> When all your remaining checkers are in your last six points, bear off with matching dice. An oversize die can take the farthest checker only when no checker is farther away.</li><li><strong>First to 3.</strong> A game wins 1 point, or 2 if the opponent has borne off none. First to 3 or more wins the round. The previous winner starts the next game.</li></ol>
  <p><strong>Take your time.</strong> Undo moves before End Turn. Dice rolls and winning moves cannot be undone.</p>
  <div class="install-note"><strong>Take the board with you.</strong><p>On iPhone, open in Safari, choose Share → Add to Home Screen. Load the app once online before playing offline. Only app files are cached; refreshing or reopening starts fresh.</p></div>
  <button class="primary-button" onclick={() => rulesDialog.close()}>Back to the board →</button>
</dialog>
<dialog bind:this={resetDialog} aria-labelledby="reset-title"><span class="eyebrow">A FRESH START</span><h2 id="reset-title">Reset this round?</h2><p>The current board and both scores will be cleared.</p><div class="dialog-actions"><button class="secondary-button" onclick={() => resetDialog.close()}>Keep playing</button><button class="primary-button" onclick={reset}>Reset round →</button></div></dialog>

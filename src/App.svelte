<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import Board from './components/Board.svelte';
  import { createGame, startRound, openingRoll, roll, applyMovePath, availableMoves, availableMovePaths, undo, endTurn, nextGame, randomDie } from './lib/engine';
  import type { Game, MovePath, Pair, Player } from './lib/engine';
  let game: Game = $state(createGame());
  let selected: number | null = $state(null);
  let choices: MovePath[] = $state([]);
  let notice = $state('');
  let online = $state(true);
  let rulesDialog: HTMLDialogElement;
  let resetDialog: HTMLDialogElement;
  let DevTools = $state<Component<{ loadScenario: (game: Game) => void; setDice: (value: string) => void }> | null>(null);
  let forced = $state('');
  const names = ['Light', 'Dark'];
  const moves = $derived(availableMoves(game));
  const paths = $derived(selected === null ? [] : availableMovePaths(game, selected));
  const destinations = $derived([...new Set(paths.map(path => path.to))]);
  const finished = $derived(game.phase === 'gameOver' || game.phase === 'roundOver');
  const shownDice = $derived(game.dice ?? (game.phase === 'opening' || game.phase === 'roll' ? game.opening : null));
  const openingTied = $derived(game.opening?.[0] != null && game.opening[0] === game.opening[1]);
  const dots: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
  const primaryLabel = $derived(game.phase === 'ready' ? 'Start round' : game.phase === 'roll' ? 'Roll dice' : game.phase === 'moving' ? 'End turn' : game.phase === 'gameOver' ? 'Next game' : 'New round');
  const status = $derived(notice || (game.phase === 'ready' ? 'Two players. One device. First to 3.' :
    game.phase === 'opening' ? (openingTied ? 'A tie! Each player rolls again.' : game.opening ? `${names[game.opening[0] === null ? 0 : 1]} still needs to roll. Higher roll starts.` : 'Each player rolls one die. Higher roll starts.') :
    game.phase === 'roll' ? `${names[game.active]} to roll${game.opening ? ' — take a fresh roll to begin' : ''}.` :
    game.phase === 'moving' ? (moves.length ? (selected === null ? 'Choose a checker. Legal moves will light up.' : 'Choose a highlighted destination.') : 'No moves remaining. End your turn when ready.') :
    game.phase === 'roundOver' ? `${names[game.outcome!.winner]} wins the round.` : `${names[game.outcome!.winner]} wins this game.`));
  onMount(() => {
    const update = () => { online = navigator.onLine; };
    update(); window.addEventListener('online', update); window.addEventListener('offline', update);
    if (import.meta.env.DEV) {
      import('./components/DevTools.svelte').then(({ default: panel }) => { DevTools = panel; });
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
  function openingDie(player: Player) {
    clear();
    const fixed = import.meta.env.DEV && /^[1-6],[1-6]$/.test(forced);
    game = openingRoll(game, player, fixed ? Number(forced.split(',')[player]) : randomDie());
    if (game.opening?.every(value => value !== null)) forced = '';
  }
  function commit(path: MovePath) { game = applyMovePath(game, path); clear(); }
  function destination(to: number) {
    const possibilities = paths.filter(path => path.to === to);
    if (possibilities.length === 1) commit(possibilities[0]);
    else if (possibilities.length > 1) choices = possibilities;
  }
  function choosePoint(point: number) {
    if (game.phase !== 'moving') return;
    notice = ''; choices = [];
    if (destinations.includes(point)) { destination(point); return; }
    if (moves.some(m => m.from === point)) { selected = selected === point ? null : point; return; }
    const p = game.position.points[point];
    notice = p.count[game.active] && p.top !== game.active ? 'That checker is pinned until its cover moves away.' : 'That point has no legal move. Choose a highlighted destination.';
  }
  function primary() {
    clear();
    if (game.phase === 'ready' || game.phase === 'roundOver') game = startRound();
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
        <Board {game} {selected} {moves} {destinations} {choosePoint} bearOff={() => destination(-1)} />
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
          {#if game.phase === 'opening'}
            <div class="opening-rolls" role="group" aria-label="Opening rolls">
              {#each [0, 1] as player}
                {@const value = game.opening?.[player]}
                <div class="opening-player">
                  <div class="die" role="img" aria-label={value == null ? `${names[player]} has not rolled` : `${names[player]} rolled ${value}`}>
                    {#if value != null}{#each Array(9) as _, cell}<span class:visible-pip={dots[value].includes(cell)}></span>{/each}{:else}<span class="die-dash">—</span>{/if}
                  </div>
                  <button class="primary-button opening-button" disabled={!openingTied && value != null} onclick={() => openingDie(player as Player)}>{names[player]}: {openingTied ? 'reroll' : value != null ? 'rolled' : 'roll die'}</button>
                </div>
              {/each}
            </div>
          {:else}
          <div class="dice-area" aria-label={shownDice ? `Dice ${shownDice.join(' and ')}` : 'Dice not rolled'}>
            <div class="dice-pair">{#each [0, 1] as index}{@const value = shownDice?.[index]}<div class="die" class:die-spent={game.phase === 'moving' && value != null && !game.remaining.includes(value)} aria-hidden="true">{#if value != null}{#each Array(9) as _, cell}<span class:visible-pip={dots[value].includes(cell)}></span>{/each}{:else}<span class="die-dash">—</span>{/if}</div>{/each}</div>
            <span class="dice-caption">{game.phase === 'roll' && game.opening ? 'LIGHT / DARK' : game.phase === 'moving' ? `${game.remaining.length} ${game.remaining.length === 1 ? 'MOVE' : 'MOVES'} LEFT` : 'LET IT ROLL'}</span>
          </div>
          <button class="undo-button" aria-label="Undo last move" disabled={game.phase !== 'moving' || !game.history.length} onclick={() => { game = undo(game); clear(); }}><span aria-hidden="true">↶</span> Undo</button>
          <button class="primary-button" disabled={game.phase === 'moving' && moves.length > 0} onclick={primary}>{primaryLabel}<span aria-hidden="true">→</span></button>
          {/if}
        </div>
      </div>
      {#if choices.length}
        <div class="die-choice" role="group" aria-label="Choose dice for move"><span>Use which dice?</span>{#each choices as path}<button onclick={() => commit(path)}>Use {path.steps.map(step => step.die).join(' + ')}</button>{/each}<button class="text-button" onclick={() => choices = []}>Cancel</button></div>
      {/if}
      {#if destinations.includes(-1)}<button class="bear-off-button" onclick={() => destination(-1)}>Bear off selected checker →</button>{/if}
    </section>
    <footer class="game-footer"><span>Two players. One board. No distractions.</span><button class="text-button" onclick={() => resetDialog.showModal()}>Reset round</button></footer>
    {#if DevTools}
      <DevTools loadScenario={(fixture) => { game = fixture; clear(); }} setDice={(value) => forced = value} />
    {/if}
  </main>
</div>
<dialog bind:this={rulesDialog} aria-labelledby="rules-title">
  <div class="dialog-heading"><span class="eyebrow">THE RULES OF THE BOARD</span><button class="close-button" aria-label="Close rules" onclick={() => rulesDialog.close()}>×</button></div><h2 id="rules-title">How to play.</h2>
  <p>Race your 15 checkers around the board and bear them off. Light moves from point 24 toward 1; Dark moves from 1 toward 24.</p>
  <p><strong>Who starts?</strong> Each player taps their own button to roll one die. Higher roll starts; ties mean both roll again. The starter then rolls two fresh dice for their first turn.</p>
  <ol><li><strong>Roll & move.</strong> Tap your checker, then a highlighted destination. Each move uses one die. Doubles give four moves. Use as many dice as possible; if only one can be used and either is playable, use the higher die.</li><li><strong>Pin, don't hit.</strong> Land on one opposing checker to pin it. It cannot move until your final covering checker leaves. Two opposing checkers, or an opposing checker covering yours, block a point.</li><li><strong>Protect your mother.</strong> The last checker on your starting point is your mother. If it is pinned, your opponent immediately wins 2 points.</li><li><strong>Bring them home.</strong> When all your remaining checkers are in your last six points, bear off with matching dice. An oversize die can take the farthest checker only when no checker is farther away.</li><li><strong>First to 3.</strong> A game wins 1 point, or 2 if the opponent has borne off none. First to 3 or more wins the round. The previous winner starts the next game.</li></ol>
  <p><strong>Use the total.</strong> Highlighted destinations include combined dice moves when every step is legal. Tap a farther destination to use multiple dice on one checker. With doubles, you can combine up to four steps.</p>
  <p><strong>Take your time.</strong> Undo moves before End Turn. One Undo reverses an entire combined move. Dice rolls and winning moves cannot be undone.</p>
  <div class="install-note"><strong>Take the board with you.</strong><p>On iPhone, open in Safari, choose Share → Add to Home Screen. Load the app once online before playing offline. Only app files are cached; refreshing or reopening starts fresh.</p></div>
  <button class="primary-button" onclick={() => rulesDialog.close()}>Back to the board →</button>
</dialog>
<dialog bind:this={resetDialog} aria-labelledby="reset-title"><span class="eyebrow">A FRESH START</span><h2 id="reset-title">Reset this round?</h2><p>The current board and both scores will be cleared.</p><div class="dialog-actions"><button class="secondary-button" onclick={() => resetDialog.close()}>Keep playing</button><button class="primary-button" onclick={reset}>Reset round →</button></div></dialog>

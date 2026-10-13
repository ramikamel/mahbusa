<script lang="ts">
  import { onMount } from 'svelte';
  import type { Component } from 'svelte';
  import Board from './components/Board.svelte';
  import Die from './components/Die.svelte';
  import { createGame, startRound, openingRoll, startGame, applyMovePath, availableMoves, availableMovePaths, undo, endTurnAndRoll, nextGameAndRoll, randomDie } from './lib/engine';
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
  const openingTied = $derived(game.opening?.[0] != null && game.opening[0] === game.opening[1]);
  const status = $derived(notice || (game.phase === 'ready' ? 'Sit down and play.' :
    game.phase === 'opening' ? (openingTied ? 'A tie! Both players reroll.' : game.opening ? `${names[game.opening[0] === null ? 0 : 1]}, roll your die.` : 'Roll one die each. Higher starts.') :
    game.phase === 'roll' ? `${names[game.active]} starts. Ready to play?` :
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
    else if (game.phase === 'roll') game = startGame(game, dice());
    else if (game.phase === 'moving' && !moves.length) game = endTurnAndRoll(game, dice());
    else if (game.phase === 'gameOver') game = nextGameAndRoll(game, dice());
  }
  function reset() { game = startRound(); clear(); resetDialog.close(); }
</script>

<svelte:head><title>Mahbusa</title></svelte:head>
<div class="app-wrap">
  <header class="site-header">
    <button class="wordmark" aria-label="Mahbusa — How to play" aria-haspopup="dialog" title="How to play" onclick={() => rulesDialog.showModal()}><span class="brand-icon" aria-hidden="true"><i></i><i></i></span>mahbusa<span class="wordmark-dot">.</span></button>
    <div class="scoreboard" role="region" aria-label="Round scoreboard">
      {#each names as name, player}
        <div class="player-score" class:active-player={game.active === player && !finished && game.phase !== 'ready' && game.phase !== 'opening'}>
          <span class="player-disc" class:dark-disc={player === 1}></span><span>{name}</span><strong>{game.score[player]}</strong>
          {#if game.active === player && game.phase === 'moving'}<span class="sr-only">Current turn</span>{/if}
        </div>
      {/each}
    </div>
    <div class="header-right">
      <span class="local-label"><span class="status-dot"></span>{online ? 'LOCAL PLAY' : 'OFFLINE PLAY'}</span>
    </div>
  </header>
  <main>
    <div class="portrait-prompt"><span aria-hidden="true">↻</span><h2>A little more room to play.</h2><p>Turn your phone sideways for the board.</p><small>Your current game stays right here.</small></div>
    <section class="play-area" aria-label="Game">
      <p class="sr-only" aria-live="polite">{status}</p>
      <div class="board-region">
        <Board {game} {selected} {moves} {destinations} {choosePoint} bearOff={() => destination(-1)}>
          {#snippet wall()}
            {#if game.phase === 'moving' && game.dice}
              <div class="wall-dice" role="group" aria-label={'Dice ' + game.dice.join(' and ')}>
                {#each game.dice as value}<Die {value} spent={!game.remaining.includes(value)} />{/each}
              </div>
            {/if}
          {/snippet}
          {#snippet tray()}
            <div class="tray-tools" role="group" aria-label="Board controls and borne-off checkers">
              <button class="tray-control" aria-label="Undo last move" title="Undo last move" disabled={game.phase !== 'moving' || !game.history.length} onclick={() => { game = undo(game); clear(); }}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5 3 11l6 6M3 11h10a6 6 0 0 1 6 6" /></svg></button>
              {#if destinations.includes(-1)}<button class="tray-bear-off" aria-label="Bear off selected checker" title="Bear off selected checker" onclick={() => destination(-1)}></button>{/if}
              <button class="tray-control" aria-label="Reset round" title="Reset round" onclick={() => resetDialog.showModal()}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7" /></svg></button>
            </div>
          {/snippet}
        </Board>
        {#if game.phase === 'ready'}
          <div class="center-message welcome-message"><span class="eyebrow">WELCOME TO THE BOARD</span><h2>Good company.<br />A good game.</h2><p>No sign-up. Just sit down and play.</p><button class="primary-button" onclick={primary}>Start round</button></div>
        {:else if game.phase === 'opening' || game.phase === 'roll'}
          <div class="center-message opening-message" class:has-start={game.phase === 'roll'} aria-label="Opening contest">
            <span class="eyebrow">{game.phase === 'opening' ? 'WHO GOES FIRST?' : names[game.active].toUpperCase() + ' STARTS'}</span>
            <p class="opening-status">{status}</p>
            <div class="opening-rolls" role="group" aria-label="Opening rolls">
              {#each [0, 1] as player}
                {@const value = game.opening?.[player]}
                <div class="opening-player">
                  <Die value={value ?? null} label={value == null ? names[player] + ' has not rolled' : names[player] + ' rolled ' + value} />
                  <button class="primary-button opening-button" disabled={game.phase !== 'opening' || (!openingTied && value != null)} onclick={() => openingDie(player as Player)}>{names[player]}: {openingTied ? 'reroll' : value != null ? 'rolled' : 'roll die'}</button>
                </div>
              {/each}
            </div>
            {#if game.phase === 'roll'}<div class="opening-start"><button class="primary-button" onclick={primary}>Start game</button></div>{/if}
          </div>
        {:else if finished}
          <div class="center-message result-card" aria-label="Game result"><div role="status"><div class="eyebrow">{game.phase === 'roundOver' ? 'ROUND COMPLETE' : 'GAME COMPLETE'}</div><h2>{names[game.outcome!.winner]} wins<span>.</span></h2><p>{game.outcome!.reason === 'mother' ? 'Mother piece pinned' : game.outcome!.points === 2 ? 'All checkers off. Opponent has none off.' : 'All checkers borne off.'}</p><div class="points-award">+{game.outcome!.points} {game.outcome!.points === 1 ? 'point' : 'points'}</div></div><button class="primary-button result-action" onclick={primary}>{game.phase === 'roundOver' ? 'New round' : 'Next game'}</button></div>
        {:else if !moves.length}
          <div class="center-message turn-complete" aria-label="Turn complete"><span class="eyebrow">{names[game.active].toUpperCase()}'S TURN</span><h2>{game.remaining.length ? 'No moves available.' : 'Turn complete.'}</h2><p>Pass the board when you're ready.</p><button class="primary-button" onclick={primary}>End turn</button></div>
        {/if}
        {#if choices.length}
          <div class="center-message move-choice" role="group" aria-label="Choose dice for move"><p>Use which dice?</p><div class="choice-actions">{#each choices as path}<button class="primary-button" onclick={() => commit(path)}>Use {path.steps.map(step => step.die).join(' + ')}</button>{/each}<button class="text-button" onclick={() => choices = []}>Cancel</button></div></div>
        {/if}
        {#if notice}<p class="board-notice" role="status">{notice}</p>{/if}
      </div>
    </section>
    {#if DevTools}<DevTools loadScenario={(fixture) => { game = fixture; clear(); }} setDice={(value) => forced = value} />{/if}
  </main>
</div>
<dialog bind:this={rulesDialog} aria-labelledby="rules-title">
  <div class="dialog-heading"><span class="eyebrow">THE RULES OF THE BOARD</span><button class="close-button" aria-label="Close rules" onclick={() => rulesDialog.close()}>×</button></div><h2 id="rules-title">How to play.</h2>
  <p>Race your 15 checkers around the board and bear them off. Light moves counterclockwise from the upper-right starting point; Dark moves clockwise from the lower-right starting point.</p>
  <p><strong>Who starts?</strong> Each player taps their own button to roll one die. Higher roll starts; ties mean both roll again. Tap Start game to roll two fresh dice for the winner.</p>
  <p><strong>Pass the turn.</strong> After using your legal moves, tap End turn. The next player's dice roll automatically. If no moves are possible, tap End turn to pass.</p>
  <ol><li><strong>Roll & move.</strong> Tap your checker, then a highlighted destination. Each move uses one die. Doubles give four moves. Use as many dice as possible; if only one can be used and either is playable, use the higher die.</li><li><strong>Pin, don't hit.</strong> Land on one opposing checker to pin it. It cannot move until your final covering checker leaves. Two opposing checkers, or an opposing checker covering yours, block a point.</li><li><strong>Protect your mother.</strong> The last checker on your starting point is your mother. If it is pinned, your opponent immediately wins 2 points.</li><li><strong>Bring them home.</strong> When all your remaining checkers are in your last six points, bear off with matching dice. An oversize die can take the farthest checker only when no checker is farther away.</li><li><strong>First to 3.</strong> A game wins 1 point, or 2 if the opponent has borne off none. First to 3 or more wins the round. The previous winner starts the next game.</li></ol>
  <p><strong>Use the total.</strong> Highlighted destinations include combined dice moves when every step is legal. Tap a farther destination to use multiple dice on one checker. With doubles, you can combine up to four steps.</p>
  <p><strong>Take your time.</strong> Undo moves before End Turn. One Undo reverses an entire combined move. Dice rolls and winning moves cannot be undone.</p>
  <div class="install-note"><strong>Take the board with you.</strong><p>On iPhone, open in Safari, choose Share → Add to Home Screen. Load the app once online before playing offline. Only app files are cached; refreshing or reopening starts fresh.</p></div>
  <button class="primary-button" onclick={() => rulesDialog.close()}>Back to the board →</button>
</dialog>
<dialog bind:this={resetDialog} aria-labelledby="reset-title"><span class="eyebrow">A FRESH START</span><h2 id="reset-title">Reset this round?</h2><p>The current board and both scores will be cleared.</p><div class="dialog-actions"><button class="secondary-button" onclick={() => resetDialog.close()}>Keep playing</button><button class="primary-button danger-button" onclick={reset}>Reset round →</button></div></dialog>

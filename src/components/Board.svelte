<script lang="ts">
  import type { Game, Move, Player } from '../lib/engine';
  import type { Snippet } from 'svelte';
  let { game, selected, moves, destinations, choosePoint, bearOff, wall, tray }: {
    game: Game; selected: number | null; moves: Move[]; destinations: number[];
    choosePoint: (point: number) => void; bearOff: () => void;
    wall?: Snippet;
    tray?: Snippet;
  } = $props();
  const top = Array.from({ length: 12 }, (_, i) => i + 12);
  const bottom = Array.from({ length: 12 }, (_, i) => 11 - i);
  let width = $state(1200);
  let height = $state(800);
  const compact = $derived(height <= 600 && width > height);
  const boardHeight = $derived(compact ? 250 : 462);
  let boardWidth = $state(0);
  let boardPixelsHeight = $state(0);
  const scale = $derived(Math.min(boardWidth / 840, boardPixelsHeight / boardHeight));
  function x(slot: number) { return 64 + slot * 58 + (slot >= 6 ? 36 : 0); }
  const targets = $derived(new Set(destinations));
  const canBear = $derived(targets.has(-1));
  function tokens(point: number) {
    const p = game.position.points[point];
    const count = p.count[0] + p.count[1];
    const mixed = p.count[0] > 0 && p.count[1] > 0;
    const visible = Math.min(count, compact ? 4 : 6);
    return Array.from({ length: visible }, (_, i) => ({
      player: (mixed && i === 0 ? (p.top === 0 ? 1 : 0) : p.top) as Player,
      label: count > visible && i === visible - 1 ? String(count) : '',
      offset: i * (compact ? 16 : 27),
    }));
  }
  function label(point: number) {
    const p = game.position.points[point];
    return `Point ${point + 1}: ${p.count[0]} light, ${p.count[1]} dark${p.count[0] && p.count[1] ? ', pinned checker' : ''}${targets.has(point) ? ', legal destination' : ''}`;
  }
</script>

<svelte:window bind:innerWidth={width} bind:innerHeight={height} />

<div class="board-shell" bind:clientWidth={boardWidth} bind:clientHeight={boardPixelsHeight}>
  <svg class="board" viewBox={`0 0 840 ${boardHeight}`} aria-label="Mahbusa board, 24 points" role="group">
    <rect x="1" y="1" width="838" height={boardHeight - 2} rx="24" class="board-border" />
    <rect x="24" y="24" width="756" height={boardHeight - 48} rx="12" class="board-field" />
    <rect x="391" y="24" width="24" height={boardHeight - 48} rx="6" class="board-spine" />
    <path d={`M403 ${boardHeight / 2 - 28}v56`} class="spine-mark" />
    {#each [{ points: top, upper: true }, { points: bottom, upper: false }] as row}
      {#each row.points as point, slot}
        {@const cx = x(slot)}
        {@const p = game.position.points[point]}
        {@const selectable = game.phase === 'moving' && p.top === game.active && moves.some(m => m.from === point)}
        <g role="button" tabindex={selectable || targets.has(point) ? 0 : -1} aria-label={label(point)} aria-disabled={!selectable && !targets.has(point)}
          onclick={() => choosePoint(point)}
          onkeydown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); choosePoint(point); } }}
          class:point-selected={selected === point} class:point-target={targets.has(point)}>
          <rect x={cx - 28} y={row.upper ? 26 : boardHeight / 2 + 9} width="56" height={boardHeight / 2 - 37} rx="8" class="point-hit" />
          <path d={row.upper ? `M${cx - 25} 43H${cx + 25}L${cx} ${boardHeight / 2 - 26}Z` : `M${cx - 25} ${boardHeight - 43}H${cx + 25}L${cx} ${boardHeight / 2 + 26}Z`}
            class="triangle" class:triangle-alt={slot % 2 === 0} />
          {#each tokens(point) as token, i}
            {@const inset = compact ? 56 : 68}
            {@const cy = row.upper ? inset + token.offset : boardHeight - inset - token.offset}
            <circle cx={cx} {cy} r={compact ? 18 : 23} class="checker" class:checker-light={token.player === 0} class:checker-dark={token.player === 1} />
            {#if token.label}<text x={cx} y={cy + 5} class="stack-count" class:count-dark={token.player === 1}>{token.label}</text>{/if}
          {/each}
          {#if targets.has(point)}<circle cx={cx} cy={row.upper ? boardHeight / 2 - 12 : boardHeight / 2 + 12} r="6" class="destination-dot" />{/if}
        </g>
      {/each}
    {/each}
    <g role="button" tabindex={canBear ? 0 : -1} aria-label={`Bear off. Light ${game.position.off[0]}, dark ${game.position.off[1]}`} aria-disabled={!canBear}
      onclick={() => { if (canBear) bearOff(); }}
      onkeydown={(event) => { if (canBear && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); bearOff(); } }}
      class:off-available={canBear}>
      <rect x="793" y="25" width="32" height={boardHeight - 50} rx="12" class="off-tray" />
    </g>
  </svg>
  {#if wall}<div class="board-wall" style:left={`${boardWidth / 2 - 17 * scale}px`} style:top={`${boardPixelsHeight / 2}px`}>{@render wall()}</div>{/if}
  {#if tray}<div class="tray-overlay" style:left={`${boardWidth / 2 + 389 * scale}px`} style:top={`${boardPixelsHeight / 2}px`} style:height={`${(boardHeight - 50) * scale}px`}>{@render tray()}</div>{/if}
</div>

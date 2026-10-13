<script lang="ts">
  import type { Game, Move, Player } from '../lib/engine';
  let { game, selected, moves, destinations, choosePoint, bearOff }: {
    game: Game; selected: number | null; moves: Move[]; destinations: number[];
    choosePoint: (point: number) => void; bearOff: () => void;
  } = $props();
  const top = Array.from({ length: 12 }, (_, i) => i + 12);
  const bottom = Array.from({ length: 12 }, (_, i) => 11 - i);
  let width = $state(1200);
  let height = $state(800);
  const compact = $derived(height <= 600 && width > height);
  const boardHeight = $derived(compact ? 250 : 462);
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
      pinned: mixed && i === 0,
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

<div class="board-shell">
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
          <text x={cx} y={row.upper ? 38 : boardHeight - 28} class="point-number">{point + 1}</text>
          {#each tokens(point) as token, i}
            {@const inset = compact ? 56 : 68}
            {@const cy = row.upper ? inset + token.offset : boardHeight - inset - token.offset}
            <circle cx={cx} {cy} r={compact ? 18 : 23} class="checker" class:checker-light={token.player === 0} class:checker-dark={token.player === 1} />
            {#if token.pinned}
              <path d={`M${cx - 7} ${cy - 4}v-3a7 7 0 0 1 14 0v3M${cx - 9} ${cy - 4}h18v13h-18z`} class="pin-symbol" />
            {/if}
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
      <text x="809" y={boardHeight / 2 - 57} class="off-number">{game.position.off[1]}</text>
      <circle cx="809" cy={boardHeight / 2 - 36} r="8" class="checker-dark" />
      <path d={`M800 ${boardHeight / 2}h18`} class="tray-divider" />
      <circle cx="809" cy={boardHeight / 2 + 36} r="8" class="checker-light" />
      <text x="809" y={boardHeight / 2 + 67} class="off-number">{game.position.off[0]}</text>
    </g>
  </svg>
  <div class="board-captions"><span>Dark travels clockwise ↻</span><span>Light travels counterclockwise ↺</span></div>
</div>

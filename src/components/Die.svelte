<script lang="ts">
  let { value = null, label, spent = false }: { value?: number | null; label?: string; spent?: boolean } = $props();
  const dots: Record<number, number[]> = { 1: [4], 2: [0, 8], 3: [0, 4, 8], 4: [0, 2, 6, 8], 5: [0, 2, 4, 6, 8], 6: [0, 2, 3, 5, 6, 8] };
</script>
<div class="die" class:die-spent={spent} role="img" aria-label={label ?? (value === null ? 'Die not rolled' : `Die ${value}${spent ? ', used' : ''}`)}>
  {#if value !== null}{#each Array(9) as _, cell}<span class:visible-pip={dots[value].includes(cell)}></span>{/each}{:else}<span class="die-dash">—</span>{/if}
</div>

<script lang="ts">
  import { onMount } from 'svelte';
  import { scenarios } from '../lib/scenarios';
  import type { Game } from '../lib/engine';
  let { loadScenario, setDice }: { loadScenario: (game: Game) => void; setDice: (value: string) => void } = $props();
  onMount(() => {
    const name = new URLSearchParams(location.search).get('scenario');
    if (name && scenarios[name]) loadScenario(scenarios[name]());
  });
</script>
<details class="dev-tools"><summary>Development scenarios</summary><div>
  <label>Board fixture <select aria-label="Board fixture" onchange={(event) => { const name = event.currentTarget.value; if (scenarios[name]) loadScenario(scenarios[name]()); }}><option value="">Choose a scenario</option>{#each Object.keys(scenarios) as name}<option>{name}</option>{/each}</select></label>
  <label>Next dice <input aria-label="Next dice" placeholder="e.g. 2,3" oninput={(event) => setDice(event.currentTarget.value)} /></label>
  <small>Only included in development. Production dice are random.</small>
</div></details>

<script>
  import { STANCE, ORIGIN } from "../lib/labels.js";
  import { scrutinOf, cohesionOf } from "../lib/scoring.js";
  import Badge from "./Badge.svelte";

  let { position, party = null, selected = false, onselect = null } = $props();

  const s = $derived(scrutinOf(position));
  const c = $derived(cohesionOf(position));
</script>

<div class="panel">
  <div class="spread">
    <strong>{party?.label ?? position.group}</strong>
    <Badge text={STANCE[position.stance] ?? position.stance} variant="stance-{position.stance}" />
  </div>

  {#if position.justification}
    <blockquote>« {position.justification} »</blockquote>
    <p class="small muted">
      {position.speaker}
      {#if position.quote_origin}
        · <Badge text={ORIGIN[position.quote_origin] ?? position.quote_origin} variant="origin" />
      {/if}
    </p>
  {:else if position.justification_exempt}
    <p class="small muted">{position.justification_exempt}</p>
  {/if}

  {#if s}
    <p class="small muted">
      Vote du groupe : {s.pour} pour · {s.contre} contre · {s.abstention} abstention
      {#if c !== null}· cohésion {(c * 100).toFixed(0)} %{/if}
    </p>
  {/if}

  {#if onselect}
    <button class="card" aria-pressed={selected} onclick={() => onselect(position.group)}>
      {selected ? "Position retenue" : "Je partage cette position"}
    </button>
  {/if}
</div>

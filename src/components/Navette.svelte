<script>
  import { etapeLabel } from "../lib/labels.js";
  import Badge from "./Badge.svelte";

  let { steps = [] } = $props();
</script>

<ol class="steps small">
  {#each steps as s}
    <li>
      {etapeLabel(s.etape)} — {s.date}
      {#if s.scrutin}<span class="muted"> · scrutin {s.scrutin}</span>{/if}
      {#if s.vote}
        <span class="muted">
          · {s.vote.pour}/{s.vote.contre}{s.vote.abstention !== undefined ? `/${s.vote.abstention}` : ""}
        </span>
      {/if}
      {#if s.gap}
        <Badge text="étape non modélisée" variant="warn" title={s.gap_reason} />
      {/if}
    </li>
  {/each}
</ol>

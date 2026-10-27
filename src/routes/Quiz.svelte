<script>
  import Navette from "../components/Navette.svelte";
  import PositionCard from "../components/PositionCard.svelte";
  import Badge from "../components/Badge.svelte";
  import { ETAT } from "../lib/labels.js";
  import { partyBySlug } from "../lib/content.js";

  let { question, index, total, answers, onanswer, onback } = $props();

  const current = $derived(answers[question.id]?.choice ?? null);
</script>

<div class="spread small muted">
  <span>Texte {index + 1} sur {total}</span>
  <span>{question.themes.join(" · ")}</span>
</div>
<div class="progress"><span style="width: {((index + 1) / total) * 100}%"></span></div>

<h1>{question.texte.titre}</h1>

<p class="small muted">
  {question.as_of}
  · <Badge text={ETAT[question.texte.etat] ?? question.texte.etat} variant={question.texte.etat === "inconnu" ? "warn" : ""} />
  {#if question.texte.scrutin}· scrutin {question.texte.scrutin.id}{/if}
</p>

<p>{question.situation}</p>

{#if question.navette?.length}
  <details class="panel">
    <summary class="small">Parcours du texte</summary>
    <Navette steps={question.navette} />
  </details>
{/if}

<h2>Les positions</h2>
<p class="small muted">Choisissez celle dont vous vous sentez le plus proche.</p>

{#each question.positions as position (position.group)}
  <PositionCard
    {position}
    party={partyBySlug.get(position.group)}
    selected={current === position.group}
    onselect={onanswer}
  />
{/each}

<div class="row" style="margin-top:1rem">
  <button onclick={() => onanswer("aucune")}>Aucune de ces positions</button>
  <button onclick={() => onanswer("skip")}>Je ne me prononce pas</button>
  {#if onback}<button data-variant="outline" onclick={onback}>Précédent</button>{/if}
</div>

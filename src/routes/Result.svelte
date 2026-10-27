<script>
  import Badge from "../components/Badge.svelte";
  import { STANCE } from "../lib/labels.js";
  import { partyBySlug } from "../lib/content.js";

  let { result, total, onrestart, onexport } = $props();

  const best = $derived(result.ranked[0]);
</script>

<h1>Votre résultat</h1>

<p>
  {result.answered} texte{result.answered > 1 ? "s" : ""} renseigné{result.answered > 1 ? "s" : ""}
  sur {total}{#if result.skipped > 0} · {result.skipped} sans opinion{/if}.
</p>

{#if result.answered === 0}
  <p class="muted">Aucune réponse : il n'y a rien à comparer.</p>
{:else}
  <h2>Groupes les plus proches</h2>
  <p class="small muted">
    Un accord n'est « ferme » que si le groupe votait de façon cohésive sur le texte. Sur un groupe
    divisé, l'accord est compté à part.
  </p>

  <div class="oc-table">
    <table>
      <thead>
        <tr>
          <th>Groupe</th>
          <th class="num">Accords fermes</th>
          <th class="num">Accords partagés</th>
          <th class="num">Divergences</th>
        </tr>
      </thead>
      <tbody>
        {#each result.ranked as r}
          <tr>
            <td>{r.label}</td>
            <td class="num">{r.firm}</td>
            <td class="num">{r.shared}</td>
            <td class="num">{r.disagreements.length}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  {#if best && best.disagreements.length > 0}
    <h2>Où vous divergez de {best.label}</h2>
    <ul>
      {#each best.disagreements as d}
        <li>
          <a href="/texte/{d.id}">{d.titre}</a>
          <span class="small muted">
            — vous : {STANCE[d.votrePosition] ?? d.votrePosition} ({d.votreChoix}) ·
            ce groupe : {STANCE[d.saPosition] ?? d.saPosition}
          </span>
        </li>
      {/each}
    </ul>
  {/if}

  <h2>Détail par groupe</h2>
  {#each result.ranked as r}
    <details class="panel">
      <summary>
        {r.label}
        <span class="small muted">
          — {r.firm} ferme{r.firm > 1 ? "s" : ""}, {r.shared} partagé{r.shared > 1 ? "s" : ""},
          {r.disagreements.length} divergence{r.disagreements.length > 1 ? "s" : ""}
        </span>
      </summary>
      {#if r.disagreements.length === 0}
        <p class="small muted">Aucune divergence sur les textes renseignés.</p>
      {:else}
        <ul class="small">
          {#each r.disagreements as d}
            <li>
              <a href="/texte/{d.id}">{d.titre}</a>
              — <Badge text={STANCE[d.saPosition] ?? d.saPosition} />
            </li>
          {/each}
        </ul>
      {/if}
    </details>
  {/each}

  {#if result.rejected.length > 0}
    <h2>Textes que vous avez rejetés en bloc</h2>
    <ul class="small">
      {#each result.rejected as q}<li>{q.titre}</li>{/each}
    </ul>
  {/if}
{/if}

<div class="panel warn small">
  <strong>Ce que ce résultat n'est pas.</strong>
  Ce n'est ni un score, ni une recommandation de vote. Il compare vos choix à des positions
  documentées sur {total} textes — un échantillon étroit, non représentatif de l'ensemble des
  programmes. Un groupe peut par ailleurs être divisé : la colonne « accords partagés » le signale.
</div>

<div class="row">
  <button class="primary" onclick={onexport}>Exporter mes réponses (JSON)</button>
  <button onclick={onrestart}>Recommencer</button>
</div>

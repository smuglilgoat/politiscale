<script>
  import { questions } from "../lib/content.js";

  let { answered = 0, onstart } = $props();
</script>

<h1>Ce que les partis votent vraiment</h1>
<p>
  Cinq textes de loi réels. Pour chacun, la position des groupes parlementaires, leur explication,
  et le vote qui la prouve. Vous choisissez la position qui vous convient ; le résultat vous dit avec
  quels groupes vous convergez, et sur quels textes vous divergez.
</p>

<div class="panel">
  <div class="spread">
    <span>{questions.length} textes · environ 10 minutes</span>
    <span class="muted small">{answered}/{questions.length} réponses enregistrées</span>
  </div>
  <p>
    <button class="primary" onclick={onstart}>
      {answered > 0 ? "Reprendre le test" : "Commencer"}
    </button>
  </p>
</div>

<h2>Comment c'est construit</h2>
<ul>
  <li>Chaque question porte sur un texte réel voté à l'Assemblée nationale.</li>
  <li>Les positions viennent des groupes eux-mêmes : citations attribuées, avec leur source.</li>
  <li>Chaque citation porte l'étiquette du débat d'où elle sort : texte final, motion de rejet…</li>
  <li>Un groupe divisé n'est pas présenté comme uni : sa répartition de vote est affichée.</li>
  <li>Rien ne quitte votre appareil : les réponses restent dans le navigateur.</li>
</ul>

<p class="small muted">
  <a href="/methode">Méthode complète et limites</a>
</p>

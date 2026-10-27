<script>
  import { questions, parties } from "../lib/content.js";
</script>

<h1>Méthode et limites</h1>

<p>
  Ce test ne demande pas votre avis sur des affirmations générales. Il part de textes réellement
  votés, et compare votre choix aux positions documentées des groupes parlementaires.
</p>

<h2>D'où viennent les positions</h2>
<ul>
  <li>
    <strong>Le vote.</strong> Chaque position porte la répartition officielle du groupe sur le
    scrutin, publiée par l'Assemblée nationale.
  </li>
  <li>
    <strong>La citation.</strong> Une phrase, prise dans le compte rendu, attribuée à son orateur.
    Elle est vérifiée mot pour mot contre le compte rendu avant publication.
  </li>
  <li>
    <strong>L'étiquette d'origine.</strong> Chaque citation indique le débat dont elle sort : débat
    sur le texte final, sur une motion de rejet, en commission. Une citation procédurale n'a pas le
    même poids qu'une citation sur le texte, et vous devez pouvoir le voir.
  </li>
</ul>

<h2>Les groupes ne sont pas toujours unis</h2>
<p>
  La plupart votent en bloc, mais certains se scindent régulièrement. Le calcul distingue donc les
  <strong>accords fermes</strong> (groupe cohésif à au moins 80 % des votants) des
  <strong>accords partagés</strong> (groupe divisé), qui sont comptés à part et jamais confondus.
  La répartition brute est affichée sur chaque position.
</p>
<p class="small muted">
  Le seuil de 80 % est une convention, publiée comme telle. D'autres outils utilisent la majorité
  simple ; le résultat serait alors différent.
</p>

<h2>Ce qui est incomplet, et assumé</h2>
<ul>
  <li>
    <strong>Le sort de certains textes est inconnu.</strong> Quand la suite — Conseil
    constitutionnel, promulgation — n'est pas documentée, elle est marquée « sort inconnu » plutôt
    que devinée.
  </li>
  <li>
    <strong>Des étapes du parcours parlementaire ne sont pas modélisées</strong> et apparaissent
    comme telles dans le parcours du texte.
  </li>
  <li>
    <strong>Le corpus est étroit :</strong> {questions.length} textes, tous de la 17e législature.
    Il ne couvre pas l'ensemble des sujets et ne permet pas de conclure sur un programme entier.
  </li>
  <li>
    <strong>Les non-inscrits n'ont pas de position de groupe.</strong> Ils votent individuellement ;
    aucune déclaration collective ne peut être citée.
  </li>
</ul>

<h2>Neutralité</h2>
<p>
  Aucune position n'est publiée sans preuve : la validation refuse une position sans vote ou sans
  citation attribuée. La sélection des textes est calculée — le vote le plus clivant des étapes
  identifiables — et non choisie au gré de l'actualité. Les corrections sont journalisées.
</p>

<p class="small muted">
  {parties.length} groupes comparés. Sources : Assemblée nationale (open data et comptes rendus),
  sous Licence Ouverte 2.0.
</p>

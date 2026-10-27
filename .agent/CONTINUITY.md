# CONTINUITY — Hemicycle

Briefing vivant. Lire avant d'agir. Tags : `[USER]` `[CODE]` `[TOOL]` `[ASSUMPTION]`.
Compressé le 2026-10-26 : les entrées antérieures se contredisaient (unité, périmètre CMP/Sénat).
En cas de doute, `docs/PLAN.md` fait foi.

## [ÉTAT]

Projet au **M1c terminé**, M1d non commencé. **Une** question complète, **aucune interface**.

- `content/` : **5 questions** (M1d terminé) — agriculture, aide à mourir, Corse, mineurs/réseaux
  sociaux, fraudes sociales et fiscales. 10 à 11 citations verbatim par question, toutes vérifiées
  par sous-chaîne contre le compte rendu avant écriture. `content/sources.json` : 17 sources.
- `pipeline/` : `fetch-snapshot`, `group-votes`, `an-scrutin-groups`, `sync-evidence`,
  `rank-scrutins`, `select-texts`, `extract-explications`, `extract-commission`,
  `validate-content` (porte bloquante).
- **App** : Svelte 5 + Vite, 100 % statique (`src/`), 5 questions jouables, résultat + export JSON,
  `localStorage` sous la clé `hemicycle.v1`. Build ~91 kB (30 kB gzip). 7 tests sur le calcul.
- Aucun backend, aucune requête réseau à l'exécution : le contenu est bundlé au build.

## [DÉCISIONS]

- `[USER]` Nom **Hemicycle** ; France ; **français seulement** ; statique sans backend ; Svelte + Vite.
- `[USER]` Résultat = convergences nominatives, pas de pourcentage arbitraire. **Divergence interne
  signalée à part, jamais créditée.** L'arbitre d'un litige factuel est le porteur du projet.
- `[USER]` **Cible : 40 questions.**
- `[USER]` **Règle d'ancrage B** : l'étape la plus clivante parmi les étapes intelligibles.
- `[CODE]` Unité = **parti** adossé à un **groupe** chambre-spécifique. Position déclarée prime sur
  le vote. La cohésion (seuil 80 %) ne se stocke pas, elle se recalcule.
- `[CODE]` `justification` = citation verbatim **attribuée** (`speaker` + `source_ref`) et
  **étiquetée par origine** (`quote_origin`). Plafond 45 mots (officiel) / 25 (presse).
- `[CODE]` Les interventions de **commission sont du contexte**, jamais une `stance`. Le trou de
  navette est une étape `gap` étiquetée, pas une absence.
- `[USER]` **CMP écartée**, **Sénat reporté**.

## [DÉCOUVERTES UTILES]

- `[TOOL]` **La qualité du débat est le vrai facteur limitant, pas le clivage du vote.** Sondés à la
  main : sur 9 textes examinés, 5 n'ont pas donné de débat exploitable. V3273 argumente sur le
  Nutri-score et le Mercosur, V1303 est un chapelet d'interjections, V217 porte sur l'article 2 octies
  et non sur la discussion générale, V2957 fonctionne mais porte sur la loi Duplomb, ancêtre direct de
  la question 1. Un score automatique a été construit puis **abandonné** : il se trompait dans les
  deux sens (6/11 à la question la mieux sourcée). Le tri reste la lecture.
- `[TOOL]` **Un scrutin de 1re lecture en fin d'examen donne un débat article par article** ; une
  lecture définitive ou un texte de CMP rouvre une discussion générale avec un orateur par groupe.
  C'est le meilleur prédicteur de la qualité du débat.
- `[TOOL]` **Un compte rendu de séance couvre plusieurs textes.** Celui de la loi agricole et celui de
  l'aide à mourir contiennent d'autres débats : sans découpage par point de l'ordre du jour, on
  attribue au mauvais texte les propos du précédent, sans aucun signal.
- `[TOOL]` **L'attribution d'un orateur à son groupe se lit sur la page de scrutin** (listes de
  membres par groupe, au vote). 561 membres lus = 561 votants. Le sommaire du compte rendu n'étiquette
  pas toujours les orateurs, et `deputes.json` porte le groupe actuel.
- `[USER]` Quand un fait est introuvable, on l'écrit `inconnu` — jamais une supposition. Appliqué à
  `texte.etat` et à `justification_status: "introuvable"` (DR et DEM pour l'aide à mourir : les
  orateurs parlent de conscience, pas de position).
- `[TOOL]` **Les totaux se réconcilient, l'attribution par groupe non.** `deputes.json` porte le
  groupe *actuel*, l'AN le groupe *au vote*. Sur le scrutin 8427 : EPR 50 vs 51, HOR 25 vs 24,
  SOC 65 vs 66 — les écarts se compensent au global. **Pour publier, prendre l'attribution de l'AN.**
- `[TOOL]` Les **absents sont absents** du fichier de votes (562/577). Ne jamais compter l'absence
  comme opposition.
- `[TOOL]` Le Sénat sert des **entités HTML nommées** (`souverainet&eacute;`), l'Assemblée de l'UTF-8.
  Sans décodage, toute recherche de mot accentué échoue **silencieusement**.
- `[TOOL]` **73 députés changent de camp** sur la loi agricole entre 1re lecture (369/178) et vote
  final (296/224) : une `stance` unique par texte serait fausse.
- `[TOOL]` La règle B sans **plancher d'engagement** (exprimés ≥ 250) élit un article voté par 94
  personnes avec 38 abstentions au lieu du vote final. Le plancher est structurel, pas cosmétique.
- `[TOOL]` **Non vérifié** : la taxonomie de 30 thèmes (clé API requise) → le quota d'équilibre
  thématique n'existe pas encore.

## [PROCHAIN]

1. **M1d : 5 questions** (règle B). C'est la mesure du coût éditorial marginal — le seul chiffre qui
   manque, et il est encore n=1.
2. Vérifier `extract-commission.mjs` sur une **commission permanente** réelle (jamais fait).
3. Compresser : renommer le dépôt GitHub (interface web ou API, `git` ne sait pas faire).

## [OUVERT]

- Déclaré vs voté comme `stance` principale quand les deux divergent (EPR) : déclaré retenu, à confirmer.
- Le Sénat entre-t-il un jour ? Mapping parti↔groupes à maintenir si oui.
- Combien de questions par thème pour tenir les 40 sans écraser la couverture ?

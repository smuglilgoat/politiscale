# CONTINUITY — Hemicycle

Briefing vivant. Lire avant d'agir. Tags : `[USER]` `[CODE]` `[TOOL]` `[ASSUMPTION]`.
Compressé le 2026-10-26 : les entrées antérieures se contredisaient (unité, périmètre CMP/Sénat).
En cas de doute, `docs/PLAN.md` fait foi.

## [ÉTAT]

Projet au **M1c terminé**, M1d non commencé. **Une** question complète, **aucune interface**.

- `content/` : 1 question (loi agricole), 12 positions, 11 citations verbatim sourcées, 1 exemptée (NI).
- `pipeline/` : `fetch-snapshot`, `group-votes`, `rank-scrutins`, `extract-explications`,
  `extract-commission`, `validate-content` (porte bloquante).
- Aucune app Svelte, aucun moteur de score. C'est voulu : M1d est le go/no-go.

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

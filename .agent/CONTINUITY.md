# CONTINUITY — Hemicycle

Briefing vivant. Lire avant d'agir, mettre à jour seulement en cas de delta réel.
Tags de provenance : `[USER]` `[CODE]` `[TOOL]` `[ASSUMPTION]`. Inconnu = `UNCONFIRMED`.

## [DECISIONS]

- 2026-10-15T15:40Z `[USER]` Nom définitif : **Hemicycle**. France uniquement.
- 2026-10-15T15:40Z `[USER]` Positions hybrides (votes enregistrés + citations). Résultat =
  convergences nominatives, pas de pourcentage arbitraire. Statique, sans backend. Svelte + Vite.
- 2026-10-15T15:30Z `[CODE]` **L'unité de contenu est le groupe parlementaire, pas le parti.**
  C'est le seul niveau vérifiable ; supprime l'ambiguïté « le parti a dit / le groupe a voté ».
- 2026-10-15T15:30Z `[CODE]` `evidence` obligatoire et non vide ; `justification` non nulle ;
  `situation_status == "source"`. Porte bloquante en CI, vérifiée dans les deux sens.
- 2026-10-15T15:30Z `[CODE]` Stance déduite d'un scrutin si ≥ 80 % des votants d'un côté, sinon
  `mitige`. `stance_basis` distingue déduit (`scrutin_derived`) et déclaré (`sourced`).
- 2026-10-15T15:30Z `[CODE]` Litiges (§6.4) : le scrutin tranche les faits, le groupe a droit de
  réponse verbatim sur la justification, toute correction est journalisée dans `revisions[]`.

## [DISCOVERIES]

- 2026-10-15T15:20Z `[TOOL]` **Chaîne de données vérifiée.** Agrégation par groupe reconstruite ==
  totaux publiés, au vote près : aide à mourir 291/241/29, agricole 296/224/41.
- 2026-10-15T15:20Z `[TOOL]` `deputes.json` ne porte que le groupe **actuel** : faux au-delà d'un
  changement de groupe. Correctif = historique des mandats AN. Non fait.
- 2026-10-15T15:20Z `[TOOL]` Les **absents sont absents** du fichier de votes (562 lignes pour 577
  sièges). Ne jamais compter l'absence comme opposition ; calculer sur les votants.
- 2026-10-15T15:20Z `[TOOL]` L'API `nosparlementaires.fr/api/v1/*` exige une clé (401 sans clé). Les
  fichiers `/opendata/*.json(.gz)` sont libres, sans clé. Pas besoin de clé pour l'instant.
- 2026-10-15T15:10Z `[TOOL]` ~~Premier texte candidat : acétamipride~~ **FAUX** : 0 occurrence dans
  le jeu de données. Le vrai scrutin porte sur l'ensemble de la loi agricole. Candidat corrigé.
- 2026-10-15T15:10Z `[TOOL]` Non vérifié : la taxonomie de 30 thèmes `/api/v1/themes` (clé requise).
  Le quota d'équilibre thématique (§6.2) en dépend et n'est pas implémenté.

## [PROGRESS]

- 2026-10-15T13:00Z `[CODE]` Dépôt, `main`, auteur réécrit en `smuglilgoat <k.mame2810@gmail.com>`.
- 2026-10-15T15:40Z `[CODE]` `docs/PLAN.md` corrigé (nom, §6.4 arbitrage, §6.5 chaîne vérifiée).
- 2026-10-15T15:45Z `[CODE]` M1b : `pipeline/{fetch-snapshot,group-votes,validate-content}.mjs`,
  `content/parties.json`, `content/sources.json`, 1 question (faits réels, justifications nulles).
  Branche `agent/m1-data-pipeline`.

## [OUTCOMES]

- 2026-10-15T15:45Z `[CODE]` `npm run validate` sort 1 attendu sur l'état brouillon ; sort 0 avec
  justifications sourcées. L'état brouillon est l'état committé.
- 2026-10-15T15:45Z `[USER]` Prochain jalon : M1c, 5 justifications sourcées — c'est le go/no-go
  sur la charge éditoriale.

## [OPEN]

- Nombre de questions cible (~30 jouable / ~40 pour couvrir les thèmes).
- Qui tranche un litige **factuel** (le groupe conteste un fait, pas une interprétation). Maillon faible.
- Langue : FR seul ou FR/EN.
- Renommage du dépôt GitHub : impossible via `git`, il faut l'API GitHub ou l'interface web.

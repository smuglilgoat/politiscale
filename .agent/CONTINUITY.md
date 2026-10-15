# CONTINUITY — Hemicycle

Briefing vivant. Lire avant d'agir, mettre à jour seulement en cas de delta réel.
Tags : `[USER]` `[CODE]` `[TOOL]` `[ASSUMPTION]`. Inconnu = `UNCONFIRMED`.

## [DECISIONS]

- 2026-10-15T15:40Z `[USER]` Nom : **Hemicycle**. France uniquement. Statique, sans backend.
  Svelte + Vite. Positions hybrides. Résultat = convergences nominatives.
- 2026-10-15T16:30Z `[USER]` **L'arbitre d'un litige factuel, c'est le porteur du projet.** Décision
  assumée, maillon faible connu et documenté (§6.4).
- 2026-10-15T16:20Z `[CODE]` L'unité de contenu est le **groupe parlementaire**, pas le parti.
- 2026-10-15T16:30Z `[CODE]` **La position déclarée prime sur le vote.** EPR déclare voter contre la
  motion de rejet et vote 50/15/16 : `stance` = déclaration (`stance_basis: sourced`), `evidence` =
  vote. Les deux coexistent.
- 2026-10-15T16:30Z `[CODE]` `justification` = **citation verbatim attribuée** (`speaker` +
  `source_ref`), plafond 45 mots pour un document officiel, 25 pour la presse. `justification_exempt`
  motivé seulement quand aucun orateur de groupe ne peut exister (NI).
- 2026-10-15T16:30Z `[CODE]` **La cohésion ne se stocke pas** : elle se recalcule depuis `evidence`.
  La porte refuse tout champ dérivé stocké.
- 2026-10-15T16:30Z `[CODE]` Seuil de cohésion à 80 % = **notre convention**, à publier. D'autres
  utilisent la majorité simple (LIOT serait « abstention », HOR « pour »).

## [DISCOVERIES]

- 2026-10-15T16:15Z `[TOOL]` **Correction d'une affirmation trop forte** : les *totaux* sont vérifiés,
  l'*attribution par groupe* ne l'est pas. Sur le scrutin 8427, notre reconstruction donne EPR pour
  50, HOR 25, SOC contre 65 ; l'AN donne 51, 24, 66. Les écarts se compensent donc invisibles au
  niveau global. Cause : `deputes.json` porte le groupe **actuel**, l'AN le groupe **au vote**.
  => Pour publier, prendre l'attribution de l'AN.
- 2026-10-15T16:15Z `[TOOL]` Les absents sont absents du fichier de votes (562 lignes / 577 sièges) :
  ne jamais compter l'absence comme opposition.
- 2026-10-15T16:15Z `[TOOL]` Vocabulaire de groupe instable : `UDDPLR` (page scrutin AN) vs `UDR`
  (compte rendu) ; `ECOS`/`EcoS` ; `DEM`/`Dem`. `parties.json` porte des `aliases`.
- 2026-10-15T16:20Z `[TOOL]` **Le compte rendu est la source des justifications.** Un seul document
  (`CRSANR5L17S2026E1N022`) donne un orateur par groupe. Rendement mesuré : 11 groupes / 12.
- 2026-10-15T16:25Z `[TOOL]` Non vérifié : la taxonomie de 30 thèmes (`/api/v1/themes`, clé requise).
  Le quota d'équilibre thématique n'est donc pas implémenté.
- 2026-10-15T16:25Z `[TOOL]` Datan publie une « cohésion » par groupe (DEM 0,29 ; LIOT 0,22 ;
  EPR 0,43 ; HOR 0,66 ; SOC 0,96) et classe LIOT « abstention ». Formule non reproduite ; on publie
  la nôtre explicitement plutôt que de deviner la leur.

## [PROGRESS]

- 2026-10-15T15:45Z `[CODE]` Branche `agent/m1-data-pipeline` : pipeline M1b + 1 question (faits).
- 2026-10-15T16:35Z `[CODE]` M1c : `pipeline/extract-explications.mjs` ; 11 justifications verbatim
  sourcées ; schéma (`abstention`, `speaker`, `justification_exempt`) ; porte étendue et testée dans
  les deux sens.

## [OUTCOMES]

- 2026-10-15T16:35Z `[CODE]` `npm run validate` => 0 (12 positions, 11 sourcées, 1 exemptée).
  Tests négatifs : citation sans orateur => bloqué ; champ dérivé stocké => bloqué.
- 2026-10-15T16:35Z `[USER]` Coût éditorial mesuré : une question complète = 1 extraction + 11
  citations à sélectionner. Prochain jalon M1d : 5 questions.

## [OPEN]

- Nombre de questions cible (~30 jouable / ~40 pour couvrir les thèmes).
- Les citations viennent de la **motion de rejet préalable**, pas de l'explication de vote sur le
  texte final. C'est un proxy : s'opposer à un rejet n'est pas voter pour le texte. À trancher.
- Faut-il un compte rendu par question, ou une source de presse quand elle est meilleure ?
- Langue : FR seul ou FR/EN. Renommage du dépôt GitHub (impossible via `git`).

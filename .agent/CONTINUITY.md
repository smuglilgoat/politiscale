# CONTINUITY — politiscale (nom provisoire)

Briefing vivant. Lire avant d'agir, mettre à jour seulement en cas de delta réel.
Tags de provenance : `[USER]` `[CODE]` `[TOOL]` `[ASSUMPTION]`. Inconnu = `UNCONFIRMED`.

## [PLANS]

- 2026-10-15T13:00Z `[USER]` Test politique par les textes de loi réels, France d'abord.
  Pas d'affirmations hypothétiques : des textes réels + positions sourcées des partis + contexte.
- 2026-10-15T13:40Z `[USER]` Décisions : France only ; positions hybrides (votes enregistrés +
  citations de programme) ; résultat = convergences nominatives, pas de pourcentage arbitraire ;
  statique sans backend, résultats en localStorage ; Svelte + Vite ; renommer le dépôt.
- 2026-10-15T13:55Z `[CODE]` Plan écrit dans `docs/PLAN.md`. M1 = 5 textes bout en bout,
  décision go/no-go sur la charge éditoriale. Rien à construire avant.

## [DECISIONS]

- 2026-10-15T13:55Z `[ASSUMPTION]` Le champ `evidence` est obligatoire et non vide par position ;
  la porte de validation bloque le build sinon. Garantie de neutralité appliquée par la machine.
- 2026-10-15T13:55Z `[ASSUMPTION]` Sélection des questions mesurée (cohesion/dispersion + quota
  thématique) et non éditoriale — répond au facteur d'invalidation n°1 de la littérature VAA.
- 2026-10-15T13:55Z `[ASSUMPTION]` `stance` (doctrine) séparé du vote enregistré du groupe.

## [DISCOVERIES]

- 2026-10-15T13:50Z `[TOOL]` `nosparlementaires.fr/api/v1/votes` donne la répartition
  POUR/CONTRE/ABSTENTION/NONVOTANT par groupe **à la date du scrutin** ; `/opendata/*.json.gz` en
  masse ; taxonomie de 30 thèmes ; `manifest.json` avec empreintes SHA-256. Licence Ouverte 2.0.
- 2026-10-15T13:50Z `[TOOL]` `data.assemblee-nationale.fr` : Votes + Dossiers législatifs, XML+JSON,
  Licence Ouverte 2.0.
- 2026-10-15T13:45Z `[TOOL]` Collision de nom : `politiscales.party` / `politiscales.fr` (8values)
  est un test actif — exactement le format critiqué par ce projet.
- 2026-10-15T13:45Z `[TOOL]` Concurrence : `politiquement.org` (30 affirmations / 12 partis),
  `politpro.eu`, `datan.fr` (quiz députés). Aucun ne part du texte de loi comme unité.

## [PROGRESS]

- 2026-10-15T13:00Z `[CODE]` Dépôt initialisé, `main` poussée, auteur du 1er commit réécrit en
  `smuglilgoat <k.mame2810@gmail.com>`. Branche `agent/initial-plan` créée.
- 2026-10-15T13:55Z `[CODE]` `docs/PLAN.md` + ce fichier.

## [OUTCOMES]

- 2026-10-15T13:55Z `[USER]` Décisions §13 du plan prises ; nom définitif encore ouvert.

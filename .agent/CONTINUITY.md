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
- 2026-10-15T17:15Z `[USER]` Le corpus couvre toute la navette : votes sur le texte final, CMP
  (discussions et votes), propositions de loi en niche parlementaire, projets de loi du gouvernement,
  et idem au Sénat.
- 2026-10-15T17:25Z `[CODE]` Le test compare des **partis** (`party`), adossés à des groupes
  chambre-spécifiques (`group`). Les deux chambres n'ont pas le même vocabulaire : RN/UNT,
  DR/Les Républicains, SOC/SER, ECOS/GEST, GDR/CRCE-K, EPR/RDPI.
- 2026-10-15T17:25Z `[CODE]` Un texte = une **navette** (liste d'étapes : dépôt, 1re lecture, CMP,
  lecture définitive, promulgation). La `stance` est ancrée sur l'étape décisive ; les autres étapes
  restent du contexte. Sinon on écrase les changements de position entre lectures.
- 2026-10-15T17:25Z `[CODE]` Le **gouvernement** est un acteur distinct (`kind: "gouvernement"`),
  pas un parti : sa position s'affiche en contexte, elle n'est pas une option de réponse.
- 2026-10-15T18:40Z `[USER]` **CMP écartée du périmètre, complètement.**
- 2026-10-15T18:45Z `[CODE]` Artefact CMP supprimé, étape CMP retirée de la navette, source
  `cr-cmp-2026-07-16` supprimée. L'étape d'ancrage devient `lecture_definitive_an`.
- 2026-10-15T18:45Z `[CODE]` Conséquence assumée : la navette de l'agricole montre un **trou** entre
  la lecture au Sénat et le vote final, le texte voté étant pourtant issu d'un compromis. Ce n'est
  pas une erreur de saisie, c'est la décision.
- 2026-10-15T18:45Z `[CODE]` La citation verbatim du GDR qui mentionne « les conclusions de la
  commission mixte paritaire » est **conservée telle quelle** : c'est une citation, pas notre texte.
- 2026-10-15T18:15Z `[USER]` Intégrer les comptes rendus de **commission et de CMP**, par
  intervention individuelle, chacune rattachée à son parti.
- 2026-10-15T18:15Z `[CODE]` Une intervention de CMP n'est **pas** une position de groupe (14 membres
  à titre individuel) : recevable comme preuve, jamais comme source d'une `stance`.
- 2026-10-15T17:50Z `[USER]` **Sénat reporté.** Le modèle le prévoit (`groups: {an, senat}`), rien
  n'est implémenté côté Sénat.
- 2026-10-15T17:50Z `[USER]` **La divergence interne des groupes doit être prise en compte.**
  Tranché : un accord n'est « ferme » que sur un groupe cohésif ; sur un groupe scindé c'est un
  « accord partagé », listé à part et non compté dans le classement. `non_aborde` n'est ni accord ni
  désaccord. La répartition brute est affichée.
- 2026-10-15T17:50Z `[USER]` Étape d'ancrage : la plus intéressante pour la question.
- 2026-10-15T17:50Z `[CODE]` Pour l'agricole : ancrage sur **VTANR5L17V8427** (texte de la CMP,
  séance du 20/07/2026) — étape décisive, la plus serrée, et la séance d'où viennent les citations.
- 2026-10-15T17:25Z `[CODE]` Le scrutin de fin d'étape devient **facultatif** : une niche
  parlementaire s'arrête à minuit et les derniers textes ne sont pas votés du tout.
- 2026-10-15T16:30Z `[CODE]` `justification` = **citation verbatim attribuée** (`speaker` +
  `source_ref`), plafond 45 mots pour un document officiel, 25 pour la presse. `justification_exempt`
  motivé seulement quand aucun orateur de groupe ne peut exister (NI).
- 2026-10-15T16:30Z `[CODE]` **La cohésion ne se stocke pas** : elle se recalcule depuis `evidence`.
  La porte refuse tout champ dérivé stocké.
- 2026-10-15T16:30Z `[CODE]` Seuil de cohésion à 80 % = **notre convention**, à publier. D'autres
  utilisent la majorité simple (LIOT serait « abstention », HOR « pour »).

## [DISCOVERIES]

- 2026-10-15T18:10Z `[TOOL]` **Extraction CMP opérationnelle** : 254 interventions, **254 rattachées à
  un parti**, 0 orpheline, 39 décisions. Artefact versionné : `content/debates/souverainete-agricoles.json`
  (261 Ko). Répartition : SOC 38, LFI-NFP 37, Les Républicains 35, ECOS 33, DEM 25, SER 20, EPR 18,
  DR 17, UCI 15, LIOT 9, RN 6, RDSE 1.
- 2026-10-15T18:10Z `[TOOL]` **Piège majeur** : le Sénat sert des **entités HTML nommées**
  (`souverainet&eacute;`, 5 642 `&eacute;` sur la page CMP) là où l'Assemblée sert de l'UTF-8. Sans
  décodage, toute recherche de mot accentué échoue **silencieusement** — c'est la même famille d'erreur
  que l'acétamipride invisible.
- 2026-10-15T18:10Z `[TOOL]` Autres pièges corrigés : nom de motif ne pouvant contenir ni virgule ni
  point (sinon noms fantômes), homonyme inactif de l'autre chambre avec groupe nul bloquant la bonne
  correspondance, page hebdomadaire contenant plusieurs CMP et en-tête présent en double (sommaire +
  corps).
- 2026-10-15T17:45Z `[TOOL]` **Preuve chiffrée du besoin de navette** : sur le même texte à la même
  assemblée, l'ensemble passe de **369/178** (1re lecture, 02/06/2026) à **296/224** (texte CMP,
  20/07/2026). **73 députés changent de camp**, marge 0,34 → 0,13. Une `stance` unique par parti
  serait fausse pour tous ceux qui ont bougé.
- 2026-10-15T17:45Z `[TOOL]` **Une CMP ne produit aucun vote par groupe** : 14 membres votent à titre
  individuel. Il n'existe pas de « position du groupe X en CMP ». Contexte oui, ancrage non.
- 2026-10-15T17:20Z `[TOOL]` **La CMP n'est pas opaque.** Huis clos, mais un compte rendu **écrit**
  est publié (`senat.fr/compte-rendu-commissions/<semaine>/cmp.html`) et enregistre les votes article
  par article. Vérifié : page accessible, ~25 k de texte, 12 mentions de rapporteurs.
- 2026-10-15T17:20Z `[TOOL]` Les comptes rendus de **commission** existent aussi
  (`senat.fr/compte-rendu-commissions/`), donc l'étape où les amendements se décident est documentée.
- 2026-10-15T17:20Z `[TOOL]` Données Sénat (`scrutins_senat.json`, 2 132 lignes, depuis 2017) :
  **schéma d'agrégat différent** de l'AN — `votants / suffrages_exprimes / pour / contre`, sans champ
  abstention (à déduire). `senateurs.json` contient 29 valeurs de groupe dont des historiques
  (RPR, U.N.R., MRP…), et mélange sigles et noms complets.
- 2026-10-15T17:20Z `[TOOL]` Une **niche parlementaire** va de 9 h à minuit ; les derniers textes ne
  sont souvent pas votés, et les articles peuvent être supprimés en commission avant la séance.
- 2026-10-15T17:15Z `[TOOL]` La **DILA** publie les comptes rendus intégraux incluant les
  explications de vote — piste pour les justifications sur le texte final (§6.6 ne couvre pour
  l'instant que les débats de séance AN).
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

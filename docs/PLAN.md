# Hemicycle — plan initial

**Date :** 2026-10-15 · **Statut :** M1b — totaux vérifiés, **attribution par groupe non publiable en l'état**
(§6.5)
**Périmètre :** France uniquement. Le modèle de contenu reste pays-agnostique (champ `country`) mais
le seul corpus est français.

---

## 1. But

Un test politique dont l'unité de base n'est pas une opinion générale mais **un texte de loi réel**.
Pour chaque question : une situation réelle, puis la position de chaque groupe politique dessus, avec
son explication et **sa source vérifiable**. À côté, de quoi comprendre le contexte.

**La différence avec les tests existants :** la position attribuée à un groupe n'est pas choisie par
nous, elle est **documentée**. Aucune position ne part sans preuve.

## 2. Justification méthodologique

Un tel outil s'appelle une VAA (*Voting Advice Application*). La littérature est nette sur deux points,
et ils structurent tout le plan :

1. **Le facteur d'invalidation n°1 est la sélection des questions, pas le calcul du score.**
   Walgrave et al. (2009), sur 500 000 configurations de 36 affirmations, montrent que le choix des
   affirmations à lui seul fait basculer le résultat. Lefevere & Walgrave (2014) montrent que des
   affirmations formulées sur un axe gauche-droite avantagent structurellement certains partis.
2. **Sans benchmark, un résultat est invalide**, pas seulement imprécis.

Conséquence : les questions sont sélectionnées **par un critère mesurable** (§6.2), et le résultat
principal n'est pas un pourcentage.

## 3. Hors périmètre (délibérément écarté)

- Pondération d'importance par l'utilisateur. Cosmétique, et premier levier de manipulation du score.
- Toute agrégation entre utilisateurs, comptes, analytics.
- Multi-pays, multi-langue. Code prêt, contenu non.
- Sénat : double le coût éditorial pour un gain de démonstration nul.
- Recommandation de vote. L'outil situe, il ne prescrit pas.

## 4. Modèle de contenu

### 4.0 Le test compare des **partis**, adossés à des groupes parlementaires

Deux niveaux, et ils ne sont pas interchangeables :

- **`party`** — entité canonique, indépendante de la chambre et de la législature. C'est ce que voit
  l'utilisateur. Les groupes parlementaires, eux, se renomment, fusionnent et changent d'étiquette.
- **`group`** — l'étiquette de la chambre au moment du vote. C'est **le seul niveau prouvable**,
  parce que c'est celui sous lequel les votes sont enregistrés.

Un parti peut donc porter `groups: { an: "RN" }`. Cela supprime l'ambiguïté « le parti dit X, son
groupe vote Y » : le parti porte la position, le groupe porte la preuve.

> **Sénat : reporté.** Le Sénat a des groupes au vocabulaire disjoint de l'Assemblée (`UNT` pour le
> RN, `SER`, `GEST`, `CRCE-K`, `RDPI`…) et sa composition a changé en septembre 2026. Le modèle est
> prévu pour (`groups: { an, senat }`) mais rien n'est implémenté côté Sénat. Y revenir plus tard, en
> écrivant le mapping depuis une source, pas de mémoire.

Le **gouvernement** est un acteur distinct (`kind: "gouvernement"`), pas un parti : il n'a pas de
groupe et ne se mesure pas comme les autres. Sa position compte pour les projets de loi — portée par
le ministre et le rapporteur — et s'affiche comme contexte, pas comme option de réponse.

### 4.1 `content/questions/<slug>.json`

```jsonc
{
  "id": "protection-souverainete-agricoles",
  "country": "fr",
  "themes": ["agriculture"],
  "version": "1.0.0",
  "as_of": "2026-07-19",              // date du scrutin : les positions sont datées
  "situation": "…",                   // rédigé par nous, sourcé, ~80 mots
  "situation_provenance": "dossier_legislatif",
  "texte": {
    "type": "projet_de_loi",
    "titre": "projet de loi d'urgence pour la protection et la souveraineté agricoles",
    "dossier_legislatif": "DLR5L17N…",
    "scrutin": { "chambre": "an", "id": "VTANR5L17V8427", "date": "2026-07-19", "sort": "adopté" },
    "etat": "adopte"
  },
  "positions": [
    {
      "group": "RN",
      "stance": "pour",               // pour | contre | abstention | mitige | non_aborde
      "stance_basis": "sourced",      // sourced (déclaration) | scrutin_derived (déduit du vote)
      "justification": "…",           // citation VERBATIM de l'orateur du groupe, plafonnée (§6.3)
      "speaker": "David Magnier",     // qui l'a dit — sans orateur, pas de citation
      "source_ref": "cr-2026-07-20",  // renvoi vers sources.json
      "quote_origin": "motion_de_rejet", // texte_final | motion_de_rejet | commission | programme | declaration | presse
      "justification_exempt": null,   // motif, seulement quand aucun orateur ne peut exister (NI)
      "evidence": [
        { "kind": "scrutin", "chambre": "an", "scrutin_id": "VTANR5L17V8427",
          "pour": 122, "contre": 0, "abstention": 0, "nonvotant": 0 }
      ]
    }
  ],
  "sources": [
    { "kind": "news", "outlet": "…", "title": "…", "date": "…", "url": "…" }
  ],
  "revisions": []                     // journal public des corrections (§6.4)
}
```

Règles non négociables :

- `evidence` **non vide**. Une position sans preuve fait échouer la validation. La neutralité est
  appliquée par la machine, pas par la discipline.
- `justification` est une **citation verbatim** de l'orateur du groupe, avec `speaker` et
  `source_ref`. C'est le seul texte dont nous sommes auteurs… en fait non : c'est le seul texte que
  nous *choisissons*. On ne le réécrit pas. `null` = non publiable, sauf `justification_exempt`
  motivé (cf. `NI` : les non-inscrits n'ont pas d'orateur de groupe, par construction).
- **La position déclarée prime sur le vote.** Un groupe peut déclarer voter pour et se scinder dans
  les urnes : EPR déclare voter contre la motion de rejet et vote 50 pour / 15 contre / 16
  abstentions. `stance` porte la déclaration (`stance_basis: "sourced"`), `evidence` porte le vote.
  Les deux faits coexistent au lieu de s'écraser.
- **La cohésion ne se stocke pas.** Elle se recalcule depuis `evidence` (part du camp majoritaire
  parmi les votants). L'écrire dans le contenu la ferait dériver du vote qu'elle décrit.
- `stance` est distinct du vote. Un groupe peut voter *pour* un texte que le parti critique ailleurs :
  `stance: "mitige"` + `evidence` conserve les deux faits au lieu d'en écraser un.
- `stance_basis` rend la provenance explicite : `scrutin_derived` (déduit mécaniquement du vote) ou
  `sourced` (position déclarée, citée). On ne confond jamais les deux.
- `non_aborde` est une réponse de **premier ordre**, jamais pénalisée. Absence de position n'est pas
  opposition. **Un groupe absent du scrutin n'est pas non plus « contre »** (§6.5).
- `as_of` obligatoire : les groupes changent, le questionnaire est daté et versionné.

### 4.2 `content/parties.json`

Un seul fichier, pas un par parti : identité d'affichage, couleur (contraste vérifié, jamais
rouge/bleu seuls — daltonisme), lien programme. Douze entrées, ça ne justifie pas douze fichiers.

### 4.3 `content/sources.json`

Registre des liens : `kind` (`news` | `wikidata` | `officiel`), URL, date, **licence**, `archive_url`.
Voir §8.

### 4.4 Le corpus : toute la navette, pas un seul débat

Un texte de loi n'a pas une position, il en a une par étape. Le modèle porte donc une **navette** :
une liste ordonnée d'étapes, chacune avec sa chambre, son type, son scrutin et son compte rendu.

```jsonc
"navette": [
  { "etape": "depot",                      "chambre": null,    "date": "2026-04-08" },
  { "etape": "ensemble_1re_lecture",       "chambre": "an",    "date": "2026-06-02", "scrutin": "VTANR5L17V7259", "vote": { "pour": 369, "contre": 178, "abstention": 15 } },
  { "etape": "ensemble_1re_lecture",       "chambre": "senat", "date": "2026-07-02", "vote": { "pour": 219, "contre": 111 } },
  { "etape": "non_modelise",               "chambre": null,    "date": "2026-07-16", "gap": true, "gap_reason": "…" },
  { "etape": "lecture_definitive_an",      "chambre": "an",    "date": "2026-07-20", "scrutin": "VTANR5L17V8427", "vote": { "pour": 296, "contre": 224, "abstention": 41 } },
  { "etape": "promulgation",               "chambre": null,    "date": "2026-08-18", "source_ref": "legifrance-2026-796" }
]
```

**Pourquoi la navette n'est pas un luxe.** Entre les deux votes « ensemble » du même texte à la
même assemblée, 73 députés changent de camp : 369 pour au texte initial, 296 au vote final. La marge
passe de 0,34 à 0,13. Une `stance` unique par parti serait donc **fausse** pour tous ceux qui ont
bougé. La position se prend à une étape nommée.

Trois constats, vérifiés sur données réelles :

- **Les comptes rendus de commission existent** (`senat.fr/compte-rendu-commissions/`), donc l'étape
  où les amendements se décident vraiment est documentée.
- **Les niches parlementaires n'ont souvent pas de vote final.** Une journée d'initiative
  parlementaire va de 9 h à minuit et les textes en fin d'ordre du jour ne sont pas examinés. Un
  texte de niche peut avoir des scrutins d'article et **aucun** vote sur l'ensemble — et ses articles
  peuvent être supprimés en commission avant la séance. Le scrutin d'étape est donc **facultatif** :
  la porte exige une preuve, pas nécessairement un vote.
- **La commission mixte paritaire est écartée du périmètre** (décision du 15/10/2026). Conséquence
  assumée : la navette de l'agricole montre un **trou** entre la lecture au Sénat et le vote final de
  l'Assemblée, alors que le texte voté était issu d'un compromis. Le trou est volontaire ; il n'est
  pas une erreur de saisie.

**Règle d'ancrage (B) : l'étape la plus clivante parmi les étapes intelligibles.** Elle est
**calculée**, pas choisie — c'est ce qui la rend publiable. `pipeline/rank-scrutins.mjs` l'applique :

1. **Intelligibilité** : seuls les votes sur l'ensemble ou sur un article. Les amendements et
   sous-amendements sont écartés — un 57/59/1 sur une correction de rédaction est très clivant et
   n'apprend rien à un citoyen.
2. **Plancher d'engagement** : `pour + contre ≥ 250`. Un vote où plus de députés s'abstiennent qu'ils
   ne votent pour ou contre n'exprime pas un choix de la chambre, c'est un moment procédural.
3. **Clivage** = `0,5 × (1 − marge) + 0,5 × dispersion`, où
   `marge = |pour − contre| / votants` et `dispersion` = part des votants dans un groupe fracturé.

Le plancher n'est pas cosmétique : sans lui la règle élit, sur la loi agricole, un article voté par
94 personnes avec 38 abstentions (clivage 0,72) plutôt que le vote final à 561 votants
(clivage 0,60). Avec lui, elle retient le vote final — et il ne reste que **2 votes intelligibles**
sur 423 scrutins, ce qui est en soi une information sur la densité réelle d'un texte.

Les paramètres (intelligibilité, seuil 250, pondération 50/50) sont des **conventions**, publiées
comme telles. Chaque question enregistre son ancrage et son motif (`ancrage.pourquoi`).

## 5. Ce que voit l'utilisateur

**Question.** La situation, en clair. L'état du texte et sa date. Puis les positions des groupes,
chacune avec explication dépliable et **lien vers la preuve** (le scrutin réel). Ordre d'affichage
stable, jamais trié par position pour ne favoriser personne.

**Chaque citation porte son origine, affichée.** Une étiquette dit d'où elle vient : *texte final*,
*motion de rejet préalable*, *commission*, *programme*, *déclaration*, *presse*. Une citation sur le
texte final n'a pas le même poids qu'une citation dans un débat procédural, et l'utilisateur doit
pouvoir le voir sans lire la méthode. Le trou de navette porte lui aussi une étiquette (« étape non
modélisée : compromis »), pour qu'une absence se lise comme une absence et non comme un oubli.

Choix : une position de groupe, **« aucune de ces positions »**, ou **« je ne me prononce pas »**.
Les deux derniers sont distincts et gratuits.

**Résultat.** Pas de score arbitraire. Un classement des groupes par nombre de convergences, puis
**la liste nominative des textes où vous divergez**, chacun cliquable vers le scrutin réel.
L'utilisateur voit *sur quoi* il est d'accord, pas un pourcentage d'affinité sorti de nulle part.

`concordance(U, P) = |{ q ∈ répondues : choix(U,q) = stance(P,q) }|`

**La divergence interne compte, et elle est traitée explicitement.** La plupart des groupes votent
en bloc, mais LIOT, DEM, HOR et EPR se scindent régulièrement — LIOT l'a même déclaré à la tribune.
Faire comme si « LA position de LIOT » existait serait un mensonge par simplification. Donc :

- une convergence n'est **ferme** que si le groupe était cohésif sur cette question ; sur un groupe
  scindé, l'accord est compté à part, comme **accord partagé**, et listé séparément plutôt que de
  gonfler le classement ;
- `non_aborde` n'est ni un accord ni un désaccord : c'est un terrain neutre, jamais compté ;
- la répartition brute (`pour / contre / abstention`) est affichée pour chaque groupe à chaque
  question. L'utilisateur voit que sur ce texte LIOT s'est partagé 8/4/11. Il juge avec l'information.

Coef. de cohésion = camp majoritaire / votants, recalculé depuis `evidence` (jamais stocké). C'est
**notre** définition : d'autres sites utilisent la majorité simple ou l'indice de Rice, ce qui donne
des chiffres différents. À publier, sinon c'est un réglage invisible qui déplace les résultats.

Un ratio (`convergences / répondues`) peut être affiché en second, explicitement défini comme
« proportion de vos réponses partagées par ce parti » — un fait comptable, pas un score.

## 6. Chaîne éditoriale

### 6.1 Sources

| Source | Usage | Licence |
|---|---|---|
| `nosparlementaires.fr` — `/opendata/*.json`, `/api/v1/*`, `/themes` | accès pratique, votes par groupe, **AN et Sénat**, taxonomie 30 thèmes | Licence Ouverte 2.0 |
| `data.assemblee-nationale.fr` — Votes, Dossiers législatifs, mandats | autorité, et **historique des mandats** (§6.5) | Licence Ouverte 2.0 |
| `data.senat.fr` — Travaux législatifs, Comptes rendus, Amendements | autorité côté Sénat — **reporté** | Licence Ouverte 2.0 |
| `senat.fr/compte-rendu-commissions/` — comptes rendus de commission | interventions individuelles en commission, rattachées à leur parti | Licence Ouverte 2.0 |
| Comptes rendus de séance AN | justifications verbatim (§6.6) | document parlementaire public |
| Programmes / déclarations des partis | justifications, citations courtes | citation + lien |
| Wikidata | faits structurés | CC0 |

⚠️ Les agrégats des deux chambres ne sont pas les mêmes : l'AN publie
`pour / contre / abstention / nonvotant`, le Sénat publie `votants / suffrages_exprimes / pour /
contre` — l'abstention s'en déduit (`votants − suffrages exprimés`). Ne pas supposer la même forme.

`nosparlementaires` publie un `manifest.json` avec **empreintes SHA-256** ; chaque instantané récupéré
est épinglé par empreinte. Une position publiée reste vérifiable même si la source évolue. Pas de
« ce que l'API renvoie aujourd'hui ».

### 6.2 Sélection des questions — ce qui décide de la validité

Choix **mesuré**, pas éditorial :

1. Indice de cohésion par groupe et **dispersion inter-groupes** par scrutin.
2. On retient les scrutins à forte dispersion, à issue non écrasante, rattachés à un dossier
   législatif identifiable.
3. **Plancher d'engagement** : `pour + contre ≥ 250`. En dessous, la chambre ne s'est pas prononcée.
4. **Textes budgétaires écartés par défaut** (loi de finances, PLFSS, fin de gestion). Ce sont des
   omnibus de plusieurs centaines d'articles : très clivants, et impossibles à poser comme « une
   situation » sur laquelle on a un avis. Exclusion visible dans la sortie, réversible par
   `--include-omnibus`.
5. **Un texte = une question** : le dédoublonnage se fait sur le titre privé de ses parenthèses, sinon
   un même texte revient à chaque lecture (aide à mourir : 2e lecture *et* lecture définitive).
6. **Quota d'équilibre thématique** : la taxonomie de 30 thèmes sert de contrainte. Pas plus de N
   questions par thème, chaque thème majeur représenté au moins une fois.
7. On rédige ensuite. On ne sélectionne jamais « parce que le sujet parle ».

`pipeline/select-texts.mjs` applique 1 à 5 et classe les textes par clivage. Sur la 17e législature :
212 votes « ensemble », 148 sous le plancher, 7 budgétaires écartés, **47 textes réellement
candidats** — c'est le vivier disponible pour 40 questions, et il est plus étroit qu'il n'y paraît.

**Règle apprise à la dure :** un texte candidat vient des données, jamais d'un article *sur* les
données. Le premier candidat retenu (acétamipride) était cité par la presse et **absent du jeu de
données** : le vrai scrutin portait sur l'ensemble de la loi agricole.

### 6.3 Porte de validation

`pipeline/validate-content.mjs`, en CI, **bloquant** :

- schéma respecté ; `evidence` non vide ; `stance` dans l'énumération ;
- `group` connu de `parties.json` ; `source_ref` connu de `sources.json` ;
- `justification` non nulle, avec `speaker` **et `quote_origin`**, sauf `justification_exempt` motivé ;
- citation verbatim plafonnée selon la source : compte rendu officiel ≤ 45 mots, presse ≤ 25 mots ;
- une étape `gap` porte obligatoirement un `gap_reason` et aucun scrutin ;
- une entrée `context` (commission…) porte orateur, parti, source — et **jamais de `stance`** ;
- quota thématique tenu ; `situation_status == "source"`.

### 6.4 Droit de réponse et arbitrage des litiges

Question de gouvernance, pas de technique : si un groupe écrit « vous nous avez mal représentés »,
que se passe-t-il ? Réponse retenue, en trois niveaux :

1. **Sur le vote (`stance_basis: "scrutin_derived"`), le fait tranche.** Si le groupe a voté 122 pour
   / 0 contre, « pour » n'est pas une opinion, c'est un enregistrement. On ne « corrige » pas un
   scrutin, on l'explique.
2. **Sur la justification, le groupe a droit de réponse**, publié verbatim, non édité, attaché à la
   position. C'est le point faible du projet : c'est le seul texte dont nous sommes auteurs. Le droit
   de réponse nous retire du rôle d'arbitre de leurs mots.
3. **Toute correction est journalisée** dans `revisions[]` : date, version, motif, demandeur.
   Aucune retouche silencieuse. Une erreur corrigée publiquement coûte moins cher qu'une erreur
   découverte par le camp d'en face.

Ce qui reste ouvert : qui tranche si le groupe conteste un fait et pas l'interprétation. Seul, c'est
le maillon faible du projet.

### 6.5 Chaîne de données — état réel de la vérification

**Ce qui est vérifié : les totaux.** L'agrégation reconstruite depuis `votes_an.json` +
`deputes.json` redonne exactement les totaux publiés.

| Scrutin | Reconstruit (pour/contre/abst) | Publié | |
|---|---|---|---|
| Aide à mourir, lecture définitive (14/07/2026) | 291 / 241 / 29 | 291 / 241 / 29 | ✅ |
| Protection et souveraineté agricoles (20/07/2026) | 296 / 224 / 41 | 296 / 224 / 41 | ✅ |

**Ce qui n'est PAS vérifié : l'attribution par groupe.** Recoupement avec le tableau par groupe de
l'AN sur le scrutin n° 8427 :

| Groupe | Notre reconstruction | AN (officiel) | Écart |
|---|---|---|---|
| EPR pour | 50 | **51** | +1 |
| HOR pour | 25 | 24 | −1 |
| SOC contre | 65 | **66** | +1 |

Les totaux se compensent, donc l'erreur ne se voit pas au niveau global — elle déplace un député
d'un groupe à l'autre. C'est exactement la dérive de rattachement décrite ci-dessous. **Conclusion :
pour publier, prendre l'attribution par groupe de l'AN, pas la nôtre.** Notre agrégation reste
utilisable pour la cohésion et la dispersion, pas pour attribuer un vote à un groupe.

Trois limites trouvées :

- **Groupe courant, pas groupe à la date du vote.** `deputes.json` ne porte que l'appartenance
  actuelle ; l'AN affiche le groupe **au moment du vote**. Correct quand rien ne bouge, faux sinon.
  Correctif : historique des mandats de l'AN. C'est la cause de l'écart ci-dessus.
- **Les absents n'existent pas dans le fichier.** 562 enregistrements pour 577 sièges : les députés
  absents sont omis, pas marqués « contre ». Toute stance se calcule sur les votants
  (`pour + contre + abstention`), le non-votant ne compte pas comme opposition.
- **Vocabulaire de groupe instable.** Le même groupe s'écrit `UDDPLR` sur la page scrutin de l'AN et
  `UDR` dans le compte rendu ; `ECOS` / `EcoS`, `DEM` / `Dem`. Toute jointure doit normaliser.

Dispersion observée (19/07/2026) — la preuve que le critère §6.2 discrimine :

| Groupe | Pour | Contre | Abst. | Stance déduite |
|---|---|---|---|---|
| RN | 122 | 0 | 0 | pour |
| DR | 48 | 0 | 0 | pour |
| UDDPLR | 17 | 0 | 0 | pour |
| HOR | 25 | 3 | 4 | mitige |
| EPR | 50 | 15 | 16 | mitige |
| DEM | 19 | 11 | 6 | mitige |
| LIOT | 8 | 4 | 11 | mitige |
| NI | 7 | 2 | 2 | mitige |
| SOC | 0 | 65 | 2 | contre |
| LFI-NFP | 0 | 71 | 0 | contre |
| ECOS | 0 | 38 | 0 | contre |
| GDR | 0 | 15 | 0 | contre |

Seuil de déduction : ≥ 80 % des votants d'un côté ⇒ stance franche, sinon `mitige`. Ce seuil est
**notre convention**, pas une norme : d'autres sites utilisent la majorité simple (LIOT serait alors
« abstention », HOR « pour »). À publier comme convention, sinon c'est un levier invisible.

### 6.6 Sourcer les justifications : le compte rendu

`pipeline/extract-explications.mjs` prend l'URL d'un compte rendu de séance et en extrait
l'intervention de chaque groupe, étiquetée par groupe grâce au « sommaire détaillé ». Un seul
document couvre donc les douze groupes.

Rendement mesuré sur le scrutin n° 8427 (séance du 20/07/2026) : **11 groupes sur 12** avec une
position citable, 1 intervention substantielle mais sans phrase de position explicite (EcoS, qui
argumente sans annoncer son vote), et `NI` sans orateur de groupe par construction. Les 11 positions
du contenu viennent de cette extraction, citeées verbatim.

Deux défauts corrigés au passage, à connaître pour la suite : un orateur est coupé plusieurs fois par
le marqueur de pagination (il faut recoller les fragments), et le sommaire écrit tantôt
« M. Éric Martineau (Dem) », tantôt le nom seul — une normalisation est nécessaire avant
rapprochement, sinon l'orateur est silencieusement perdu.

### 6.7 Commissions : interventions individuelles rattachées à leur parti

`pipeline/extract-commission.mjs` traite les comptes rendus de commission et produit
`content/debates/<id>.json` : chaque intervention individuelle, son orateur, et **son parti**,
retrouvé dans les annuaires.

**État réel : la chaîne est écrite et a tourné sur un compte rendu de commission mixte paritaire,
avant que la CMP ne soit écartée du périmètre.** Aucune page de commission permanente n'a encore été
traitée : le format est le même famille, mais **ce n'est pas vérifié**. À vérifier avant de compter
sur cette brique.

Ce que l'exercice a appris, et qui vaut pour toute page du Sénat :

- **Le Sénat sert des entités HTML nommées** (`souverainet&eacute;`) là où l'Assemblée sert de
  l'UTF-8. Sans décodage, toute recherche d'un mot accentué échoue sans rien signaler : c'est
  exactement ainsi que « acétamipride » avait disparu du jeu de données.
- **Le tour de parole n'a pas de marqueur** : c'est « Nom, role. - texte ». Si le motif autorise un
  point dans le nom, il enjambe la phrase précédente et fabrique des noms fantômes. Et si le role
  n'est pas contraint à un mot de fonction, il ramasse les « M. Dupont, rapporteur. » cités en
  passant.
- **Une page hebdomadaire contient plusieurs séances.** Il faut découper sur la bonne, et l'en-tête
  apparaît deux fois (sommaire puis corps) : on retient la plage la plus longue.

⚠️ **Une intervention en commission n'est pas une position de groupe.** Les membres y siègent à titre
individuel. Ces propos sont donc recevables comme **preuve ou illustration** d'une position, jamais
comme source d'une `stance` : celle-ci reste adossée au vote ou à une déclaration de groupe. Le
fichier porte la mention en clair.

## 7. Architecture

Volontairement minimale : **le contenu est le produit, l'application est un lecteur.**

- **Svelte 5 + Vite**, build 100 % statique, aucun serveur.
- La « charge élevée » est résolue par construction : pas de dynamique, donc un CDN sert un trafic
  illimité pour un coût nul. Ce n'est pas un problème d'infrastructure.
- **localStorage** : progression et résultats en JSON. Rien ne quitte l'appareil ⇒ aucune donnée
  personnelle, pas de consentement, RGPD trivial. Contrepartie assumée : **aucune statistique
  agrégée possible**. Si on en veut, il faudra un endpoint d'écriture, du *rate limiting* et une
  politique RGPD — seule justification possible d'un backend.
- Import/export du résultat en JSON.
- Routage statique par slug : `/texte/<slug>`, URL partageable et indexable.
- A11y : contrastes, clavier, `prefers-reduced-motion`.

## 8. Contraintes légales

- **Presse : lien seulement.** Titre + média + date + URL, jamais le corps. Le droit de citation
  français est étroit, et les grands titres sont payants.
- **Wikipédia : ne pas recopier.** Texte CC BY-SA ; le réutiliser contamine la page en ShareAlike et
  impose une attribution. On utilise **Wikidata (CC0)** pour les faits et de simples liens.
- **Open data AN : réutilisation libre** sous Licence Ouverte 2.0, avec mention de la source.
- **Neutralité** : méthode publiée, positions datées, droit de réponse et journal de corrections (§6.4).

## 9. Risques

| Risque | Gravité | Traitement |
|---|---|---|
| Charge éditoriale (≈40 justifications sourcées) | **Élevée** — le vrai coût du projet | 5 textes complets avant de décider |
| Position perçue comme partiale | **Élevée** — tue le produit | Preuve obligatoire, méthode publiée, droit de réponse |
| Vote de groupe ≠ position du parti | Moyenne | `stance` + `stance_basis` + répartition affichée |
| Groupe courant ≠ groupe au vote | Moyenne | Historique des mandats AN ; `as_of` |
| Absents comptés comme opposition | Moyenne | Calcul sur les votants uniquement |
| Positions qui vieillissent | Moyenne | `as_of` + version |
| Questions mal choisies | Élevée | Sélection mesurée + quota thématique (§6.2) |

## 10. Nom

**Décidé : Hemicycle.** L'ancien nom était à une lettre de `politiscales.party` / `politiscales.fr`
(8values), qui est exactement le format critiqué ici. Renommer le dépôt GitHub et le répertoire local
est une action séparée ; `git` ne peut pas renommer un dépôt distant (API GitHub ou interface web).

## 11. Arborescence

```
content/
  parties.json  sources.json  taxonomy.json
  questions/
  debates/                  # généré : interventions de commission, rattachées à un parti
pipeline/
  fetch-snapshot.mjs        # télécharge et épingle l'instantané par SHA-256
  group-votes.mjs           # agrège les votes par groupe pour un scrutin
  rank-scrutins.mjs         # applique la règle d'ancrage B : classe les étapes par clivage
  extract-explications.mjs  # extrait du compte rendu l'intervention de chaque groupe
  extract-commission.mjs    # extrait des comptes rendus de commission, une entrée par orateur
  validate-content.mjs      # porte bloquante (§6.3)
.cache/                  # données brutes téléchargées, non versionnées
src/                     # Svelte
docs/  PLAN.md  METHODOLOGY.md
```

## 12. Étapes

| # | Étape | Vérification |
|---|---|---|
| M0 | Plan + nom | fait |
| M1a | Preuve de la chaîne de données | **fait** — §6.5, totaux concordants |
| M1b | Pipeline versionné + 1 question réelle (faits) | `npm run validate` échoue sur `justification: null` |
| M1c | Justifications sourcées pour 1 question | **fait** — 11/12 groupes, verbatim du compte rendu |
| M1d | 5 questions bout en bout, ancrage par la règle B | chaque citation se résout vers un scrutin ou un compte rendu |
| M2 | App Svelte : parcours, résultat, localStorage, build statique | 5 questions jouables hors ligne, résultat exportable |
| M3 | ~40 questions, équilibre thématique, `METHODOLOGY.md`, a11y | porte verte, quota tenu |
| M4 | Publication, droit de réponse, suivi | — |

**M1c est le go/no-go** : elle dit si la charge éditoriale est tenable. Rien ne doit être construit
avant.

## 13. Décisions et questions ouvertes

**Décidé :** nom Hemicycle ; France uniquement ; **français seulement** ; positions hybrides ; unité =
parti adossé à un groupe parlementaire ; résultat = convergences nominatives sans pourcentage
arbitraire ; statique sans backend ; Svelte + Vite ; droit de réponse + journal de corrections ;
**l'arbitre d'un litige factuel est le porteur du projet** (maillon faible connu) ; la position
déclarée prime sur le vote ; seuil de cohésion à 80 % comme convention publiée ; **divergence
interne signalée à part, jamais créditée** ; **chaque citation porte une étiquette d'origine** ;
**les interventions de commission sont du contexte, jamais une stance** ; **le trou de navette porte
une étiquette** ; **règle d'ancrage B, calculée** (`rank-scrutins.mjs`) ; **cible : 40 questions** ;
CMP hors périmètre ; Sénat reporté.

**Ouvert :**

- **Extraction en commission non vérifiée** : `extract-commission.mjs` n'a tourné que sur un compte
  rendu de CMP, écartée depuis. Aucune commission permanente traitée — à vérifier (§6.7), d'autant
  que les commissions ne servent plus qu'au contexte.
- Faut-il stocker la position **déclarée** ou la position **votée** quand les deux divergent (EPR) ?
  Tranché en faveur du déclaré, à confirmer.
- Le Sénat entre-t-il un jour dans le test ? Mapping parti↔groupes à maintenir si oui.

## 14. Références

- Walgrave, Nuytemans & Pepermans (2009), *Voting aid applications and the effect of statement
  selection*, West European Politics 32(6).
- Lefevere & Walgrave (2014), *A perfect match?*, Electoral Studies 36.
- Louwerse & Rosema (2014), *The design effects of voting advice applications*, Acta Politica 49.
- Wahl-O-Mat (BpB) : positions déclarées par les partis, panel de politistes, méthode publiée.

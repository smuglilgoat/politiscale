# Hemicycle — plan initial

**Date :** 2026-10-15 · **Statut :** plan ; chaîne de données vérifiée de bout en bout (§6.5)
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

### 4.0 L'unité est le **groupe parlementaire**, pas le parti

Décision issue des données (§6.5) : les votes sont enregistrés par groupe, et c'est le seul niveau
vérifiable. Le schéma ne connaît donc que `group` (`RN`, `EPR`, `SOC`, `LFI-NFP`, `DR`, `DEM`, `HOR`,
`ECOS`, `LIOT`, `UDDPLR`, `GDR`, `NI`). Un `party` purement indicatif peut exister pour l'affichage,
jamais pour la preuve. Cela supprime toute la classe d'ambiguïté « le parti X a dit, mais son groupe a
voté ».

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
      "stance": "pour",               // pour | contre | mitige | non_aborde
      "stance_basis": "scrutin_derived",  // scrutin_derived | sourced
      "justification": null,          // null => la porte de validation BLOQUE (voir §6.3)
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
- `justification` est le seul champ que nous rédigeons, donc le seul contestable. Il vient d'une
  déclaration du groupe ou d'un document de programme, cité. `null` = non publiable.
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

## 5. Ce que voit l'utilisateur

**Question.** La situation, en clair. L'état du texte et sa date. Puis les positions des groupes,
chacune avec explication dépliable et **lien vers la preuve** (le scrutin réel). Ordre d'affichage
stable, jamais trié par position pour ne favoriser personne.

Choix : une position de groupe, **« aucune de ces positions »**, ou **« je ne me prononce pas »**.
Les deux derniers sont distincts et gratuits.

**Résultat.** Pas de score arbitraire. Un classement des groupes par nombre de convergences, puis
**la liste nominative des textes où vous divergez**, chacun cliquable vers le scrutin réel.
L'utilisateur voit *sur quoi* il est d'accord, pas un pourcentage d'affinité sorti de nulle part.

`concordance(U, G) = |{ q ∈ répondues : choix(U,q) = stance(G,q) }|`

Un ratio (`convergences / répondues`) peut être affiché en second, explicitement défini comme
« proportion de vos réponses partagées par ce groupe » — un fait comptable, pas un score.

## 6. Chaîne éditoriale

### 6.1 Sources

| Source | Usage | Licence |
|---|---|---|
| `nosparlementaires.fr` — `/opendata/*.json`, `/api/v1/*`, `/themes` | accès pratique, votes par groupe, taxonomie 30 thèmes | Licence Ouverte 2.0 |
| `data.assemblee-nationale.fr` — Votes, Dossiers législatifs, mandats | autorité, et **historique des mandats** (§6.5) | Licence Ouverte 2.0 |
| Programmes / déclarations des groupes | justifications, citations courtes | citation + lien |
| Wikidata | faits structurés | CC0 |

`nosparlementaires` publie un `manifest.json` avec **empreintes SHA-256** ; chaque instantané récupéré
est épinglé par empreinte. Une position publiée reste vérifiable même si la source évolue. Pas de
« ce que l'API renvoie aujourd'hui ».

### 6.2 Sélection des questions — ce qui décide de la validité

Choix **mesuré**, pas éditorial :

1. Indice de cohésion par groupe (type Rice) et **dispersion inter-groupes** par scrutin.
2. On retient les scrutins à forte dispersion, à issue non écrasante, rattachés à un dossier
   législatif identifiable.
3. **Quota d'équilibre thématique** : la taxonomie de 30 thèmes sert de contrainte. Pas plus de N
   questions par thème, chaque thème majeur représenté au moins une fois.
4. On rédige ensuite. On ne sélectionne jamais « parce que le sujet parle ».

**Règle apprise à la dure :** un texte candidat vient des données, jamais d'un article *sur* les
données. Le premier candidat retenu (acétamipride) était cité par la presse et **absent du jeu de
données** : le vrai scrutin portait sur l'ensemble de la loi agricole.

### 6.3 Porte de validation

`pipeline/validate-content.mjs`, en CI, **bloquant** :

- schéma respecté ; `evidence` non vide ; `justification` non nulle (sinon non publiable) ;
- `group` connu de `parties.json` ; `stance` dans l'énumération ;
- tout `source` a `kind`, `licence`, `date` ;
- citation de presse ≤ 25 mots ;
- quota thématique tenu.

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

### 6.5 Chaîne de données — vérifiée le 2026-10-15

Test réel, sur données réelles : agrégation par groupe reconstruite depuis
`votes_an.json` + `deputes.json`, comparée aux totaux publiés dans `scrutins_an.json`.

| Scrutin | Reconstruit (pour/contre/abst) | Publié | |
|---|---|---|---|
| Aide à mourir, lecture définitive (14/07/2026) | 291 / 241 / 29 | 291 / 241 / 29 | ✅ |
| Protection et souveraineté agricoles (19/07/2026) | 296 / 224 / 41 | 296 / 224 / 41 | ✅ |

Le modèle hybride est donc alimentable. Deux limites trouvées, à traiter :

- **Groupe courant, pas groupe à la date du vote.** `deputes.json` ne porte que l'appartenance
  actuelle. Correct pour juillet 2026, silencieusement faux au-delà d'un changement de groupe.
  Correctif : historique des mandats de l'AN. En attendant, `as_of` et une marge d'incertitude.
- **Les absents n'existent pas dans le fichier.** 562 enregistrements pour 577 sièges : les députés
  absents sont omis, pas marqués « contre ». Toute stance se calcule sur les votants
  (`pour + contre + abstention`), le non-votant ne compte pas comme opposition.

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

Seuil de déduction : ≥ 80 % des votants d'un côté ⇒ stance franche, sinon `mitige`.
Sur l'aide à mourir, EPR (63/18) et HOR (17/18) sont à l'inverse scindés : `mitige` n'est pas
décoratif, c'est le cas normal.

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
pipeline/
  fetch-snapshot.mjs     # télécharge et épingle l'instantané par SHA-256
  group-votes.mjs        # agrège les votes par groupe pour un scrutin
  validate-content.mjs   # porte bloquante (§6.3)
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
| M1c | 5 justifications sourcées, bout en bout | chaque phrase se résout vers une déclaration ou un vote |
| M2 | App Svelte : parcours, résultat, localStorage, build statique | 5 questions jouables hors ligne, résultat exportable |
| M3 | ~40 questions, équilibre thématique, `METHODOLOGY.md`, a11y | porte verte, quota tenu |
| M4 | Publication, droit de réponse, suivi | — |

**M1c est le go/no-go** : elle dit si la charge éditoriale est tenable. Rien ne doit être construit
avant.

## 13. Décisions et questions ouvertes

**Décidé :** nom Hemicycle ; France ; positions hybrides ; unité = groupe parlementaire ; résultat =
convergences nominatives sans pourcentage arbitraire ; statique sans backend ; Svelte + Vite ;
droit de réponse + journal de corrections.

**Ouvert :**

- Nombre de questions cible (~30 jouable, ~40 pour couvrir les thèmes).
- **Qui tranche un litige factuel** (§6.4). Maillon faible.
- Langue : FR seul, ou FR/EN d'emblée ?

## 14. Références

- Walgrave, Nuytemans & Pepermans (2009), *Voting aid applications and the effect of statement
  selection*, West European Politics 32(6).
- Lefevere & Walgrave (2014), *A perfect match?*, Electoral Studies 36.
- Louwerse & Rosema (2014), *The design effects of voting advice applications*, Acta Politica 49.
- Wahl-O-Mat (BpB) : positions déclarées par les partis, panel de politistes, méthode publiée.

# Projet « politique par les textes » — plan initial

**Date :** 2026-10-15 · **Statut :** plan, aucune ligne de code écrite
**Périmètre :** France uniquement pour l'instant. Le modèle de contenu est conçu pays-agnostique
(champ `country`, pas d'hypothèse « Assemblée nationale » dans le schéma) mais le seul corpus livré
est français.

---

## 1. But

Un test politique dont l'unité de base n'est pas une opinion générale mais **un texte de loi réel**.
Pour chaque question : une situation de la vie réelle, puis la position de chaque parti dessus, avec
son explication et **sa source vérifiable**. À côté, de quoi comprendre le contexte (articles,
sources officielles).

**Ce qui différencie ce projet des tests existants :** la position attribuée à un parti n'est pas
choisie par nous, elle est **documentée**. Aucune position ne part sans preuve.

## 2. Justification méthodologique

Un test de ce type s'appelle une VAA (*Voting Advice Application*). La littérature est claire sur
deux points, et ils structurent tout le plan :

1. **Le facteur d'invalidation n°1 est la sélection des questions, pas le calcul du score.**
   Walgrave et al. (2009), sur 500 000 configurations de 36 affirmations, montrent que le choix des
   affirmations à lui seul fait basculer le résultat. Lefevere & Walgrave (2014) montrent que des
   affirmations formulées sur un axe gauche-droite avantagent structurellement certains partis.
2. **Les VAA n'ont aucune validité sans benchmark.** Un résultat non calibré est invalide, pas
   seulement imprécis.

Conséquence directe : les questions seront sélectionnées **par un critère mesurable** (§6.2) et non
par goût éditorial, et le résultat principal n'est pas un pourcentage.

## 3. Hors périmètre (délibérément écarté)

- Pondération d'importance par l'utilisateur (« choisissez 3 priorités »). Cosmétique, c'est le
  premier levier de manipulation du score. Reporté, peut-être jamais.
- Toute agrégation de données entre utilisateurs, comptes, analytics.
- Multi-pays, multi-langue dans le livrable. Le code est prêt, le contenu non.
- Sénat. L'Assemblée suffit à la démonstration, et le Sénat double le coût éditorial.
- Recommandation de vote. L'outil situe, il ne prescrit pas.

## 4. Modèle de contenu

Trois fichiers, une source de vérité unique. Tout est du JSON statique versionné dans le dépôt.

### 4.1 `content/questions/<slug>.json`

```jsonc
{
  "id": "acetamipride-reautorisation",
  "country": "fr",
  "themes": ["agriculture", "environnement"],
  "version": "1.0.0",
  "as_of": "2026-07-20",              // date du scrutin : les positions sont datées
  "situation": "…",                   // rédigé par nous, jargon interdit, ~80 mots
  "texte": {
    "type": "proposition_de_loi",     // projet_de_loi | proposition_de_loi
    "titres": ["…"],
    "dossier_legislatif_url": "…",
    "scrutin": { "chambre": "an", "id": "…", "date": "2026-07-20", "sort": "adopté" },
    "etat": "promulgue"               // en_navette | adopté | rejeté | promulgue
  },
  "positions": [
    {
      "party": "rn",
      "group": "RN",                  // groupe parlementaire à la date du scrutin
      "stance": "pour",               // pour | contre | mitige | non_aborde
      "justification": "…",           // 1-3 phrases, vocabulaire du parti
      "evidence": [
        { "kind": "scrutin", "pour": 120, "contre": 2, "abstention": 3, "nonvotant": 5 },
        { "kind": "declaration", "url": "…", "date": "2026-07-18", "quote": "…" }
      ]
    }
  ],
  "sources": [
    { "kind": "news", "outlet": "…", "title": "…", "date": "2026-07-19", "url": "…" },
    { "kind": "wikidata", "qid": "Q…" }
  ]
}
```

Règles non négociables :

- `evidence` est **non vide**. Une position sans preuve fait échouer la validation (§6.3). C'est la
  garantie de neutralité, appliquée par la machine et non par la discipline.
- `stance` est distinct du vote. Un groupe peut voter *pour* un texte que le parti critique ailleurs :
  `stance: "mitige"` + `evidence: scrutin` conserve les deux faits au lieu d'en écraser un.
- `non_aborde` est une réponse de **premier ordre**, jamais pénalisée. Absence de position n'est pas
  opposition.
- `as_of` obligatoire : les partis changent, le questionnaire doit être daté et versionné.
- `group` et non `party` seul : les groupes parlementaires se renomment et fusionnent (cf. `EPR`,
  `DR`, `LFI-NFP`). Le groupe est identifié **à la date du scrutin**.

### 4.2 `content/parties/<slug>.json`

Identité, couleur (accessibilité : contraste vérifié, pas de rouge/bleu seuls — daltonisme),
lien programme, groupe(s) parlementaire(s) actuel(s).

### 4.3 `content/sources/<slug>.json`

Registre des liens : `kind` (`news` | `wikipedia` | `wikidata` | `officiel`), URL, date, **licence**,
et `archive_url`. Voir §8.

## 5. Ce que voit l'utilisateur

**Question.** La situation, en clair. L'état du texte (en cours / adopté / rejeté) et sa date.
Puis les positions des partis, chacune avec son explication dépliable et **son lien de preuve**.
Les positions sont mélangées à chaque affichage (ordre stable par utilisation, donc non manipulable
par positionnement en tête de liste).

Choix : une position de parti, **« aucune de ces positions »**, ou **« je ne me prononce pas »**.
Les deux derniers sont distincts et gratuits.

**Résultat.** Pas de score arbitraire. Un classement des partis par nombre de convergences, puis,
pour chacun, **la liste nominative des textes où vous divergez**, chacun cliquable vers le scrutin
réel. L'utilisateur voit *sur quoi* il est d'accord, pas un pourcentage d'affinité sorti de nulle part.

Format : `concordance(U, P) = |{ q ∈ répondues : choix(U,q) = stance(P,q) }|`

Un ratio (`convergences / répondues`) peut être affiché en second, explicitement défini comme
« proportion de vos réponses partagées par ce parti » — un fait comptable, pas un score.

## 6. Chaîne éditoriale

### 6.1 Sources de données

| Source | Usage | Licence |
|---|---|---|
| `data.assemblee-nationale.fr` — Votes, Dossiers législatifs | vérité terrain : textes, scrutins | Licence Ouverte 2.0 |
| `nosparlementaires.fr` — `/api/v1/votes`, `/opendata/*.json.gz`, `/themes` | accès pratique, répartition par groupe, taxonomie 30 thèmes | Licence Ouverte 2.0 |
| Programmes / sites des partis | positions déclarées, citations | citation courte + lien |
| Wikidata | faits structurés sur partis et textes | CC0 |

`nosparlementaires` publie un `manifest.json` avec **empreintes SHA-256**. Chaque instantané
récupéré est épinglé par empreinte et stocké, afin qu'une position publiée reste vérifiable même si
la source évolue. Pas de « ce que l'API renvoie aujourd'hui ».

### 6.2 Sélection des questions — le point qui décide de la validité

Choix **mesuré**, pas éditorial :

1. Calcul d'un indice de cohésion par groupe (type Rice) et de la dispersion **inter-groupes** par
   scrutin.
2. On retient les scrutins à forte dispersion (le clivage est réel), à issue non écrasante, rattachés
   à un dossier législatif identifiable.
3. **Quota d'équilibre thématique** : les 30 thèmes servent de contrainte. Pas plus de N questions
   par thème, et chaque thème majeur représenté au moins une fois.
4. On rédige ensuite, on ne sélectionne jamais « parce que le sujet parle ».

C'est la réponse directe au facteur d'invalidation n°1. À documenter publiquement.

### 6.3 Porte de validation

`pipeline/validate-content.mjs`, exécuté en CI et **bloquant le build** :

- schéma JSON respecté ;
- `evidence` non vide pour toute position ;
- tout `source.kind`/`licence` renseigné ;
- pas de citation de presse au-delà de ~25 mots (cf. §8) ;
- quota thématique tenu.

## 7. Architecture

Volontairement minimale : **le contenu est le produit, l'application est un lecteur.**

- **Svelte 5 + Vite**, build 100 % statique. Aucun serveur.
- Le « support d'une charge élevée » est résolu par construction : pas de dynamique, donc un CDN
  sert un trafic illimité pour un coût nul. Ce n'est pas un problème d'infrastructure.
- **localStorage** : progression + résultats en JSON. Rien ne quitte l'appareil.
  Conséquence : aucune donnée personnelle collectée, pas de consentement, pas de politique de
  confidentialité complexe. Conséquence inverse, assumée : **aucune statistique agrégée possible**.
  Si on en veut un jour, il faudra un endpoint d'écriture, du *rate limiting* et une politique RGPD —
  c'est la seule chose qui justifierait un backend.
- Import/export du résultat en JSON, pour archiver ou partager sans serveur.
- Routage statique par slug de question (URL partageable, indexable) : `/texte/<slug>`.
- Accessibilité : contrastes, navigation clavier, `prefers-reduced-motion`.

## 8. Contraintes légales

- **Presse : lien seulement.** Titre + média + date + URL. Jamais le corps de l'article. Le droit de
  citation français est étroit, et Le Monde & co. sont payants.
- **Wikipédia : ne pas recopier.** Le texte est CC BY-SA ; le réutiliser contamine la page en
  ShareAlike et impose une attribution. On utilise **Wikidata (CC0)** pour les faits et des liens
  simples vers les articles.
- **Open data AN : réutilisation libre** sous Licence Ouverte 2.0, avec mention de la source.
- **Neutralité** : publier la méthode, dater les positions, prévoir un **droit de réponse** des partis.
  Un parti qui conteste doit pouvoir faire corriger une position avec source à l'appui.

## 9. Risques

| Risque | Gravité | Traitement |
|---|---|---|
| Charge éditoriale (≈40 positions sourcées) | **Élevée** — c'est le vrai coût du projet | Commencer par 5 textes complets, mesurer, puis décider |
| Position perçue comme partiale | **Élevée** — tue le produit | Preuve obligatoire, méthode publiée, droit de réponse |
| Vote de groupe ≠ position du parti | Moyenne | Champ `stance` séparé + répartition affichée + `mitige` |
| Positions qui vieillissent | Moyenne | `as_of` + version de questionnaire |
| Volatilité des données AN (groupes) | Moyenne | Instantanés épinglés par SHA-256 |
| Collision de nom avec politiscales.party / .fr | Moyenne | Renommage (voir §10) |
| Invalidation par des questions mal choisies | Élevée | Sélection mesurée + quota thématique (§6.2) |

## 10. Nom

`politiscale` (ce dépôt) est à une lettre de **PolitiScales** (`politiscales.party`, `politiscales.fr`,
basé sur 8values), qui est précisément le format « affirmations abstraites + pourcentages » que ce
projet critique. Confusion probable, et défavorable.

Candidats (à valider) :

| Nom | Pour | Contre |
|---|---|---|
| **Hemicycle** | neutre, évocateur, non partisan | domaine probablement pris |
| **Concordance** | terme exact de la littérature VAA, descriptif | un peu froid |
| **Votoscope** | explicite (« on regarde les votes ») | un peu gadget |
| **Scrutin** | précis, minimal | très générique |

Recommandation : **Hemicycle** pour la marque, ou **Concordance** si on veut que le nom porte la
méthode. Le renommage du dépôt GitHub et du répertoire local est une action séparée, à déclencher
après décision.

## 11. Arborescence cible

```
content/            # le produit
  parties/  questions/  sources/  taxonomy.json
pipeline/           # exécuté au build, jamais dans le navigateur
  fetch-snapshot.mjs   # récupère et épingle l'instantané AN par SHA-256
  score-scrutins.mjs   # cohésion/dispersion → questions candidates
  validate-content.mjs # porte bloquante (§6.3)
src/                # Svelte
  routes/  lib/  components/
docs/
  PLAN.md  METHODOLOGY.md
```

## 12. Étapes

| # | Étape | Vérification |
|---|---|---|
| M0 | Plan + nom + squelette | ce document validé |
| M1 | **Preuve de faisabilité** : 5 textes complets, bout en bout, sourcés | chaque position se résout vers un scrutin réel de l'AN |
| M2 | App Svelte : parcours, résultat, localStorage, build statique | 5 questions jouables hors ligne, résultat exportable |
| M3 | Montée à ~40 questions, équilibre thématique, `METHODOLOGY.md`, a11y | porte de validation verte, quota thématique tenu |
| M4 | Publication, droit de réponse, suivi | — |

M1 est la vraie décision go/no-go : elle dit si la charge éditoriale est tenable. Rien ne doit être
construit avant.

## 13. Décisions prises / questions ouvertes

**Décidé :** France ; positions hybrides (votes + programmes) ; résultat = convergences nominatives,
pas de pourcentage arbitraire ; statique sans backend ; Svelte + Vite ; renommage.

**Ouvert :**

- Nom définitif (§10).
- Nombre de questions cible (~30 pour rester jouable, ~40 pour couvrir les 30 thèmes).
- Qui arbitre en cas de contestation d'un parti ? (seul, c'est le maillon faible.)
- Langue de rédaction : français uniquement, ou FR/EN d'emblée ?

## 14. Références

- Walgrave, Nuytemans & Pepermans (2009), *Voting aid applications and the effect of statement
  selection*, West European Politics 32(6).
- Lefevere & Walgrave (2014), *A perfect match?*, Electoral Studies 36.
- Louwerse & Rosema (2014), *The design effects of voting advice applications*, Acta Politica 49.
- Wahl-O-Mat (BpB) : positions déclarées par les partis, panel de politistes, méthode publiée.

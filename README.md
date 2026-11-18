# politiscale

Projet **Hemicycle** : un test de positionnement politique français où chaque question part d'un texte de loi et des votes parlementaires, avec la position documentée de chaque groupe.

> `main` ne contient pour l'instant que ce README. Le code, le contenu et le pipeline sont sur la branche `agent/m1-data-pipeline`.

## Ce que fait le projet

- Un questionnaire (`src/routes/Quiz.svelte`) présente des textes réels, la position de chaque groupe et ses sources.
- Le calcul de convergence (`src/lib/scoring.js`) distingue les accords fermes (groupe cohésif), les accords partagés (groupe scindé) et les désaccords. Les réponses « ne se prononce pas » et « aucune de ces positions » sont comptées séparément.
- Le contenu est en JSON versionné (`content/`), validé et alimenté par un pipeline Node à partir des scrutins de l'Assemblée nationale.

## Stack

- Svelte 5 + Vite 7 (JavaScript), routes sans framework de routage
- Pipeline Node ESM (`pipeline/*.mjs`) pour les snapshots, votes, explications et la validation du contenu
- Tests avec `node:test`

## Commandes

Depuis la branche `agent/m1-data-pipeline` :

```bash
npm install
npm run dev        # serveur Vite
npm run build      # build de production
npm test           # tests de scoring

npm run snapshot   # récupère un snapshot des scrutins
npm run validate   # valide le contenu
```

Les autres scripts du pipeline (`group-votes`, `rank-scrutins`, `select-texts`, `sync-evidence`, etc.) suivent le même principe et sont listés dans `package.json`.

## Notes

- Le périmètre est la France et l'Assemblée nationale ; le Sénat est hors périmètre.
- Les décisions de méthode et les limites du corpus sont documentées dans `docs/PLAN.md` et `.agent/CONTINUITY.md`.

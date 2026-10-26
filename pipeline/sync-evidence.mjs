// Aligne les preuves de vote d'une question sur la répartition officielle publiée par l'Assemblée.
//
// À lancer après toute création ou modification de question : la jointure locale (deputes.json) porte
// le groupe *actuel*, pas celui du vote, donc elle dérive. Ce script écrit les chiffres de l'AN.
//
// Usage : node pipeline/sync-evidence.mjs content/questions/<fichier>.json [--dry]
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { anGroupVotes } from "./an-scrutin-groups.mjs";

const CODE = {
  "Rassemblement National": "RN",
  "Ensemble pour la République": "EPR",
  "La France insoumise - Nouveau Front Populaire": "LFI-NFP",
  "Socialistes et apparentés": "SOC",
  "Droite Républicaine": "DR",
  "Écologiste et Social": "ECOS",
  "Les Démocrates": "DEM",
  "Horizons & Indépendants": "HOR",
  "Libertés, Indépendants, Outre-mer et Territoires": "LIOT",
  "Gauche Démocrate et Républicaine": "GDR",
  "Union des droites pour la République": "UDDPLR",
  "Députés non inscrits": "NI",
};

const target = process.argv[2];
const dry = process.argv.includes("--dry");
if (!target) {
  console.error("usage: node pipeline/sync-evidence.mjs <fichier.json> [--dry]");
  process.exit(2);
}

const q = JSON.parse(await readFile(path.resolve(target), "utf8"));
const scrutin = q.ancrage?.scrutin ?? q.texte?.scrutin?.id;
if (!scrutin) {
  console.error("aucun scrutin d'ancrage dans la question");
  process.exit(3);
}

const an = await anGroupVotes(scrutin);
const parCode = new Map();
for (const g of an.groupes) {
  const code = CODE[g.label];
  if (!code) {
    console.error(`groupe officiel sans code connu : « ${g.label} »`);
    process.exit(4);
  }
  parCode.set(code, g);
}

let changes = 0;
const absents = [];
for (const pos of q.positions) {
  const g = parCode.get(pos.group);
  if (!g) { absents.push(pos.group); continue; }
  for (const e of pos.evidence || []) {
    if (e.kind !== "scrutin") continue;
    const avant = `${e.pour}/${e.contre}/${e.abstention}/${e.nonvotant}`;
    e.chambre = "an";
    e.scrutin_id = q.texte?.scrutin?.id ?? scrutin;
    e.pour = g.pour;
    e.contre = g.contre;
    e.abstention = g.abstention;
    e.nonvotant = g.nonvotant;
    const apres = `${e.pour}/${e.contre}/${e.abstention}/${e.nonvotant}`;
    if (avant !== apres) {
      console.log(`  ${pos.group.padEnd(9)} ${avant}  ->  ${apres}`);
      changes++;
    }
  }
}

const nonUtilises = [...parCode.keys()].filter((c) => !q.positions.some((p) => p.group === c));

if (absents.length) console.log(`groupes de la question absents du tableau officiel : ${absents.join(", ")}`);
if (nonUtilises.length) console.log(`groupes officiels sans position dans la question : ${nonUtilises.join(", ")}`);
console.log(`${changes} preuve(s) corrigée(s) sur ${an.groupes.length} groupes officiels.`);

if (changes && !dry) {
  await writeFile(path.resolve(target), JSON.stringify(q, null, 2) + "\n");
  console.log(`écrit : ${target}`);
} else if (dry) {
  console.log("(dry : rien écrit)");
}

// Extrait d'un compte rendu de séance les interventions de chaque groupe.
//
// Usage : node pipeline/extract-explications.mjs <url_du_compte_rendu>
//
// Le compte rendu liste, dans son « sommaire détaillé », un orateur par groupe sous la forme
// « M. Benoît Biteau (EcoS) ». Chaque intervention est encadrée par le marqueur
// « Partager l'intervention partager ». On s'en sert pour découper le texte par orateur.
//
// Sortie : .cache/explications/<slug>.json  (+ un aperçu sur stdout)
// Les citations restent à découper à la main : le plafond de 25 mots (§6.3) est éditorial.
import { mkdir, writeFile, readFile } from "node:fs/promises";
import path from "node:path";

const GROUPS = "(EcoS|Dem|HOR|LIOT|GDR|UDR|RN|EPR|LFI-NFP|SOC|DR|NI|UDDPLR|ECOS|DEM|SOC\\b)";
const SPEAKER = "(?:M\\.|Mme|Mmes|MM\\.)";
const MARK = "Partager l'intervention partager";

function toText(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&#39;|&rsquo;|&#039;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&laquo;|&raquo;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

export async function extractExplications({ url, section = null, scrutinId = null }) {
const fullText = toText(await (await fetch(url, { headers: { "User-Agent": "hemicycle/0.1" } })).text());
let sectionLabel = null;
// Le sommaire (annuaire orateur → groupe) se trouve hors de la section retenue : on le lit sur le
// texte complet, sinon le découpage supprime l'annuaire et plus aucun orateur n'est identifié.
let text = fullText;

// Un compte rendu de séance couvre plusieurs textes (cette séance examine Ripost puis l'aide à
// mourir). Sans découpage, on attribue au mauvais texte les propos tenus sur le précédent — et rien
// ne le signale.
//
// On s'appuie sur le sommaire : chaque point est numéroté (« 5. Droit à l'aide à mourir … ») et le
// corps le reprend sous la même forme. On repère le point visé dans le sommaire, puis on cherche la
// **dernière** occurrence de l'en-tête numéroté (le corps), jusqu'à l'en-tête numéroté suivant.
// Chercher simplement un point numéroté ne marche pas : le texte est plein de « 1978. » et de listes.
if (section) {
  // Le sommaire et le corps n'utilisent pas toujours la même apostrophe (« l’utilisation » vs
  // « l'utilisation ») : sans normalisation, l'en-tête du corps n'est jamais reconnu et le découpage
  // retombe sur le sommaire, ce qui produit une section de quelques centaines de caractères.
  const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/['’]/g, "['’]");
  const titres = [...fullText.slice(0, 15000).matchAll(/(?:^|\s)(\d{1,2})\.\s+([\p{Lu}][^.]{3,160})/gu)]
    .map((m) => ({ n: Number(m[1]), brut: m[2].trim() }))
    .filter((x) => x.n >= 1 && x.n <= 30);
  // L'en-tête propre s'arrête au premier mot de procédure — y compris « Commission », qui suit le
  // titre dans le corps (« 3. Protéger les mineurs … Commission mixte paritaire »).
  const entete = (t) => t.split(/\s+(?:Présentation|Lecture|Discussion|Vote|Suite|Explications|Commission)\b/)[0].trim();

  // Comparaison tolérante : apostrophes droites ou typographiques, casse indifférente. Le sommaire
  // écrit « d’agriculteur » là où l'appelant tape « d'agriculteur ».
  const comparable = (s) => s.replace(/['’]/g, "'").toLowerCase();
  const idx = titres.findIndex((x) => comparable(entete(x.brut)).includes(comparable(section)));
  if (idx === -1) {
    throw new Error(`section « ${section} » introuvable parmi : ${titres.map((x) => `${x.n}. ${entete(x.brut)}`).join(" | ")}`);
  }
  const cible = titres[idx];
  const suivant = titres[idx + 1];
  // On cherche l'en-tête sur un préfixe borné : un titre capturé peut être coupé en plein mot, et
  // chercher la chaîne entière ferait alors échouer la reconnaissance du corps.
  const motif = (x) => new RegExp(`(?:^|\\s)${x.n}\\.\\s+${ESC(entete(x.brut).slice(0, 60))}`, "g");

  const occurrences = [...fullText.matchAll(motif(cible))].map((m) => m.index);
  if (!occurrences.length) {
    throw new Error(`en-tête « ${cible.n}. ${entete(cible.brut)} » absent du corps`);
  }
  const debut = occurrences[occurrences.length - 1];
  const fin = suivant ? (fullText.slice(debut).search(motif(suivant)) + debut) : -1;
  text = fullText.slice(debut, fin > debut ? fin : fullText.length);
  sectionLabel = entete(cible.brut);
  console.log(`section « ${sectionLabel} » (point ${cible.n}) : ${text.length} caractères retenus\n`);
}

// 1. Annuaire orateur -> groupe, par ordre de confiance décroissant :
//    - « scrutin » : les listes de membres publiées par l'Assemblée **pour ce vote** (fait foi) ;
//    - « sommaire » : l'étiquette du compte rendu, quand elle existe (certains points n'en ont pas) ;
//    - « roster » : l'annuaire local, qui porte le groupe *actuel* et peut avoir dérivé depuis le vote.
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

const sommaire = new Map();
const re = new RegExp(`${SPEAKER}\\s+([\\p{Lu}][\\p{L}'’\\- ]{3,40}?)\\s*\\(${GROUPS}\\)`, "gu");
const sommaireNoms = new Set();
for (const m of fullText.matchAll(re)) {
  sommaire.set(m[1].trim(), m[2]);
  sommaireNoms.add(m[1].trim());
}

const rosterMap = new Map();
try {
  const dep = JSON.parse(await readFile(path.resolve(".cache/raw/deputes.json"), "utf8"));
  for (const d of dep) if (d.group_short) rosterMap.set(d.full_name, d.group_short);
} catch {
  console.warn("deputes.json absent : pas de repli sur l'annuaire\n");
}

let scrutinMap = new Map();
if (scrutinId) {
  const { anSpeakerMap } = await import("./an-scrutin-groups.mjs");
  scrutinMap = await anSpeakerMap(scrutinId);
  if (!scrutinMap.size) console.warn(`aucun membre lu sur le scrutin ${scrutinId}\n`);
}

function attribuer(nom) {
  const s = scrutinMap.get(nom);
  if (s && CODE[s.label]) return { group: CODE[s.label], attribution: "scrutin" };
  if (sommaire.has(nom)) return { group: sommaire.get(nom), attribution: "sommaire" };
  if (rosterMap.has(nom)) return { group: rosterMap.get(nom), attribution: "roster" };
  return null;
}

const noms = [...new Set([...sommaire.keys(), ...rosterMap.keys(), ...scrutinMap.keys()])]
  .sort((a, b) => b.length - a.length); // le plus long d'abord, pour ne pas couper un nom composé

// 2. Découpage par le marqueur, puis fusion des fragments d'un même orateur.
//    Un orateur peut être coupé plusieurs fois (le marqueur réapparaît en cours d'intervention),
//    d'où le regroupement par nom plutôt qu'un simple découpage en morceaux consécutifs.
const bySpeaker = new Map();
let from = 0;
for (;;) {
  const i = text.indexOf(MARK, from);
  if (i === -1) break;
  const j = text.indexOf(MARK, i + MARK.length);
  const body = text.slice(i + MARK.length, j === -1 ? text.length : j).trim();
  const head = text
    .slice(Math.max(0, i - 100), i)
    .trim()
    // Le sommaire ajoute tantôt « (Dem) » après le nom, tantôt non : on normalise avant rapprochement.
    .replace(/\s*\((?:[^()]{1,12})\)\s*$/, "");
  const speaker = noms.find((n) => head.endsWith(n)) ?? null;
  const info = speaker ? attribuer(speaker) : null;
  if (speaker && info) {
    const prev = bySpeaker.get(speaker);
    bySpeaker.set(speaker, {
      name: speaker,
      group: info.group,
      attribution: info.attribution,
      parts: [...(prev?.parts ?? []), body],
    });
  }
  from = i + MARK.length;
}

// 3. Une intervention par orateur, fragments recollés dans l'ordre du document.
const interventions = [];
for (const { name, group, attribution, parts } of bySpeaker.values()) {
  const joined = parts.filter((p) => p.length > 40).join(" ");
  if (joined.length < 120) continue;
  interventions.push({ name, group, attribution, words: joined.split(/\s+/).length, text: joined });
}
// On ne signale que les orateurs du sommaire non rapprochés : l'annuaire complet contient des
// centaines de députés qui n'ont évidemment pas parlé dans cette section.
const unmatched = [...sommaireNoms].filter((n) => !interventions.some((i) => i.name === n));

// Dérive de rattachement : le scrutin dit une chose, l'annuaire actuel une autre.
const derives = interventions
  .filter((i) => {
    const s = scrutinMap.get(i.name);
    const r = rosterMap.get(i.name);
    return s && r && CODE[s.label] && CODE[s.label] !== r;
  })
  .map((i) => ({ name: i.name, auVote: CODE[scrutinMap.get(i.name).label], aujourdhui: rosterMap.get(i.name) }));

return { url, section: sectionLabel, interventions, unmatched, sommaireCount: sommaireNoms.size, derives };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const si = process.argv.indexOf("--section");
  const section = si !== -1 ? process.argv[si + 1] : null;
  const ci = process.argv.indexOf("--scrutin");
  const scrutinId = ci !== -1 ? process.argv[ci + 1] : null;
  if (!url) {
    console.error('usage: node pipeline/extract-explications.mjs <url> [--section "point"] [--scrutin VTANR5L17V…]');
    process.exit(2);
  }
  const res = await extractExplications({ url, section, scrutinId });
  const slug = url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(-60);
  await mkdir(path.resolve(".cache/explications"), { recursive: true });
  await writeFile(
    path.resolve(`.cache/explications/${slug}.json`),
    JSON.stringify({ url, section: res.section, extracted_at: new Date().toISOString(), interventions: res.interventions }, null, 2) + "\n",
  );
  console.log(`${res.sommaireCount} orateurs étiquetés au sommaire, ${res.interventions.length} interventions extraites`);
  if (res.unmatched.length) console.log(`non rapprochés : ${res.unmatched.join(", ")}`);
  console.log();
  for (const i of res.interventions) {
    const src = { scrutin: "scrutin du vote", sommaire: "compte rendu", roster: "annuaire (groupe actuel)" }[i.attribution] ?? i.attribution;
    console.log(`--- ${i.name} (${i.group}) — ${i.words} mots — groupe : ${src}`);
    console.log(`    ${i.text.slice(0, 220).replace(/\s+/g, " ")}…`);
  }
  if (res.derives.length) {
    console.log("\n⚠ rattachement divergent (scrutin vs annuaire actuel) :");
    for (const d of res.derives) console.log(`  ${d.name} : ${d.auVote} au vote, ${d.aujourdhui} aujourd'hui`);
  }
}

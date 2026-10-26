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

const url = process.argv[2];
const si = process.argv.indexOf("--section");
const section = si !== -1 ? process.argv[si + 1] : null;
if (!url) {
  console.error('usage: node pipeline/extract-explications.mjs <url_du_compte_rendu> [--section "point de l\'ordre du jour"]');
  process.exit(2);
}

const fullText = toText(await (await fetch(url, { headers: { "User-Agent": "hemicycle/0.1" } })).text());
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
  const ESC = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titres = [...fullText.slice(0, 15000).matchAll(/(?:^|\s)(\d{1,2})\.\s+([\p{Lu}][^.]{3,90})/gu)]
    .map((m) => ({ n: Number(m[1]), brut: m[2].trim() }))
    .filter((x) => x.n >= 1 && x.n <= 30);
  // L'en-tête propre s'arrête au premier mot de procédure.
  const entete = (t) => t.split(/\s+(?:Présentation|Lecture|Discussion|Vote|Suite|Explications)\b/)[0].trim();

  const idx = titres.findIndex((x) => entete(x.brut).toLowerCase().includes(section.toLowerCase()));
  if (idx === -1) {
    console.error(`section « ${section} » introuvable parmi : ${titres.map((x) => `${x.n}. ${entete(x.brut)}`).join(" | ")}`);
    process.exit(3);
  }
  const cible = titres[idx];
  const suivant = titres[idx + 1];
  const motif = (x) => new RegExp(`(?:^|\\s)${x.n}\\.\\s+${ESC(entete(x.brut))}`, "g");

  const occurrences = [...fullText.matchAll(motif(cible))].map((m) => m.index);
  if (!occurrences.length) {
    console.error(`en-tête « ${cible.n}. ${entete(cible.brut)} » absent du corps`);
    process.exit(3);
  }
  const debut = occurrences[occurrences.length - 1];
  const fin = suivant ? (fullText.slice(debut).search(motif(suivant)) + debut) : -1;
  text = fullText.slice(debut, fin > debut ? fin : fullText.length);
  console.log(`section « ${entete(cible.brut)} » (point ${cible.n}) : ${text.length} caractères retenus\n`);
}

// 1. Annuaire orateur -> groupe.
//    Le sommaire étiquette les orateurs « M. X (RN) »… sauf quand il ne le fait pas : sur certains
//    points de l'ordre du jour il ne liste que les noms. On complète donc par l'annuaire des députés.
//    La provenance est conservée : « sommaire » est la source du compte rendu lui-même, « roster »
//    est le rattachement actuel, qui peut avoir dérivé depuis le vote.
const people = new Map();
const re = new RegExp(`${SPEAKER}\\s+([\\p{Lu}][\\p{L}'’\\- ]{3,40}?)\\s*\\(${GROUPS}\\)`, "gu");
const sommaireNoms = new Set();
for (const m of fullText.matchAll(re)) {
  people.set(m[1].trim(), { group: m[2], attribution: "sommaire" });
  sommaireNoms.add(m[1].trim());
}
try {
  const dep = JSON.parse(await readFile(path.resolve(".cache/raw/deputes.json"), "utf8"));
  for (const d of dep) {
    if (d.group_short && !people.has(d.full_name)) {
      people.set(d.full_name, { group: d.group_short, attribution: "roster" });
    }
  }
} catch {
  console.warn("deputes.json absent : rattachement limité au sommaire\n");
}
const noms = [...people.keys()].sort((a, b) => b.length - a.length); // plus long d'abord
const roster = [...people.entries()].map(([name, v]) => ({ name, ...v }));

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
  if (speaker) {
    const info = people.get(speaker);
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

const slug = url.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(-60);
await mkdir(path.resolve(".cache/explications"), { recursive: true });
await writeFile(
  path.resolve(`.cache/explications/${slug}.json`),
  JSON.stringify({ url, extracted_at: new Date().toISOString(), interventions }, null, 2) + "\n",
);

console.log(`${roster.length} orateurs repérés au sommaire, ${interventions.length} interventions extraites`);
if (unmatched.length) console.log(`non rapprochés : ${unmatched.join(", ")}`);
console.log();
for (const i of interventions) {
  const src = i.attribution === "sommaire" ? "compte rendu" : "annuaire (groupe actuel)";
  console.log(`--- ${i.name} (${i.group}) — ${i.words} mots — source groupe : ${src}`);
  console.log(`    ${i.text.slice(0, 220).replace(/\s+/g, " ")}…`);
}

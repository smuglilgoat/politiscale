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
import { mkdir, writeFile } from "node:fs/promises";
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
if (!url) {
  console.error("usage: node pipeline/extract-explications.mjs <url_du_compte_rendu>");
  process.exit(2);
}

const text = toText(await (await fetch(url, { headers: { "User-Agent": "hemicycle/0.1" } })).text());

// 1. Annuaire orateur -> groupe, lu dans le sommaire détaillé.
const roster = [];
const re = new RegExp(`${SPEAKER}\\s+([\\p{Lu}][\\p{L}'’\\- ]{3,40}?)\\s*\\(${GROUPS}\\)`, "gu");
for (const m of text.matchAll(re)) {
  roster.push({ name: m[1].trim(), group: m[2] });
}

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
  const speaker = roster.find((s) => head.endsWith(s.name));
  if (speaker) {
    const prev = bySpeaker.get(speaker.name);
    bySpeaker.set(speaker.name, {
      name: speaker.name,
      group: speaker.group,
      parts: [...(prev?.parts ?? []), body],
    });
  }
  from = i + MARK.length;
}

// 3. Une intervention par orateur, fragments recollés dans l'ordre du document.
const interventions = [];
for (const { name, group, parts } of bySpeaker.values()) {
  const joined = parts.filter((p) => p.length > 40).join(" ");
  if (joined.length < 120) continue;
  interventions.push({ name, group, words: joined.split(/\s+/).length, text: joined });
}
const unmatched = [...new Set(roster.map((r) => r.name))].filter(
  (n) => !interventions.some((i) => i.name === n),
);

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
  console.log(`--- ${i.name} (${i.group}) — ${i.words} mots`);
  console.log(`    ${i.text.slice(0, 220).replace(/\s+/g, " ")}…`);
}

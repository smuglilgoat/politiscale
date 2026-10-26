// Sélectionne les textes candidats pour le questionnaire, par le même critère que la règle d'ancrage :
// clivage mesuré, pas goût éditorial. Sert à constituer le corpus de M1d.
//
// Usage : node pipeline/select-texts.mjs [--top 20] [--since 2024-07-01] [--min-exprimes 250]
//
// On ne regarde que les votes sur l'ensemble : c'est l'étape qui décide du sort d'un texte. Les
// amendements sont écartés ici, ils serviront d'ancrage seulement si l'ensemble n'est pas clivant.
import { readFile } from "node:fs/promises";
import path from "node:path";
import { groupVotes } from "./group-votes.mjs";

const arg = (n, d) => { const i = process.argv.indexOf(n); return i !== -1 ? process.argv[i + 1] : d; };
const TOP = Number(arg("--top", "20"));
const SINCE = arg("--since", "2024-07-01");
const MIN_EXPRIMES = Number(arg("--min-exprimes", "250"));

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Les textes budgétaires sont très clivants et font de mauvaises questions : ce sont des omnibus de
// plusieurs centaines d'articles, pas « une situation » sur laquelle on a un avis. On les écarte par
// défaut, avec un drapeau pour les réintégrer — l'exclusion est visible, pas silencieuse.
const OMNIBUS = /loi de finances|financement de la securite sociale|fin de gestion|budget/;

const scrutins = JSON.parse(await readFile(path.resolve(".cache/raw/scrutins_an.json"), "utf8"));
const includeOmnibus = process.argv.includes("--include-omnibus");
let omnibus = 0;
const candidats = scrutins.filter((s) => {
  const t = norm(s.title || "");
  if (!/l'ensemble/.test(t) || /motion|prolonger la seance/.test(t) || String(s.date) < SINCE) return false;
  if (!includeOmnibus && OMNIBUS.test(t)) { omnibus++; return false; }
  return true;
});

const res = await groupVotes(candidats.map((s) => s.id));

// Clé de texte : titre normalisé, sans le préfixe « l'ensemble … » ni le contenu entre parenthèses
// (mention de lecture). Retirer *toutes* les parenthèses plutôt qu'énumérer les lectures : une
// énumération où certaines branches avalent la parenthèse et d'autres non produit deux clés
// différentes pour le même texte, et le dédoublonnage échoue en silence.
const textKey = (title) => {
  let t = norm(title).replace(/^l.ensemble\s+/, "");
  t = t.replace(/\([^)]*\)/g, " ").replace(/\s+/g, " ").trim();
  return t.slice(0, 80);
};

const rows = [];
let sousEngages = 0;
for (const s of candidats) {
  const r = res[s.id];
  if (!r) continue;
  const { positions, total } = r;
  const votants = total.POUR + total.CONTRE + total.ABSTENTION;
  const exprimes = total.POUR + total.CONTRE;
  if (!votants || exprimes < MIN_EXPRIMES) { sousEngages++; continue; }
  const marge = Math.abs(total.POUR - total.CONTRE) / votants;
  const divises = positions.filter((p) => p.stance === "mitige");
  const dispersion = divises.reduce((n, p) => n + p.counts.POUR + p.counts.CONTRE + p.counts.ABSTENTION, 0) / votants;
  rows.push({
    id: s.id, date: String(s.date).slice(0, 10),
    pour: total.POUR, contre: total.CONTRE, abstention: total.ABSTENTION,
    marge: +marge.toFixed(3), dispersion: +dispersion.toFixed(3),
    clivage: +(0.5 * (1 - marge) + 0.5 * dispersion).toFixed(3),
    key: textKey(s.title),
    titre: String(s.title).replace(/\s+/g, " ").slice(0, 110),
  });
}
rows.sort((a, b) => b.clivage - a.clivage);

// On ne garde que le vote le plus clivant par texte : un texte = une question.
const vus = new Set();
const retenus = [];
for (const r of rows) {
  if (vus.has(r.key)) continue;
  vus.add(r.key);
  retenus.push(r);
}

console.log(`${candidats.length} votes « ensemble » depuis ${SINCE} — ${sousEngages} sous le plancher ` +
  `(exprimés < ${MIN_EXPRIMES}) — ${omnibus} textes budgétaires écartés — ${retenus.length} textes distincts\n`);
const pad = (v, n) => String(v).padEnd(n);
console.log(pad("rang", 5), pad("id", 16), pad("date", 11), pad("p/c/a", 14), pad("marge", 6), pad("disp.", 6), pad("clivage", 8), "texte");
for (const [i, r] of retenus.slice(0, TOP).entries()) {
  console.log(pad(i + 1, 5), pad(r.id, 16), pad(r.date, 11), pad(`${r.pour}/${r.contre}/${r.abstention}`, 14),
    pad(r.marge, 6), pad(r.dispersion, 6), pad(r.clivage, 8), r.titre.slice(0, 78));
}

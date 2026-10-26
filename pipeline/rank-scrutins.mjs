// Applique la règle d'ancrage B (§4.4) : parmi les étapes *intelligibles* d'un texte, choisir le
// vote le plus clivant. La règle est un calcul, pas un jugement — c'est ce qui la rend publiable.
//
// Usage : node pipeline/rank-scrutins.mjs --match "souveraineté agricoles" [--top 8]
//
// Intelligibilité : on ne retient que les votes sur l'ensemble ou sur un article. Les amendements et
// sous-amendements sont écartés : un 57/59/1 sur une correction de rédaction est très clivant et
// n'apprend rien à un citoyen. C'est le garde-fou qui empêche la règle d'être capturée par du bruit.
//
// Clivage = moitié « chambre serrée », moitié « les groupes se fracturent » :
//   marge      = |pour − contre| / votants        (bas = serré)
//   dispersion = part des votants appartenant à un groupe à stance « mitige »
//   clivage    = 0,5 × (1 − marge) + 0,5 × dispersion
import { readFile } from "node:fs/promises";
import path from "node:path";
import { groupVotes } from "./group-votes.mjs";

const RAW = path.resolve(".cache/raw");
const arg = (name, def = null) => {
  const i = process.argv.indexOf(name);
  return i !== -1 ? process.argv[i + 1] : def;
};
const match = arg("--match");
const top = Number(arg("--top", "8"));
// Plancher d'engagement. Un vote où plus de députés s'abstiennent qu'ils ne votent pour ou contre
// n'exprime pas un choix de la chambre : c'est un moment procédural. Sans ce plancher, la règle B
// élit des articles votés par 90 personnes avec 38 abstentions — très « clivant », et vide de sens.
const MIN_EXPRIMES = Number(arg("--min-exprimes", "250"));
if (!match) {
  console.error('usage: node pipeline/rank-scrutins.mjs --match "fragment du titre" [--top 8] [--min-exprimes 250]');
  process.exit(2);
}

const norm = (s) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const intelligible = (title) => {
  const t = norm(title);
  if (!/l'ensemble|l'article/.test(t)) return false;
  // bruit procédural ou technique
  return !/amendement|motion|sous-amendement|prolonger la seance|rappel au reglement|exception d'irrecevabilite/.test(t);
};

const scrutins = JSON.parse(await readFile(path.join(RAW, "scrutins_an.json"), "utf8"));
const needle = norm(match);
const candidats = scrutins
  .filter((s) => norm(s.title || "").includes(needle))
  .sort((a, b) => String(a.date).localeCompare(String(b.date)));

if (!candidats.length) {
  console.error(`aucun scrutin ne correspond à « ${match} »`);
  process.exit(3);
}

const retenus = candidats.filter((s) => intelligible(s.title));
const ecartes = candidats.length - retenus.length;
const res = await groupVotes(retenus.map((s) => s.id));

const rows = [];
let sousEngages = 0;
for (const s of retenus) {
  const r = res[s.id];
  if (!r) continue;
  const { positions, total } = r;
  const votants = total.POUR + total.CONTRE + total.ABSTENTION;
  const exprimes = total.POUR + total.CONTRE;
  if (!votants) continue;
  if (exprimes < MIN_EXPRIMES) { sousEngages++; continue; }
  const marge = Math.abs(total.POUR - total.CONTRE) / votants;
  const divises = positions.filter((p) => p.stance === "mitige");
  const votantsDivises = divises.reduce((n, p) => n + p.counts.POUR + p.counts.CONTRE + p.counts.ABSTENTION, 0);
  const dispersion = votantsDivises / votants;
  const clivage = 0.5 * (1 - marge) + 0.5 * dispersion;
  rows.push({
    id: s.id,
    date: String(s.date).slice(0, 10),
    niveau: /l'ensemble/.test(norm(s.title)) ? "ensemble" : "article",
    pour: total.POUR, contre: total.CONTRE, abstention: total.ABSTENTION,
    marge: +marge.toFixed(3),
    dispersion: +dispersion.toFixed(3),
    clivage: +clivage.toFixed(3),
    groupesDivises: divises.map((p) => p.group).join(",") || "-",
    titre: String(s.title).replace(/\s+/g, " ").slice(0, 92),
  });
}
rows.sort((a, b) => b.clivage - a.clivage);

console.log(`${candidats.length} scrutins pour « ${match} » — ${ecartes} écartés (amendements/procédure), ` +
  `${sousEngages} sous le plancher d'engagement (exprimés < ${MIN_EXPRIMES}), ${rows.length} analysés\n`);
const pad = (v, n) => String(v).padEnd(n);
console.log(pad("id", 16), pad("date", 11), pad("niveau", 9), pad("p/c/a", 14), pad("marge", 6), pad("disp.", 6), pad("clivage", 8), "groupes divisés");
for (const r of rows.slice(0, top)) {
  console.log(
    pad(r.id, 16), pad(r.date, 11), pad(r.niveau, 9),
    pad(`${r.pour}/${r.contre}/${r.abstention}`, 14),
    pad(r.marge, 6), pad(r.dispersion, 6), pad(r.clivage, 8), r.groupesDivises,
  );
  console.log("   ", r.titre);
}

const best = rows[0];
if (best) {
  console.log(`\nANCRAGE RETENU (règle B) : ${best.id} — ${best.date}, ${best.niveau}, clivage ${best.clivage}`);
  console.log(`motif publiable : marge ${best.marge} (chambre serrée) et ${(best.dispersion * 100).toFixed(1)} % des votants dans un groupe fracturé`);
}

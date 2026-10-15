// Porte de validation du contenu. Bloquante : c'est la garantie de neutralité (§6.3).
// Une position sans preuve, ou sans justification sourcée et attribuée, ne part pas.
//
// Usage : npm run validate
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTENT = path.resolve("content");
const STANCES = new Set(["pour", "contre", "abstention", "mitige", "non_aborde"]);
const BASIS = new Set(["sourced", "scrutin_derived"]);
const EVIDENCE_KINDS = new Set(["scrutin", "declaration", "programme", "wikidata"]);
const LINK_KINDS = new Set(["news", "wikidata", "officiel"]);
// Plafond de citation selon la source : un document parlementaire public se cite plus longuement
// qu'un article de presse (droit de citation français).
const QUOTE_CAP = { officiel: 45, news: 25, wikidata: 45 };
// Un champ dérivé du vote ne doit pas être stocké : il dériverait de la preuve qu'il décrit.
const DERIVED = ["cohesion", "cohesion_score", "score"];

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);
const words = (s) => s.split(/\s+/).filter(Boolean).length;

const parties = JSON.parse(await readFile(path.join(CONTENT, "parties.json"), "utf8"));
const knownGroups = new Set(parties.map((p) => p.slug));
const sources = JSON.parse(await readFile(path.join(CONTENT, "sources.json"), "utf8"));
const sourceById = new Map(sources.map((s) => [s.id, s]));

for (const s of sources) {
  if (!LINK_KINDS.has(s.kind)) err(`sources.json (${s.id})`, `kind inconnu : ${s.kind}`);
  if (!s.licence) err(`sources.json (${s.id})`, "licence manquante");
  if (!s.date) err(`sources.json (${s.id})`, "date manquante");
}

const files = (await readdir(path.join(CONTENT, "questions"))).filter((f) => f.endsWith(".json"));

for (const file of files) {
  const q = JSON.parse(await readFile(path.join(CONTENT, "questions", file), "utf8"));
  const w = `questions/${file}`;

  for (const field of ["id", "country", "themes", "version", "as_of", "situation", "texte", "positions"]) {
    if (q[field] === undefined || q[field] === null) err(w, `champ requis manquant : ${field}`);
  }
  if (!Array.isArray(q.themes) || q.themes.length === 0) err(w, "themes doit être une liste non vide");
  if (!q.texte?.scrutin?.id) err(w, "texte.scrutin.id manquant : sans scrutin, pas de preuve");
  if (q.situation_status !== "source") {
    err(w, `situation_status="${q.situation_status}" : contexte non sourcé, non publiable`);
  }

  const seen = new Set();
  for (const [i, p] of (q.positions || []).entries()) {
    const pw = `${w} position[${i}] (${p.group ?? "sans groupe"})`;

    if (!knownGroups.has(p.group)) err(pw, `groupe inconnu de parties.json : ${p.group}`);
    if (seen.has(p.group)) err(pw, "groupe présent deux fois");
    seen.add(p.group);
    if (!STANCES.has(p.stance)) err(pw, `stance invalide : ${p.stance}`);
    if (!BASIS.has(p.stance_basis)) err(pw, `stance_basis invalide : ${p.stance_basis}`);

    // La règle qui rend la neutralité mécanique et non déclarative.
    if (!Array.isArray(p.evidence) || p.evidence.length === 0) err(pw, "preuve absente : non publiable");
    for (const e of p.evidence || []) {
      if (!EVIDENCE_KINDS.has(e.kind)) err(pw, `kind de preuve inconnu : ${e.kind}`);
      if (e.kind === "scrutin" && !e.scrutin_id) err(pw, "preuve de type scrutin sans scrutin_id");
    }

    // La justification est une citation verbatim : elle exige un orateur et une source,
    // ou une exemption motivée (aucun orateur de groupe ne peut exister).
    if (!p.justification && !p.justification_exempt) {
      err(pw, "ni justification ni justification_exempt : non publiable");
    }
    if (p.justification) {
      if (!p.speaker) err(pw, "justification sans speaker : une citation doit être attribuée");
      const src = sourceById.get(p.source_ref);
      if (!p.source_ref || !src) {
        err(pw, `source_ref absent ou inconnu de sources.json : ${p.source_ref}`);
      } else {
        const cap = QUOTE_CAP[src.kind] ?? 25;
        if (words(p.justification) > cap) {
          err(pw, `citation de ${words(p.justification)} mots > plafond ${cap} (${src.kind})`);
        }
      }
    }
    if (p.justification_exempt && p.justification) {
      err(pw, "justification et justification_exempt simultanées : ambigu");
    }
    if (p.stance_basis === "sourced" && !p.justification) {
      err(pw, 'stance_basis="sourced" sans justification : une position déclarée doit être citée');
    }
    for (const d of DERIVED) {
      if (d in p) err(pw, `champ dérivé stocké (« ${d} ») : à recalculer depuis evidence`);
    }
  }

  for (const s of q.sources || []) {
    if (!sourceById.has(s.id)) err(w, `source inconnue de sources.json : ${s.id}`);
  }
  for (const r of q.revisions || []) {
    if (!r.date || !r.version || !r.reason) err(w, "revision sans date, version ou motif");
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problème(s) — publication bloquée :\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("");
  process.exit(1);
}

const positions = files.reduce((n, f) => n, 0);
console.log(`${files.length} question(s) valide(s).`);

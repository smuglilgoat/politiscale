// Porte de validation du contenu. Bloquante : c'est la garantie de neutralité (§6.3).
// Une position sans preuve, ou sans justification sourcée, ne part pas.
//
// Usage : npm run validate
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const CONTENT = path.resolve("content");
const STANCES = new Set(["pour", "contre", "mitige", "non_aborde"]);
const SOURCE_KINDS = new Set(["scrutin", "declaration", "programme", "wikidata"]);
const LINK_KINDS = new Set(["news", "wikidata", "officiel"]);
const MAX_QUOTE_WORDS = 25;

const errors = [];
const err = (where, msg) => errors.push(`${where}: ${msg}`);

const parties = JSON.parse(await readFile(path.join(CONTENT, "parties.json"), "utf8"));
const known = new Set(parties.map((p) => p.slug));
const sources = JSON.parse(await readFile(path.join(CONTENT, "sources.json"), "utf8"));
const knownSources = new Set(sources.map((s) => s.id));

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

    if (!known.has(p.group)) err(pw, `groupe inconnu de parties.json : ${p.group}`);
    if (seen.has(p.group)) err(pw, "groupe présent deux fois");
    seen.add(p.group);
    if (!STANCES.has(p.stance)) err(pw, `stance invalide : ${p.stance}`);
    if (!["scrutin_derived", "sourced"].includes(p.stance_basis)) {
      err(pw, `stance_basis manquant ou invalide : ${p.stance_basis}`);
    }

    // La règle qui rend la neutralité mécanique et non déclarative.
    if (!Array.isArray(p.evidence) || p.evidence.length === 0) err(pw, "preuve absente : non publiable");
    for (const e of p.evidence || []) {
      if (!SOURCE_KINDS.has(e.kind)) err(pw, `kind de preuve inconnu : ${e.kind}`);
      if (e.kind === "scrutin" && !e.scrutin_id) err(pw, "preuve de type scrutin sans scrutin_id");
    }

    // La justification est le seul texte dont nous sommes auteurs : c'est le champ contestable.
    if (!p.justification) {
      err(pw, "justification absente : à sourcer avant publication (droit de réponse, §6.4)");
    }
    if (p.justification && p.justification.split(/\s+/).length > MAX_QUOTE_WORDS) {
      err(pw, `justification > ${MAX_QUOTE_WORDS} mots : c'est une citation, pas un résumé`);
    }
  }

  for (const s of q.sources || []) {
    if (!knownSources.has(s.id)) err(w, `source inconnue de sources.json : ${s.id}`);
  }
  for (const r of q.revisions || []) {
    if (!r.date || !r.version || !r.reason) err(w, "revision sans date, version ou motif");
  }
}

if (errors.length) {
  console.error(`\n${errors.length} problème(s) — publication bloquée :\n`);
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nC'est le comportement attendu tant qu'une justification n'est pas sourcée.\n");
  process.exit(1);
}

console.log(`${files.length} question(s) valide(s).`);

// Extrait d'un compte rendu de commission les interventions individuelles, chacune rattachée au
// parti de son orateur.
//
// Usage : node pipeline/extract-commission.mjs <url> [--section "sous-section"] --source <ref> --date <ISO>
//
// Deux différences avec les comptes rendus de séance de l'Assemblée, qui interdisent de réutiliser
// tel quel l'extracteur de séance :
//   1. Le Sénat sert des **entités HTML nommées** (« souverainet&eacute; ») là où l'Assemblée sert de
//      l'UTF-8. Sans décodage, toute recherche de mot accentué échoue **silencieusement**.
//   2. Le format de tour de parole n'est pas un marqueur mais « Nom, role. - texte », et la
//      répartition en groupes n'est pas donnée : il faut la retrouver dans les annuaires.
//
// Attention : en commission, les membres siègent **à titre individuel**. Une intervention rattachée à
// un parti est la position d'une personne de ce parti, pas la position officielle du groupe.
import { readFile, mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const NAMED = {
  eacute: "é", egrave: "è", agrave: "à", ecirc: "ê", icirc: "î", ocirc: "ô", ucirc: "û",
  acirc: "â", ugrave: "ù", ccedil: "ç", iuml: "ï", euml: "ë", Agrave: "À", Eacute: "É",
  Egrave: "È", Icirc: "Î", Ccedil: "Ç", laquo: "«", raquo: "»", nbsp: " ", amp: "&",
  quot: '"', apos: "'", deg: "°", euro: "€", hellip: "…", mdash: "—", ndash: "–", rsquo: "’",
  lsquo: "‘", times: "×", lt: "<", gt: ">", sup2: "²", frac12: "½", oelig: "œ", OElig: "Œ",
};

export function decodeEntities(s) {
  return s
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-zA-Z][a-zA-Z0-9]{1,10});/g, (m, n) => (n in NAMED ? NAMED[n] : m));
}

const toText = (html) =>
  decodeEntities(html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();

// « Nom, role. - texte ». Deux contraintes apprises à l'usage :
//   - le nom ne peut contenir ni virgule ni point ; sinon le motif enjambe la phrase précédente et
//     produit des noms fantômes du genre « Benoît Biteau ne sont pas adoptées. M. Fabrice Barusseau » ;
//   - le role doit contenir un mot de fonction, sinon on ramasse des « M. Dupont, rapporteur. - »
//     cités au milieu d'une intervention.
const ROLE = "sénateur|sénatrice|député|députée|rapporteur|rapporteuse|président|présidente|ministre|secrétaire";
const TOUR = new RegExp(`(?:M\\.|Mme|MM\\.|Mmes)\\s+([^,.]{2,60}?)\\s*,\\s*([^.]{2,90}?)\\s*\\.\\s*[-–—]\\s*`, "gu");
const HEAD = /Commission mixte paritaire chargée de proposer un texte sur les dispositions restant en discussion/gi;
// En commission, on n'adopte pas seulement « l'article N » : on peut aussi adopter, rejeter ou
// retirer des propositions de rédaction. Le motif couvre les deux formulations.
const DECISION = /(proposition commune de rédaction des rapporteurs est adoptée|propositions? de rédaction[^.]{0,120}(?:sans objet|est adoptée|est rejetée|est retirée|non adoptée)[^.]{0,60}|adopte l'article[^.]{0,160}|constate qu'elle ne peut[^.]{0,120}|convient d'adopter[^.]{0,80})/gi;

export function sliceSection(text, needle) {
  const heads = [...text.matchAll(HEAD)].map((m) => m.index);
  if (!heads.length) return { text, found: false };
  // L'en-tête apparaît deux fois : une fois en sommaire, une fois en tête du corps. On retient la
  // plage la plus longue, c'est-à-dire celle qui contient réellement les débats.
  const candidates = heads
    .filter((i) => text.slice(i, i + 260).toLowerCase().includes(needle.toLowerCase()))
    .map((start) => ({ start, span: (heads.find((i) => i > start) ?? text.length) - start }));
  if (!candidates.length) return { text, found: false };
  const { start } = candidates.sort((a, b) => b.span - a.span)[0];
  const next = heads.find((i) => i > start);
  return { text: text.slice(start, next ?? text.length), found: true };
}

export async function extractCommission({ url, section = null, rawDir = ".cache/raw" }) {
  const full = toText(await (await fetch(url, { headers: { "User-Agent": "hemicycle/0.1" } })).text());
  let raw = full;
  let sectionFound = null;
  if (section) {
    const r = sliceSection(full, section);
    if (!r.found) throw new Error(`section « ${section} » introuvable`);
    raw = r.text; sectionFound = section;
  }

  // 1. Découpage par tour de parole, puis recollement des fragments d'un même orateur.
  const starts = [];
  for (const m of raw.matchAll(TOUR)) {
    if (!new RegExp(ROLE, "i").test(m[2])) continue;
    starts.push({ index: m.index, end: m.index + m[0].length, name: m[1].trim(), role: m[2].trim() });
  }
  const speeches = [];
  for (let i = 0; i < starts.length; i++) {
    const cur = starts[i];
    const text = raw.slice(cur.end, i + 1 < starts.length ? starts[i + 1].index : raw.length).trim();
    if (!text) continue;
    const last = speeches[speeches.length - 1];
    if (last && last.name === cur.name) { last.parts.push(text); continue; }
    speeches.push({ name: cur.name, role: cur.role, parts: [text] });
  }

  // 2. Rattachement au parti. On choisit la chambre d'après le mandat annoncé, et on préfère une
  // entrée réellement rattachée à un groupe : sinon un homonyme inactif de l'autre assemblée, avec
  // un groupe nul, bloque la bonne correspondance.
  const dep = JSON.parse(await readFile(path.resolve(rawDir, "deputes.json"), "utf8"));
  const depBy = new Map(dep.map((d) => [d.full_name, { chambre: "an", groupe: d.group_short, mandat: "député" }]));
  let senBy = new Map();
  try {
    const sen = JSON.parse(await readFile(path.resolve(rawDir, "senateurs.json"), "utf8"));
    senBy = new Map(sen.map((s) => [s.full_name, { chambre: "senat", groupe: s.group_short, mandat: "sénateur" }]));
  } catch { /* rattachement limité à l'Assemblée */ }
  const resolve = (name, role) => {
    const order = /sénateur|sénatrice/i.test(role) ? [senBy, depBy] : [depBy, senBy];
    const hits = order.map((m) => m.get(name)).filter(Boolean);
    return hits.find((h) => h.groupe) ?? hits[0] ?? null;
  };

  const out = speeches.map((sp) => {
    const text = sp.parts.join(" ");
    const hit = resolve(sp.name, sp.role);
    return {
      name: sp.name, role: sp.role, words: text.split(/\s+/).length,
      party: hit?.groupe ?? null, chamber: hit?.chambre ?? null, mandate: hit?.mandat ?? null,
      resolved: Boolean(hit?.groupe), text,
    };
  });
  const decisions = [...raw.matchAll(DECISION)].map((m) => m[1].trim());
  return { url, section: sectionFound, speeches: out, decisions };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const url = process.argv[2];
  const arg = (name) => { const i = process.argv.indexOf(name); return i !== -1 ? process.argv[i + 1] : null; };
  const section = arg("--section");
  const sourceRef = arg("--source");
  const date = arg("--date");
  const id = arg("--id");
  if (!url) {
    console.error('usage: node pipeline/extract-commission.mjs <url> [--section "motif"] --source <ref> --date <ISO> [--id <id>]');
    process.exit(2);
  }
  const res = await extractCommission({ url, section });
  const slug = id ?? (section ?? url).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
  const artifact = {
    id: slug,
    kind: arg("--kind") ?? "commission",
    date: date ?? null,
    source_ref: sourceRef ?? null,
    generated_at: new Date().toISOString(),
    extractor: "pipeline/extract-commission.mjs",
    note: "Les membres d'une commission siègent à titre individuel : une intervention rattachée à un parti est la position d'une personne de ce parti, pas la position officielle du groupe.",
    interventions: res.speeches.map(({ text, ...rest }) => ({ ...rest, text })),
    decisions: res.decisions,
  };

  await mkdir(path.resolve(".cache/explications"), { recursive: true });
  await writeFile(path.resolve(`.cache/explications/commission-${slug}.json`), JSON.stringify(artifact, null, 2) + "\n");

  // Artefact versionné seulement s'il est rattaché à une source : sinon il n'est pas citable.
  if (sourceRef && date) {
    await mkdir(path.resolve("content/debates"), { recursive: true });
    await writeFile(path.resolve(`content/debates/${slug}.json`), JSON.stringify(artifact, null, 2) + "\n");
    console.log(`-> content/debates/${slug}.json (généré, versionné)\n`);
  } else {
    console.log("(pas de --source/--date : écrit dans .cache seulement, non publiable)\n");
  }

  const parParti = new Map();
  for (const s of res.speeches) {
    const k = s.party ?? "(non rattaché)";
    const cur = parParti.get(k) ?? { parti: k, n: 0, mots: 0, exemple: "" };
    cur.n++; cur.mots += s.words;
    if (!cur.exemple) cur.exemple = `${s.name} — ${s.text.slice(0, 100)}…`;
    parParti.set(k, cur);
  }
  const non = res.speeches.filter((s) => !s.resolved).length;
  console.log(`${res.section ? `section « ${res.section} » · ` : ""}${res.speeches.length} interventions, ` +
    `${res.speeches.length - non} rattachées, ${non} non rattachées, ${res.decisions.length} décisions\n`);
  for (const p of [...parParti.values()].sort((a, b) => b.mots - a.mots)) {
    console.log(`${p.parti.padEnd(22)} ${String(p.n).padStart(4)} interv. ${String(p.mots).padStart(6)} mots`);
    console.log(`   ${p.exemple}`);
  }
}

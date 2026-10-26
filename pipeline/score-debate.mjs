// Second filtre de sélection : un texte n'est retenu que si son débat produit assez de déclarations
// de position exploitables. La règle B choisit un *vote* clivant ; elle ne dit rien de la qualité du
// débat qui l'entoure. Certains textes donnent un orateur par groupe et une phrase de position nette,
// d'autres un chahut d'interjections où l'on ne peut citer personne.
//
// Usage : node pipeline/score-debate.mjs <scrutin> [<scrutin> …] [--min-declarations 8] [--needle "…"]
import { extractExplications } from "./extract-explications.mjs";

// Deux signaux doivent coexister dans la même phrase, sinon on ramasse des propos rhétoriques ou
// étrangers au texte : « nous nous sommes opposés à l'accord Mercosur » contient bien « opposé »,
// mais ne dit rien de la position sur ce texte.
const VERBE = /(voter(a|ai|ons|ont|ons pas)|souten|oppos|favorable|défavorable|abstien|pour ce texte|contre ce texte)/i;
const SUJET_GROUPE = new RegExp(
  [
    "notre groupe", "le groupe\\s+[\\p{Lu}]", "(?:députés|membres) du groupe", "du groupe\\s+[\\p{Lu}]",
    "nous voterons", "nous ne voterons", "nous nous abstiendrons", "je voterai", "je m['’]abstiendrai",
    "je vous (?:invite|appelle) à voter",
    // les partis se désignent souvent par leur nom plutôt que par « le groupe »
    "la France insoumise", "rassemblement national", "socialistes et apparentés", "écologiste et social",
    "les démocrates", "horizons", "libertés, indépendants", "gauche démocrate", "droite républicaine",
    "ensemble pour la république", "union des droites", "députés démocrates",
  ].join("|"),
  "iu",
);

// Une « déclaration exploitable » dit la position d'un *groupe* sur le texte, en une phrase citable.
export function declarations(int) {
  const sents = int.text.split(/(?<=[.!?])\s+/);
  return sents.filter((s) => {
    const n = s.split(/\s+/).length;
    return n >= 8 && n <= 45 && VERBE.test(s) && SUJET_GROUPE.test(s);
  });
}

const norm = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const args = process.argv.slice(2);
const arg = (n, d) => { const i = args.indexOf(n); return i !== -1 ? args[i + 1] : d; };
const MIN = Number(arg("--min-declarations", "8"));
const forced = arg("--needle");
const ids = args.filter((a) => !a.startsWith("--") && a !== forced);
if (!ids.length) {
  console.error('usage: node pipeline/score-debate.mjs <scrutin> … [--min-declarations 8] [--needle "…"]');
  process.exit(2);
}

// Le compte rendu est lié depuis la page de scrutin ; le point de l'ordre du jour est retrouvé par
// approximations successives du titre (le libellé du sommaire ne suit pas toujours celui du scrutin).
async function crLink(num) {
  const html = await (await fetch(`https://www.assemblee-nationale.fr/dyn/17/scrutins/${num}`, { headers: { "User-Agent": "hemicycle/0.1" } })).text();
  const m = /href="(\/dyn\/17\/comptes-rendus\/seance\/[A-Z0-9]+)"/.exec(html);
  const plain = html.replace(/<[^>]+>/g, " ").replace(/&#039;/g, "'").replace(/\s+/g, " ");
  const t = new RegExp(`Scrutin public n°\\s*${num}[^.]{0,200}`).exec(plain);
  return { url: m ? `https://www.assemblee-nationale.fr${m[1]}` : null, titre: t ? t[0] : "" };
}

function needles(titre) {
  // On ne retire PAS les accents : les en-têtes du compte rendu les portent, et comparer une chaîne
  // dé-accentuée à un libellé accentué ne peut pas réussir.
  const t = titre
    .replace(/^Scrutin public n°\s*\d+\s*sur\s*/i, "")
    .replace(/^l'ensemble\s+(de la |du |de l'|des |de )?/i, "")
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const w = t.split(" ");
  const out = [];
  // Du plus précis au plus court : un libellé de sommaire omet souvent l'article (« Protection et
  // souveraineté agricoles » là où le titre dit « … pour la protection et la souveraineté agricoles »).
  for (const n of [8, 6, 5, 4, 3, 2]) if (w.length >= n) out.push(w.slice(-n).join(" "));
  out.push(t);
  return [...new Set(out)];
}

console.log("texte      déclarations  verdict     groupes sans déclaration détectée");
console.log("(score INDICATIF : voir la note en fin de sortie)\n");
for (const id of ids) {
  const num = String(id).match(/(\d+)$/)[1];
  const { url, titre } = await crLink(num);
  if (!url) { console.log(`${num}  CR introuvable`); continue; }

  let res = null;
  const essais = forced ? [forced] : needles(titre);
  for (const n of essais) {
    try { res = await extractExplications({ url, section: n, scrutinId: id }); break; } catch {}
  }
  if (!res) { console.log(`${num}  section introuvable`); continue; }

  const parGroupe = new Map();
  for (const i of res.interventions) {
    const n = declarations(i).length;
    if (n > (parGroupe.get(i.group) ?? 0)) parGroupe.set(i.group, n);
  }
  // NI est exclu du décompte : les non-inscrits n'ont pas d'orateur de groupe par construction.
  const STANDARD = ["RN", "EPR", "LFI-NFP", "SOC", "DR", "ECOS", "DEM", "HOR", "LIOT", "GDR", "UDDPLR"];
  const avec = STANDARD.filter((g) => (parGroupe.get(g) ?? 0) > 0);
  const manquants = STANDARD.filter((g) => !avec.includes(g));
  const verdict = avec.length >= MIN ? "OK" : "FAIBLE";
  console.log(
    `${num}  ${String(avec.length).padStart(3)}/11 ${verdict.padEnd(7)}  ` +
    `${manquants.length ? manquants.join(",") : "—"}  (${res.interventions.length} interventions)`,
  );
}

console.log(`
NOTE — ce score est indicatif, pas un verdict.
Mesuré sur les questions déjà écrites, il se trompe dans les deux sens : la question sur
l'aide à mourir, la mieux sourcée du corpus (11 citations vérifiées à la main), obtient
6/11 parce que ses orateurs *raisonnent* au lieu de déclarer, et parce qu'une phrase de
déclaration de 50 mots sort du plafond de citation. À l'inverse un débat purement
rhétorique peut scorer haut sur des phrases qui parlent d'amendements ou d'un autre sujet.
Conclusion : un score très bas signale probablement un débat bruité, mais un score élevé ne
garantit rien. Le tri fiable reste la lecture des interventions.`);

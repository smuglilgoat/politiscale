// Lit la répartition officielle des votes par groupe sur la page de scrutin de l'Assemblée.
//
// Pourquoi ne pas réutiliser group-votes.mjs : sa jointure passe par deputes.json, qui porte le groupe
// **actuel**. Quand un député change de groupe entre le vote et aujourd'hui, il atterrit dans le
// mauvais bloc. Sur le scrutin 8427 l'écart était d'un siège dans trois groupes, et il s'annulait au
// total — donc invisible. Ici on lit ce que l'Assemblée publie, groupe par groupe.
//
// Usage : node pipeline/an-scrutin-groups.mjs 8427 [8428 …]
import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE = "https://www.assemblee-nationale.fr";

export function scrutinNumber(idOrNumber) {
  const m = String(idOrNumber).match(/(\d+)$/);
  if (!m) throw new Error(`numéro de scrutin introuvable dans « ${idOrNumber} »`);
  return m[1];
}

const strip = (s) =>
  s.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();

export async function anGroupVotes(idOrNumber, legislature = 17) {
  const num = scrutinNumber(idOrNumber);
  const url = `${BASE}/dyn/${legislature}/scrutins/${num}`;
  const html = await (await fetch(url, { headers: { "User-Agent": "hemicycle/0.1" } })).text();

  const start = html.indexOf("Répartition des votes par groupe");
  if (start === -1) throw new Error(`section par groupe absente de ${url}`);
  const region = html.slice(start);

  // Un bloc par groupe, délimité par data-organe-id.
  const marks = [...region.matchAll(/data-organe-id="(PO\d+)"/g)];
  const groupes = [];
  for (let i = 0; i < marks.length; i++) {
    const block = region.slice(marks[i].index, i + 1 < marks.length ? marks[i + 1].index : region.length);
    const name = /<a[^>]*class="h5"[^>]*>([\s\S]*?)<\/a>/.exec(block);
    const label = name ? strip(name[1]) : null;
    if (!label) continue;
    const t = strip(block);
    const num2 = (re) => { const m = re.exec(t); return m ? Number(m[1]) : 0; };
    groupes.push({
      organe: marks[i][1],
      label,
      pour: num2(/Pour\s*:\s*(\d+)/),
      contre: num2(/Contre\s*:\s*(\d+)/),
      abstention: num2(/Abstention\s*:\s*(\d+)/),
      nonvotant: num2(/Non votant\s*:\s*(\d+)/),
    });
  }
  const total = groupes.reduce(
    (a, g) => ({ pour: a.pour + g.pour, contre: a.contre + g.contre, abstention: a.abstention + g.abstention, nonvotant: a.nonvotant + g.nonvotant }),
    { pour: 0, contre: 0, abstention: 0, nonvotant: 0 },
  );
  return { scrutin: num, url, groupes, total };
}

// Contrôle : les totaux par groupe doivent redonner la synthèse publiée sur la même page.
export async function anSynthese(idOrNumber, legislature = 17) {
  const num = scrutinNumber(idOrNumber);
  const html = await (await fetch(`${BASE}/dyn/${legislature}/scrutins/${num}`, { headers: { "User-Agent": "hemicycle/0.1" } })).text();
  const t = strip(html);
  const n = (re) => { const m = re.exec(t); return m ? Number(m[1]) : null; };
  return {
    votants: n(/Nombre de votants\s*:\s*(\d+)/),
    exprimes: n(/Nombre de suffrages exprimés\s*:\s*(\d+)/),
    pour: n(/Pour l'adoption\s*:\s*(\d+)/),
    contre: n(/Contre\s*:\s*(\d+)/),
    abstention: n(/Abstention\s*:\s*(\d+)/),
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith("--") && a !== process.argv[process.argv.indexOf("--compare") + 1]);
  if (!ids.length) {
    console.error("usage: node pipeline/an-scrutin-groups.mjs <numéro|id> […] [--compare local]");
    process.exit(2);
  }
  const cmpIdx = process.argv.indexOf("--compare");
  const cmpId = cmpIdx !== -1 ? process.argv[cmpIdx + 1] : null;
  // Libellés officiels -> codes de groupe utilisés localement.
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

  for (const id of ids) {
    const res = await anGroupVotes(id);
    console.log(`\n### scrutin ${res.scrutin} — ${res.groupes.length} groupes`);
    for (const g of res.groupes) {
      console.log(`  ${g.label.padEnd(46)} pour=${String(g.pour).padStart(3)} contre=${String(g.contre).padStart(3)} abst=${String(g.abstention).padStart(3)} nv=${String(g.nonvotant).padStart(2)}`);
    }
    console.log(`  ${"TOTAL".padEnd(46)} pour=${res.total.pour} contre=${res.total.contre} abst=${res.total.abstention} nv=${res.total.nonvotant}`);

    const syn = await anSynthese(id);
    const ok = syn.pour === res.total.pour && syn.contre === res.total.contre && syn.abstention === res.total.abstention;
    console.log(`  synthèse publiée : ${syn.pour}/${syn.contre}/${syn.abstention} (votants ${syn.votants}) => ${ok ? "cohérent" : "INCOHÉRENT"}`);

    if (cmpId) {
      const { groupVotes } = await import("./group-votes.mjs");
      const local = await groupVotes([`VTANR5L17V${res.scrutin}`]);
      const mine = local[`VTANR5L17V${res.scrutin}`];
      if (mine) {
        console.log("  écart avec notre jointure locale :");
        let ecarts = 0;
        for (const g of res.groupes) {
          const key = CODE[g.label] ?? g.label;
          const l = mine.positions.find((p) => p.group === key);
          if (!l) { console.log(`    ${g.label} : absent de la jointure locale`); ecarts++; continue; }
          const d = [l.counts.POUR - g.pour, l.counts.CONTRE - g.contre, l.counts.ABSTENTION - g.abstention];
          if (d.some((x) => x !== 0)) {
            console.log(`    ${g.label.padEnd(40)} local ${l.counts.POUR}/${l.counts.CONTRE}/${l.counts.ABSTENTION} vs AN ${g.pour}/${g.contre}/${g.abstention}`);
            ecarts++;
          }
        }
        if (!ecarts) console.log("    aucune divergence");
      }
    }
  }
}

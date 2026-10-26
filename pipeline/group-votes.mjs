// Agrège les votes d'un scrutin par groupe parlementaire, à partir de l'instantané épinglé.
//
// Usage : node pipeline/group-votes.mjs VTANR5L17V8427 [autres ids]
//
// Deux limites connues, documentées dans docs/PLAN.md §6.5 :
//   - deputes.json ne donne que le groupe ACTUEL, pas celui à la date du vote.
//   - les députés absents sont absents du fichier de votes : ils ne votent pas « contre ».
import { createInterface } from "node:readline";
import { createReadStream } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

// Au-delà de ce seuil des votants, la position du groupe est franche ; sinon « mitige ».
export const COHESION_THRESHOLD = 0.8;

export function deriveStance(c) {
  const voters = c.POUR + c.CONTRE + c.ABSTENTION; // les absents ne comptent pas
  if (voters === 0) return "non_aborde";
  // Abstention massive : le groupe ne se prononce pas. C'est une position, pas une fracture — la
  // compter comme « mitige » confondrait un groupe uni dans l'abstention avec un groupe divisé.
  if (c.ABSTENTION / voters >= 0.5 && c.ABSTENTION >= c.POUR && c.ABSTENTION >= c.CONTRE) {
    return "abstention";
  }
  if (c.POUR / voters >= COHESION_THRESHOLD) return "pour";
  if (c.CONTRE / voters >= COHESION_THRESHOLD) return "contre";
  return "mitige";
}

const RAW = path.resolve(".cache/raw");

export async function groupVotes(scrutinIds) {
  const wanted = new Set(scrutinIds);
  const deputes = JSON.parse(await readFile(path.join(RAW, "deputes.json"), "utf8"));
  const groupOf = new Map(deputes.map((d) => [d.slug, d.group_short || "(hors deputes.json)"]));

  const perScrutin = new Map();
  const rl = createInterface({ input: createReadStream(path.join(RAW, "votes_an.json")), crlfDelay: Infinity });

  for await (const raw of rl) {
    if (!scrutinIds.some((id) => raw.includes(id))) continue; // évite de parser 1,3 M de lignes
    const line = raw.trim().replace(/^\[/, "").replace(/[,\]]$/, "");
    if (!line) continue;
    const { scrutin_id, deputy_slug, position } = JSON.parse(line);
    if (!wanted.has(scrutin_id)) continue;
    const group = groupOf.get(deputy_slug) || "(hors deputes.json)";
    perScrutin.set(scrutin_id, perScrutin.get(scrutin_id) || new Map());
    const byGroup = perScrutin.get(scrutin_id);
    byGroup.set(group, byGroup.get(group) || { POUR: 0, CONTRE: 0, ABSTENTION: 0, NONVOTANT: 0 });
    byGroup.get(group)[position] = (byGroup.get(group)[position] || 0) + 1;
  }

  const out = {};
  for (const [id, byGroup] of perScrutin) {
    const positions = [...byGroup.entries()]
      .map(([group, c]) => ({ group, counts: c, stance: deriveStance(c) }))
      .sort((a, b) => a.group.localeCompare(b.group));
    const total = positions.reduce(
      (t, p) => {
        for (const k of Object.keys(t)) t[k] += p.counts[k];
        return t;
      },
      { POUR: 0, CONTRE: 0, ABSTENTION: 0, NONVOTANT: 0 },
    );
    out[id] = { positions, total };
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const ids = process.argv.slice(2);
  if (!ids.length) {
    console.error("usage: node pipeline/group-votes.mjs <scrutin_id> [autres...]");
    process.exit(2);
  }
  const res = await groupVotes(ids);
  for (const [id, { positions, total }] of Object.entries(res)) {
    console.log(`\n### ${id}`);
    for (const p of positions) {
      const c = p.counts;
      console.log(
        `  ${p.group.padEnd(10)} pour=${String(c.POUR).padStart(3)} contre=${String(c.CONTRE).padStart(3)}` +
          ` abst=${String(c.ABSTENTION).padStart(3)} nv=${String(c.NONVOTANT).padStart(2)}  -> ${p.stance}`,
      );
    }
    console.log(`  ${"TOTAL".padEnd(10)} pour=${total.POUR} contre=${total.CONTRE} abst=${total.ABSTENTION} nv=${total.NONVOTANT}`);
  }
}

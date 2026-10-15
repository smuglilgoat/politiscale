// Télécharge les jeux de données ouverts et épingle leurs empreintes SHA-256.
// Sans cet épinglage, une position publiée dépend de « ce que la source renvoie aujourd'hui ».
// Les fichiers restent dans .cache/ (non versionné) ; seul .cache/snapshot.json fait foi.
//
// nosparlementaires.fr publie aussi /opendata/manifest.json : utile pour recouper nos empreintes
// avec les leurs. Non fait ici, à ajouter si on veut une vérification croisée.
import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const RAW = path.resolve(".cache/raw");

const FILES = [
  { name: "scrutins_an.json", url: "https://nosparlementaires.fr/opendata/scrutins_an.json" },
  { name: "deputes.json", url: "https://nosparlementaires.fr/opendata/deputes.json" },
  {
    name: "votes_an.json.gz",
    url: "https://nosparlementaires.fr/opendata/votes_an.json.gz",
    expandTo: "votes_an.json",
  },
];

const sha256 = (b) => createHash("sha256").update(b).digest("hex");
const mo = (n) => `${(n / 1e6).toFixed(1)} Mo`;

await mkdir(RAW, { recursive: true });

const manifest = {
  fetched_at: new Date().toISOString(),
  source: "nosparlementaires.fr",
  upstream: "Assemblée nationale open data",
  licence: "Licence Ouverte 2.0 (Etalab)",
  files: [],
};

for (const f of FILES) {
  const dest = path.join(RAW, f.name);
  let buf;
  try {
    buf = await readFile(dest);
    console.log(`cache   ${f.name}`);
  } catch {
    const res = await fetch(f.url);
    if (!res.ok) throw new Error(`${f.url} -> HTTP ${res.status}`);
    buf = Buffer.from(await res.arrayBuffer());
    await writeFile(dest, buf);
    console.log(`fetch   ${f.name} (${mo(buf.byteLength)})`);
  }
  manifest.files.push({ name: f.name, url: f.url, bytes: buf.byteLength, sha256: sha256(buf) });

  if (f.expandTo) {
    const json = gunzipSync(buf);
    await writeFile(path.join(RAW, f.expandTo), json);
    manifest.files.push({
      name: f.expandTo,
      derived_from: f.name,
      bytes: json.byteLength,
      sha256: sha256(json),
    });
    console.log(`expand  ${f.name} -> ${f.expandTo} (${mo(json.byteLength)})`);
  }
}

await writeFile(path.resolve(".cache/snapshot.json"), JSON.stringify(manifest, null, 2) + "\n");
console.log(`\n${manifest.files.length} empreintes épinglées -> .cache/snapshot.json`);

import partiesJson from "../../content/parties.json";

// Le contenu est bundlé au build : aucune requête réseau, donc rien à charger à l'exécution.
const modules = import.meta.glob("../../content/questions/*.json", { eager: true });

export const parties = partiesJson;
export const partyBySlug = new Map(parties.map((p) => [p.slug, p]));

export const questions = Object.values(modules)
  .map((m) => m.default ?? m)
  .sort((a, b) => a.as_of.localeCompare(b.as_of) || a.id.localeCompare(b.id));

export const questionById = new Map(questions.map((q) => [q.id, q]));

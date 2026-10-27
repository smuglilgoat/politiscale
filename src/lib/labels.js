export const STANCE = {
  pour: "Pour",
  contre: "Contre",
  abstention: "Abstention",
  mitige: "Partagé",
  non_aborde: "Ne se prononce pas",
};

// D'où vient la citation. Affiché sur chaque position : une phrase prise dans un débat
// procédural n'a pas le même poids qu'une phrase sur le texte final.
export const ORIGIN = {
  texte_final: "Débat sur le texte final",
  motion_de_rejet: "Débat sur la motion de rejet",
  commission: "Commission",
  programme: "Programme",
  declaration: "Déclaration",
  presse: "Presse",
};

export const ETAT = {
  promulgue: "Promulgué",
  adopte: "Adopté",
  rejete: "Rejeté",
  en_navette: "En navette",
  censure_partiel: "Promulgué après censure partielle",
  inconnu: "Sort inconnu",
};

const ETAPE = {
  depot: "Dépôt",
  "1re_lecture_an": "1re lecture, Assemblée",
  ensemble_1re_lecture: "Vote en 1re lecture",
  ensemble_2e_lecture: "Vote en 2e lecture",
  lecture_definitive_an: "Lecture définitive, Assemblée",
  non_modelise: "Étape non modélisée",
  suite_inconnue: "Suite inconnue",
  lectures_anterieures: "Lectures antérieures",
  promulgation: "Promulgation",
};

export const etapeLabel = (e) => ETAPE[e] ?? e.replaceAll("_", " ");

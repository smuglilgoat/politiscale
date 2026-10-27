// Calcul des convergences. Module pur : aucun accès au DOM, donc testable directement.
//
// Règles (voir docs/PLAN.md §5) :
//   - choisir la position d'un groupe, c'est adopter SA position (pour/contre/abstention/partagé) ;
//   - un accord n'est « ferme » que si le groupe était cohésif sur ce vote ;
//   - sur un groupe scindé, l'accord est « partagé » et compté à part ;
//   - « ne se prononce pas » n'est ni un accord ni un désaccord ;
//   - « aucune de ces positions » n'accorde rien et est enregistré comme rejet.
export const COHESION_THRESHOLD = 0.8;

export function scrutinOf(position) {
  return position?.evidence?.find((e) => e.kind === "scrutin") ?? null;
}

export function votersOf(position) {
  const s = scrutinOf(position);
  if (!s) return 0;
  return s.pour + s.contre + s.abstention;
}

// Part du camp majoritaire parmi les votants. Les absents ne comptent pas.
export function cohesionOf(position) {
  const s = scrutinOf(position);
  const voters = votersOf(position);
  if (!s || voters === 0) return null;
  return Math.max(s.pour, s.contre, s.abstention) / voters;
}

export function isFirm(position) {
  const c = cohesionOf(position);
  return c !== null && c >= COHESION_THRESHOLD;
}

export function score(questions, answers, parties) {
  const tally = new Map(
    parties.map((p) => [
      p.slug,
      { code: p.slug, label: p.label, firm: 0, shared: 0, neutral: 0, disagreements: [] },
    ]),
  );

  let answered = 0;
  let skipped = 0;
  const rejected = [];

  for (const q of questions) {
    const a = answers[q.id];
    if (!a) continue;
    if (a.choice === "skip") {
      skipped++;
      continue;
    }
    answered++;
    if (a.choice === "aucune") {
      rejected.push({ id: q.id, titre: q.texte.titre });
      continue;
    }

    const chosen = q.positions.find((p) => p.group === a.choice);
    if (!chosen) continue;

    for (const pos of q.positions) {
      const t = tally.get(pos.group);
      if (!t) continue;
      if (pos.stance === "non_aborde") {
        t.neutral++;
        continue;
      }
      if (pos.stance === chosen.stance) {
        if (isFirm(pos)) t.firm++;
        else t.shared++;
      } else {
        t.disagreements.push({
          id: q.id,
          titre: q.texte.titre,
          votreChoix: chosen.group,
          votrePosition: chosen.stance,
          saPosition: pos.stance,
        });
      }
    }
  }

  const ranked = [...tally.values()].sort(
    (a, b) => b.firm - a.firm || b.shared - a.shared || a.disagreements.length - b.disagreements.length,
  );

  return { answered, skipped, rejected, ranked };
}

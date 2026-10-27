import { test } from "node:test";
import assert from "node:assert/strict";
import { cohesionOf, isFirm, score, COHESION_THRESHOLD } from "../src/lib/scoring.js";

const parties = [
  { slug: "AAA", label: "Groupe A" },
  { slug: "BBB", label: "Groupe B" },
  { slug: "CCC", label: "Groupe C" },
];

const pos = (group, stance, counts) => ({
  group,
  stance,
  evidence: [{ kind: "scrutin", chambre: "an", scrutin_id: "X", ...counts }],
});

const question = (id, positions) => ({
  id,
  texte: { titre: `Texte ${id}` },
  positions,
});

const Q1 = question("q1", [
  pos("AAA", "pour", { pour: 100, contre: 0, abstention: 0, nonvotant: 0 }), // cohésif
  pos("BBB", "contre", { pour: 0, contre: 80, abstention: 0, nonvotant: 0 }), // cohésif
  pos("CCC", "mitige", { pour: 5, contre: 5, abstention: 0, nonvotant: 0 }), // scindé
]);

test("cohésion : part du camp majoritaire parmi les votants", () => {
  assert.equal(cohesionOf(Q1.positions[0]), 1);
  assert.equal(cohesionOf(Q1.positions[2]), 0.5);
  assert.equal(COHESION_THRESHOLD, 0.8);
  assert.equal(isFirm(Q1.positions[0]), true);
  assert.equal(isFirm(Q1.positions[2]), false);
});

test("choisir une position cohésive donne un accord ferme aux groupes de même position", () => {
  const r = score([Q1], { q1: { choice: "AAA" } }, parties);
  const by = Object.fromEntries(r.ranked.map((x) => [x.code, x]));
  assert.equal(r.answered, 1);
  assert.equal(by.AAA.firm, 1);
  assert.equal(by.AAA.shared, 0);
  assert.equal(by.BBB.firm, 0);
  assert.equal(by.BBB.disagreements.length, 1);
  assert.equal(by.CCC.disagreements.length, 1);
});

test("un groupe scindé ne produit qu'un accord partagé", () => {
  const r = score([Q1], { q1: { choice: "CCC" } }, parties);
  const by = Object.fromEntries(r.ranked.map((x) => [x.code, x]));
  assert.equal(by.CCC.firm, 0);
  assert.equal(by.CCC.shared, 1);
});

test("« je ne me prononce pas » est exclu des réponses et n'accorde rien", () => {
  const r = score([Q1], { q1: { choice: "skip" } }, parties);
  assert.equal(r.answered, 0);
  assert.equal(r.skipped, 1);
  assert.equal(r.ranked.every((x) => x.firm === 0 && x.shared === 0), true);
});

test("« aucune de ces positions » est un rejet, pas un accord", () => {
  const r = score([Q1], { q1: { choice: "aucune" } }, parties);
  assert.equal(r.answered, 1);
  assert.equal(r.rejected.length, 1);
  assert.equal(r.ranked.every((x) => x.firm === 0 && x.shared === 0), true);
});

test("non_aborde est neutre : ni accord ni désaccord", () => {
  const q = question("q2", [
    pos("AAA", "pour", { pour: 10, contre: 0, abstention: 0, nonvotant: 0 }),
    pos("BBB", "non_aborde", { pour: 0, contre: 0, abstention: 0, nonvotant: 0 }),
  ]);
  const r = score([q], { q2: { choice: "AAA" } }, parties);
  const by = Object.fromEntries(r.ranked.map((x) => [x.code, x]));
  assert.equal(by.BBB.neutral, 1);
  assert.equal(by.BBB.disagreements.length, 0);
});

test("le classement met les accords fermes devant les accords partagés", () => {
  const r = score([Q1], { q1: { choice: "AAA" } }, parties);
  assert.equal(r.ranked[0].code, "AAA");
  assert.equal(r.ranked[0].firm, 1);
});

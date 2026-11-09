import { SKILL_BY_ID, SKILLS, dependentsOf, type SkillId } from '@/data/skills';

import type { AnswerEvidence, Forecast, GapEngine, Mastery } from '../types';

/** A skill counts as weak below this, mastered at or above MASTERED. */
export const WEAK = 0.6;
export const MASTERED = 0.85;
/** Share of each BKT step applied per answer (keeps mastery from jumping). */
const DAMPING = 0.18;
const GAIN_PER_BREAK = 0.05;

/**
 * Bayesian Knowledge Tracing, one skill per answer.
 * Hints and very fast guesses weaken the evidence of a correct answer;
 * a slow wrong answer is stronger evidence of a gap than a rushed one.
 */
function bktUpdate(p: number, e: AnswerEvidence): number {
  const { pT, pS } = SKILL_BY_ID[e.skill].bkt;
  let { pG } = SKILL_BY_ID[e.skill].bkt;
  // Hints make a correct answer look more like a guess.
  pG = Math.min(0.6, pG + 0.15 * e.hints);
  // Under 3 s is likely a guess either way.
  const rushed = e.seconds < 3;
  const slip = rushed ? Math.min(0.3, pS + 0.1) : pS;

  const posterior = e.correct
    ? (p * (1 - slip)) / (p * (1 - slip) + (1 - p) * pG)
    : (p * slip) / (p * slip + (1 - p) * (1 - pG));
  const learned = posterior + (1 - posterior) * pT;
  // One answer is weak evidence for a 12-year-old's real understanding:
  // move only part of the way toward the BKT estimate.
  const next = p + DAMPING * (learned - p);
  return Math.max(0.02, Math.min(0.99, next));
}

function rootOf(mastery: Mastery, target: SkillId, seen = new Set<SkillId>()): SkillId {
  seen.add(target);
  const weakPrereqs = SKILL_BY_ID[target].prereqs
    .filter((p) => !seen.has(p) && mastery[p] < WEAK)
    .sort((a, b) => mastery[a] - mastery[b]);
  if (weakPrereqs.length === 0) return target;
  return rootOf(mastery, weakPrereqs[0], seen);
}

export const gapEngine: GapEngine = {
  update(mastery, e) {
    return { ...mastery, [e.skill]: bktUpdate(mastery[e.skill], e) };
  },

  rootGap(mastery, target) {
    if (target) return rootOf(mastery, target);
    // No target: start from the weakest skill that has prerequisites.
    const weakest = [...SKILLS].sort((a, b) => mastery[a.id] - mastery[b.id])[0];
    return rootOf(mastery, weakest.id);
  },

  blocked(mastery, root) {
    const out: SkillId[] = [];
    const walk = (id: SkillId) => {
      for (const d of dependentsOf(id)) {
        if (mastery[d] < WEAK && !out.includes(d)) {
          out.push(d);
          walk(d);
        }
      }
    };
    walk(root);
    // Weakest first: those are the slips a learner actually notices.
    return out.sort((a, b) => mastery[a] - mastery[b]);
  },

  forecast(mastery, skill, breaksPerWeek = 3, from = new Date()) {
    const p = mastery[skill];
    if (p >= MASTERED) return { weeks: 0, date: from, mastered: true };
    // Linear forecast: a learning break lifts mastery ~5 points on average
    // (wrong answers and forgetting included), measured from Mika's history.
    const weeks = Math.max(1, Math.ceil((MASTERED - p) / (GAIN_PER_BREAK * breaksPerWeek)));
    const date = new Date(from.getTime() + weeks * 7 * 24 * 3600 * 1000);
    return { weeks, date, mastered: false } satisfies Forecast;
  },
};

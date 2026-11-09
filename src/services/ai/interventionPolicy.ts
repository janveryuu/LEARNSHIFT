import type { InterventionPolicy, NudgeAction, PolicyDecision, PolicyInput } from '../types';

/** Small seeded PRNG so a demo replays the same choices. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Beta(a, b) sample for integer-ish a, b: the a-th smallest of a+b-1 uniforms.
 * Plenty for a bandit with a handful of arms.
 */
function betaSample(a: number, b: number, rand: () => number): number {
  const n = Math.max(1, Math.round(a) + Math.round(b) - 1);
  const k = Math.max(1, Math.round(a));
  const u = Array.from({ length: n }, rand).sort((x, y) => x - y);
  return u[Math.min(n, k) - 1];
}

/**
 * Guardrails first, then Thompson sampling between the eligible arms using
 * the learner's past acceptance of each nudge type.
 */
export const interventionPolicy: InterventionPolicy = {
  next(input: PolicyInput): PolicyDecision {
    const skill = input.rootGap;
    const { risk } = input;
    if (input.paused) return { action: 'quiet', rule: 'paused', skill };
    if (input.focusing) return { action: 'quiet', rule: 'focus', skill };

    if (risk.lateNight) {
      // Night: never a quiz. Lock only if a guardian turned it on and risk is high.
      if (input.guardian.lockEnabled && risk.risk >= 0.85) return { action: 'lock', rule: 'lock-enabled', skill };
      return { action: 'winddown', rule: 'night-no-quiz', skill };
    }

    if (risk.risk < 0.35 && !input.gapDue) return { action: 'quiet', rule: 'low-risk', skill };

    const eligible: Exclude<NudgeAction, 'quiet' | 'lock' | 'winddown'>[] =
      risk.risk >= 0.66 || input.gapDue ? ['checkin', 'break'] : ['checkin'];

    const rand = mulberry32(input.seed);
    let best = eligible[0];
    let bestScore = -1;
    for (const arm of eligible) {
      const { a, b } = input.stats[arm];
      const score = betaSample(a, b, rand);
      if (score > bestScore) {
        best = arm;
        bestScore = score;
      }
    }
    return { action: best, rule: 'bandit', skill };
  },
};

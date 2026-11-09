import type { RiskLevel } from '@/design/tokens';

import type { RiskModel, RiskReason, RiskResult, UsageFeatures } from '../types';

const CATEGORY_WEIGHT: Record<UsageFeatures['category'], number> = {
  video: 0.7,
  social: 0.5,
  games: 0.6,
  other: 0.1,
  study: -1.4,
};

const sigmoid = (z: number) => 1 / (1 + Math.exp(-z));

/**
 * Weighted logistic over usage metadata. Mirrors the shape of the on-device
 * model: session length and bedtime dominate, everything else nudges.
 */
export const riskModel: RiskModel = {
  score(f: UsageFeatures): RiskResult {
    const hour = f.clock / 60;
    // Evening ramps up gently from 8 PM; inside bedtime it jumps.
    const evening = hour >= 20 ? (hour - 20) * 0.35 : 0;
    const z =
      -4.1 +
      0.052 * f.sessionMinutes +
      CATEGORY_WEIGHT[f.category] +
      (f.inBedtime ? 2.6 : evening) +
      (f.schoolDay ? 0.45 : 0) +
      0.045 * f.unlocksLastHour +
      0.012 * f.minutesSinceBreak;
    const risk = Math.max(0, Math.min(1, sigmoid(z)));
    const lateNight = f.inBedtime;

    const reasons: RiskReason[] = [];
    if (f.sessionMinutes >= 15) reasons.push({ key: 'minutes', value: Math.round(f.sessionMinutes) });
    if (f.category === 'video') reasons.push({ key: 'videos' });
    reasons.push(f.schoolDay ? { key: 'schoolDay' } : { key: 'weekend' });
    reasons.push({ key: 'clock', value: f.clock });
    if (f.inBedtime) reasons.push({ key: 'pastBedtime' });
    if (f.unlocksLastHour >= 12) reasons.push({ key: 'unlocks', value: f.unlocksLastHour });
    if (f.minutesSinceBreak >= 60) reasons.push({ key: 'noBreak', value: Math.round(f.minutesSinceBreak) });

    return { risk, lateNight, level: levelFor(risk, lateNight), reasons };
  },
};

export function levelFor(risk: number, lateNight: boolean): RiskLevel {
  if (lateNight) return 'winddown';
  if (risk >= 0.66) return 'shift';
  if (risk >= 0.4) return 'long';
  return 'calm';
}

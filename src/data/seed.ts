import type { LText } from '@/i18n/useT';
import type { RiskReason } from '@/services/types';

export type BuildingId =
  'bahay' | 'mango' | 'sarisari' | 'school' | 'garden' | 'carabao' | 'jeepney' | 'library' | 'terraces' | 'lighthouse';

export type Building = {
  id: BuildingId;
  name: LText;
  /** Lifetime coins needed to unlock. Coins are never spent. */
  unlockAt: number;
  earnedBy: LText;
  /** Grid cell on the isla (col, row), 0–6. */
  cell: [number, number];
};

export const BUILDINGS: Building[] = [
  {
    id: 'bahay',
    name: { en: 'Bahay kubo', fil: 'Bahay kubo' },
    unlockAt: 0,
    cell: [3, 3],
    earnedBy: { en: 'Your first day', fil: 'Unang araw mo' },
  },
  {
    id: 'mango',
    name: { en: 'Mango tree', fil: 'Puno ng mangga' },
    unlockAt: 100,
    cell: [2, 2],
    earnedBy: { en: '5 learning breaks', fil: '5 learning break' },
  },
  {
    id: 'sarisari',
    name: { en: 'Sari-sari store', fil: 'Sari-sari store' },
    unlockAt: 300,
    cell: [4, 2],
    earnedBy: { en: 'A week under the feed cap', fil: 'Isang linggong pasok sa limit' },
  },
  {
    id: 'school',
    name: { en: 'School', fil: 'Paaralan' },
    unlockAt: 500,
    cell: [1, 4],
    earnedBy: { en: 'Fractions up 10%', fil: 'Tumaas ng 10% ang Fractions' },
  },
  {
    id: 'garden',
    name: { en: 'Sampaguita garden', fil: 'Hardin ng sampaguita' },
    unlockAt: 800,
    cell: [4, 4],
    earnedBy: { en: '3 calm nights', fil: '3 kalmadong gabi' },
  },
  {
    id: 'carabao',
    name: { en: 'Carabao', fil: 'Kalabaw' },
    unlockAt: 1100,
    cell: [2, 5],
    earnedBy: { en: 'Quiz streak of 5', fil: '5 sunod-sunod na quiz' },
  },
  {
    id: 'jeepney',
    name: { en: 'Jeepney stop', fil: 'Sakayan ng jeep' },
    unlockAt: 1400,
    cell: [5, 3],
    earnedBy: { en: '2 weeks of breaks', fil: '2 linggong break' },
  },
  {
    id: 'library',
    name: { en: 'Library', fil: 'Aklatan' },
    unlockAt: 1800,
    cell: [3, 1],
    earnedBy: { en: 'Algebra unlocked', fil: 'Nabuksan ang Algebra' },
  },
  {
    id: 'terraces',
    name: { en: 'Rice terraces', fil: 'Hagdan-hagdang palayan' },
    unlockAt: 2400,
    cell: [1, 2],
    earnedBy: { en: 'A month of calm nights', fil: 'Isang buwang kalmadong gabi' },
  },
  {
    id: 'lighthouse',
    name: { en: 'Lighthouse', fil: 'Parola' },
    unlockAt: 3200,
    cell: [5, 5],
    earnedBy: { en: 'Every skill above 70%', fil: 'Lahat ng skill lampas 70%' },
  },
];

export const SEED_BUILT: BuildingId[] = ['bahay', 'mango', 'sarisari', 'school', 'garden'];

export type NudgeResponse = 'took' | 'snoozed' | 'followed' | 'locked' | 'requested' | 'quiet';
export type NudgeLevel = 'checkin' | 'break' | 'winddown' | 'lock';

export type NudgeEntry = {
  id: string;
  /** ISO timestamp. */
  at: string;
  level: NudgeLevel;
  reasons: RiskReason[];
  response: NudgeResponse;
};

const daysAgo = (d: number, h: number, m: number) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  t.setHours(h, m, 0, 0);
  return t.toISOString();
};

export function seedNudges(): NudgeEntry[] {
  return [
    {
      id: 'n-1',
      at: daysAgo(1, 21, 48),
      level: 'winddown',
      response: 'followed',
      reasons: [{ key: 'clock', value: 21 * 60 + 48 }, { key: 'schoolDay' }, { key: 'minutes', value: 24 }],
    },
    {
      id: 'n-2',
      at: daysAgo(1, 17, 12),
      level: 'break',
      response: 'took',
      reasons: [{ key: 'minutes', value: 52 }, { key: 'videos' }, { key: 'schoolDay' }],
    },
    {
      id: 'n-3',
      at: daysAgo(2, 15, 40),
      level: 'checkin',
      response: 'snoozed',
      reasons: [{ key: 'minutes', value: 41 }, { key: 'videos' }, { key: 'schoolDay' }],
    },
    {
      id: 'n-4',
      at: daysAgo(4, 23, 31),
      level: 'winddown',
      response: 'followed',
      reasons: [{ key: 'clock', value: 23 * 60 + 31 }, { key: 'pastBedtime' }, { key: 'minutes', value: 33 }],
    },
    {
      id: 'n-5',
      at: daysAgo(4, 18, 5),
      level: 'checkin',
      response: 'took',
      reasons: [{ key: 'minutes', value: 46 }, { key: 'videos' }, { key: 'unlocks', value: 14 }],
    },
  ];
}

/** Learning-day intensities, Jul → today, 22 weeks × 7 days (oldest first). */
export function seedHeatmap(weeks = 22, today = new Date()): number[] {
  const total = weeks * 7;
  // The last column ends on Saturday of this week; days after today are empty.
  const lastIndex = total - 1 - (6 - today.getDay());
  return Array.from({ length: total }, (_, i) => {
    if (i > lastIndex) return 0;
    const seed = Math.sin(i * 12.9898 + 4.1) * 43758.5453;
    const r = seed - Math.floor(seed);
    // Ramps up after LearnShift starts in early September (~week 9).
    if (i < 9 * 7) return r > 0.88 ? 1 : 0;
    const boost = (i - 63) / (lastIndex - 63);
    const v = r + boost * 0.35;
    return v > 1.05 ? 4 : v > 0.85 ? 3 : v > 0.66 ? 2 : v > 0.5 ? 1 : 0;
  });
}

/** Month labels for a heatmap ending this week. */
export function heatmapMonths(weeks: number, monthNames: readonly string[], today = new Date()) {
  const out: { week: number; label: string }[] = [];
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay()));
  let last = -1;
  for (let w = 0; w < weeks; w++) {
    const d = new Date(end);
    d.setDate(end.getDate() - (weeks - 1 - w) * 7 - 6);
    const m = d.getMonth();
    if (m !== last && d.getDate() <= 7) {
      out.push({ week: w, label: monthNames[m] });
      last = m;
    } else if (last === -1) {
      last = m;
    }
  }
  return out;
}

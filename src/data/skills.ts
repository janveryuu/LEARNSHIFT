import type { LText } from '@/i18n/useT';

export type SkillId =
  'integers' | 'fractions' | 'decimals' | 'ratio' | 'algebraic' | 'linear' | 'geometry' | 'measurement' | 'statistics';

export type Skill = {
  id: SkillId;
  name: LText;
  /** Three-letter column header for the teacher heatmap. */
  abbr: string;
  prereqs: SkillId[];
  /** Position on the skill map, 0–1 in both axes. */
  pos: { x: number; y: number };
  /** BKT parameters. */
  bkt: { pL0: number; pT: number; pS: number; pG: number };
};

const bkt = { pL0: 0.3, pT: 0.12, pS: 0.1, pG: 0.2 };

/** Grade 7 Mathematics (DepEd MATATAG-aligned strands), as a prerequisite graph. */
export const SKILLS: Skill[] = [
  {
    id: 'integers',
    name: { en: 'Integers', fil: 'Integers' },
    abbr: 'INT',
    prereqs: [],
    pos: { x: 0.22, y: 0.04 },
    bkt,
  },
  {
    id: 'geometry',
    name: { en: 'Geometry Basics', fil: 'Batayang Geometry' },
    abbr: 'GEO',
    prereqs: [],
    pos: { x: 0.8, y: 0.04 },
    bkt,
  },
  {
    id: 'fractions',
    name: { en: 'Fractions', fil: 'Fractions' },
    abbr: 'FRA',
    prereqs: ['integers'],
    pos: { x: 0.22, y: 0.31 },
    bkt,
  },
  {
    id: 'decimals',
    name: { en: 'Decimals', fil: 'Decimals' },
    abbr: 'DEC',
    prereqs: ['fractions'],
    pos: { x: 0.64, y: 0.31 },
    bkt,
  },
  {
    id: 'ratio',
    name: { en: 'Ratio & Proportion', fil: 'Ratio at Proporsyon' },
    abbr: 'RAT',
    prereqs: ['fractions'],
    pos: { x: 0.06, y: 0.6 },
    bkt,
  },
  {
    id: 'algebraic',
    name: { en: 'Algebraic Expressions', fil: 'Algebraic Expressions' },
    abbr: 'ALG',
    prereqs: ['integers', 'fractions'],
    pos: { x: 0.38, y: 0.6 },
    bkt,
  },
  {
    id: 'measurement',
    name: { en: 'Measurement', fil: 'Pagsukat' },
    abbr: 'MEA',
    prereqs: ['decimals', 'geometry'],
    pos: { x: 0.86, y: 0.6 },
    bkt,
  },
  {
    id: 'statistics',
    name: { en: 'Statistics', fil: 'Estadistika' },
    abbr: 'STA',
    prereqs: ['decimals', 'ratio'],
    pos: { x: 0.2, y: 0.9 },
    bkt,
  },
  {
    id: 'linear',
    name: { en: 'Linear Equations', fil: 'Linear Equations' },
    abbr: 'LIN',
    prereqs: ['algebraic', 'fractions'],
    pos: { x: 0.64, y: 0.9 },
    bkt,
  },
];

export const SKILL_BY_ID = Object.fromEntries(SKILLS.map((s) => [s.id, s])) as Record<SkillId, Skill>;

/** Skills that list `id` as a prerequisite. */
export function dependentsOf(id: SkillId): SkillId[] {
  return SKILLS.filter((s) => s.prereqs.includes(id)).map((s) => s.id);
}

/** Mika's starting mastery (probability of knowing each skill). */
export const MIKA_MASTERY: Record<SkillId, number> = {
  integers: 0.82,
  geometry: 0.74,
  fractions: 0.41,
  decimals: 0.63,
  ratio: 0.55,
  algebraic: 0.38,
  measurement: 0.66,
  statistics: 0.58,
  linear: 0.29,
};

/** Weekly mastery history (oldest first), ending one week before today. */
export const MIKA_HISTORY: Record<SkillId, number[]> = {
  integers: [0.7, 0.72, 0.75, 0.77, 0.8],
  geometry: [0.66, 0.68, 0.7, 0.71, 0.73],
  fractions: [0.24, 0.26, 0.29, 0.33, 0.37],
  decimals: [0.55, 0.57, 0.58, 0.6, 0.62],
  ratio: [0.48, 0.5, 0.51, 0.53, 0.54],
  algebraic: [0.3, 0.31, 0.33, 0.35, 0.37],
  measurement: [0.6, 0.61, 0.63, 0.64, 0.65],
  statistics: [0.5, 0.52, 0.54, 0.56, 0.57],
  linear: [0.22, 0.23, 0.25, 0.27, 0.28],
};

/** Short labels for tight spots (gap card, map nodes). */
export const SHORT: Record<SkillId, LText> = {
  integers: { en: 'Integers', fil: 'Integers' },
  geometry: { en: 'Geometry', fil: 'Geometry' },
  fractions: { en: 'Fractions', fil: 'Fractions' },
  decimals: { en: 'Decimals', fil: 'Decimals' },
  ratio: { en: 'Ratio', fil: 'Ratio' },
  algebraic: { en: 'Algebra', fil: 'Algebra' },
  measurement: { en: 'Measure', fil: 'Sukat' },
  statistics: { en: 'Statistics', fil: 'Estadistika' },
  linear: { en: 'Equations', fil: 'Equations' },
};

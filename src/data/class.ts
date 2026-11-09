import { mulberry32 } from '@/services/ai/interventionPolicy';

import { MIKA_MASTERY, SKILLS, type SkillId } from './skills';

export type Student = {
  id: string;
  name: string;
  mastery: Record<SkillId, number>;
  /** Average mastery change over the last 2 weeks (negative = dropping). */
  trend: number;
  /** Weekly average mastery, oldest first. */
  history: number[];
};

export type Section = { id: string; name: string; grade: number; students: Student[] };

const NAMES_A = [
  'Mika Santos',
  'Andrei Cruz',
  'Bea Lim',
  'Carlo Mendoza',
  'Dana Reyes',
  'Elijah Tan',
  'Faith Garcia',
  'Gabriel Dizon',
  'Hannah Villanueva',
  'Ivan Pascual',
  'Jasmine Aquino',
  'Kyle Bautista',
  'Lea Flores',
  'Marco Salazar',
  'Nina Quizon',
  'Oliver Estrada',
  'Pia Javier',
  'Rafael Katigbak',
  'Sofia Navarro',
  'Tristan Ocampo',
  'Uma Yap',
  'Vince Hernandez',
  'Wendy Zamora',
  'Xander Uy',
  'Yna Wenceslao',
  'Zoe Ignacio',
  'Bianca Ramos',
  'Paolo Manalo',
  'Kristine Abad',
  'Jerome Lacson',
  'Angela Torres',
  'Miguel Valdez',
];

const NAMES_B = [
  'Aira Bonifacio',
  'Ben Castillo',
  'Cielo Dela Rosa',
  'Darren Espino',
  'Ella Fajardo',
  'Franco Gomez',
  'Gia Hilario',
  'Harvey Ilagan',
  'Isla Jimenez',
  'Jace Lopez',
  'Kaye Macaraeg',
  'Luis Nepomuceno',
  'Mara Ortega',
  'Nico Panganiban',
  'Olivia Quintos',
  'Paul Rivera',
  'Queenie Sison',
  'Ralph Tolentino',
  'Sam Umali',
  'Tina Velasco',
  'Ulysses Yambao',
  'Vera Zaldivar',
  'Wil Abella',
  'Yuri Bernardo',
  'Zia Concepcion',
  'Arvin De Leon',
  'Bella Evangelista',
  'Chris Feliciano',
  'Dani Gatchalian',
  'Enzo Herrera',
];

const DIFFICULTY: Record<SkillId, number> = {
  integers: 0.06,
  geometry: 0.02,
  fractions: -0.1,
  decimals: -0.02,
  ratio: -0.04,
  algebraic: -0.1,
  measurement: 0,
  statistics: -0.04,
  linear: -0.16,
};

const clamp = (x: number) => Math.max(0.05, Math.min(0.97, x));

function buildSection(
  id: string,
  name: string,
  names: string[],
  seed: number,
  mika?: Record<SkillId, number>,
): Section {
  const rand = mulberry32(seed);
  const students = names.map((full, i): Student => {
    if (i === 0 && mika) {
      const avg = Object.values(mika).reduce((a, b) => a + b, 0) / SKILLS.length;
      return {
        id: 'mika',
        name: full,
        mastery: mika,
        trend: 0.04,
        history: [avg - 0.08, avg - 0.06, avg - 0.04, avg - 0.02, avg],
      };
    }
    const ability = 0.38 + rand() * 0.48;
    // About a third of the class shares the fractions root gap.
    const fractionsGap = rand() < 0.33;
    const mastery = {} as Record<SkillId, number>;
    for (const s of SKILLS) {
      let m = ability + DIFFICULTY[s.id] + (rand() - 0.5) * 0.18;
      if (fractionsGap && (s.id === 'fractions' || s.id === 'algebraic' || s.id === 'linear')) m -= 0.2;
      mastery[s.id] = clamp(m);
    }
    const trend = (rand() - 0.62) * 0.16;
    const avg = Object.values(mastery).reduce((a, b) => a + b, 0) / SKILLS.length;
    const history = [4, 3, 2, 1, 0].map((k) => clamp(avg - trend * k * 0.5 + (rand() - 0.5) * 0.02));
    return { id: `${id}-${i}`, name: full, mastery, trend, history };
  });
  return { id, name, grade: 8, students };
}

export function buildSections(mika: Record<SkillId, number> = MIKA_MASTERY): Section[] {
  return [
    buildSection('sampaguita', 'Sampaguita', NAMES_A, 2026, mika),
    buildSection('ilang-ilang', 'Ilang-Ilang', NAMES_B, 7),
  ];
}

export type SupportReason = { kind: 'root'; skill: SkillId } | { kind: 'dropping' } | { kind: 'low'; skill: SkillId };

/** The five students who most need a teacher's attention, with reasons. */
export function needsSupport(section: Section, rootOf: (m: Record<SkillId, number>) => SkillId) {
  return section.students
    .map((s) => {
      const avg = Object.values(s.mastery).reduce((a, b) => a + b, 0) / SKILLS.length;
      const reasons: SupportReason[] = [];
      const root = rootOf(s.mastery);
      if (s.mastery[root] < 0.5) reasons.push({ kind: 'root', skill: root });
      if (s.trend < -0.03) reasons.push({ kind: 'dropping' });
      const weakest = SKILLS.reduce((w, k) => (s.mastery[k.id] < s.mastery[w] ? k.id : w), SKILLS[0].id);
      if (reasons.length === 0) reasons.push({ kind: 'low', skill: weakest });
      const score = 1 - avg + (s.trend < 0 ? -s.trend * 3 : 0) + reasons.length * 0.05;
      return { student: s, reasons, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
}

export type ReviewItem = {
  id: string;
  student: string;
  questionId: string;
  wrongIndex: number;
  confidence: number;
};

/** Tutor answers the model was unsure about, waiting for the teacher. */
export const SEED_REVIEW: ReviewItem[] = [
  { id: 'rv-1', student: 'Kyle Bautista', questionId: 'rat-2', wrongIndex: 1, confidence: 0.52 },
  { id: 'rv-2', student: 'Pia Javier', questionId: 'fra-8', wrongIndex: 3, confidence: 0.58 },
  { id: 'rv-3', student: 'Tristan Ocampo', questionId: 'sta-1', wrongIndex: 1, confidence: 0.49 },
];

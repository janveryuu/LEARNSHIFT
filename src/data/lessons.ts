import type { LText } from '@/i18n/useT';

import type { SkillId } from './skills';

/** Declarative diagram specs, drawn by `components/learn/Diagram.tsx`. */
export type DiagramSpec =
  | { kind: 'bar'; parts: number; filled: number }
  | { kind: 'bars'; rows: { parts: number; filled: number; label: string }[] }
  | { kind: 'sum'; parts: number; a: number; b: number; label: string }
  | { kind: 'pie'; parts: number; filled: number }
  | { kind: 'numberline'; from: number; to: number; start: number; jump: number }
  | { kind: 'balance'; left: string; right: string }
  | { kind: 'tiles'; x: number; ones: number }
  | { kind: 'ratio'; a: number; b: number }
  | { kind: 'triangle' }
  | { kind: 'grid'; w: number; h: number };

export type Concept = { text: LText; diagram: DiagramSpec };

export type Lesson = {
  id: SkillId;
  concepts: Concept[];
  /** Two question ids asked after the concepts. */
  questions: [string, string];
};

export const LESSONS: Partial<Record<SkillId, Lesson>> = {
  fractions: {
    id: 'fractions',
    concepts: [
      {
        text: {
          en: 'A fraction is part of a whole. 3/4 is 3 of 4 equal parts.',
          fil: 'Bahagi ng buo ang fraction. Ang 3/4 ay 3 sa 4 na pantay na bahagi.',
        },
        diagram: { kind: 'bar', parts: 4, filled: 3 },
      },
      {
        text: {
          en: 'To add, pieces must match. 1/2 is the same as 3/6.',
          fil: 'Para pagsamahin, dapat magtugma ang piraso. Ang 1/2 ay katulad ng 3/6.',
        },
        diagram: {
          kind: 'bars',
          rows: [
            { parts: 2, filled: 1, label: '1/2' },
            { parts: 6, filled: 3, label: '3/6' },
          ],
        },
      },
      {
        text: {
          en: '1/2 + 1/3 = 3/6 + 2/6 = 5/6. Add tops, keep the bottom.',
          fil: '1/2 + 1/3 = 3/6 + 2/6 = 5/6. Itaas ang pagsamahin, ibaba ay panatilihin.',
        },
        diagram: { kind: 'sum', parts: 6, a: 3, b: 2, label: '5/6' },
      },
    ],
    questions: ['fra-3', 'fra-4'],
  },
  algebraic: {
    id: 'algebraic',
    concepts: [
      {
        text: {
          en: 'x is a box holding a number you don’t know yet.',
          fil: 'Ang x ay kahong may numerong hindi pa alam.',
        },
        diagram: { kind: 'tiles', x: 1, ones: 0 },
      },
      {
        text: { en: 'Like terms join: 3x + 2x = 5x.', fil: 'Nagsasama ang magkatulad: 3x + 2x = 5x.' },
        diagram: { kind: 'tiles', x: 5, ones: 0 },
      },
      {
        text: { en: 'x’s and plain numbers stay apart: 3x + 2.', fil: 'Hiwalay ang x at numero lang: 3x + 2.' },
        diagram: { kind: 'tiles', x: 3, ones: 2 },
      },
    ],
    questions: ['alg-2', 'alg-3'],
  },
  linear: {
    id: 'linear',
    concepts: [
      {
        text: {
          en: 'An equation is a balance. Both sides weigh the same.',
          fil: 'Timbangan ang equation. Pareho ang bigat ng magkabila.',
        },
        diagram: { kind: 'balance', left: 'x + 5', right: '12' },
      },
      {
        text: {
          en: 'Do the same to both sides. Take 5 from each.',
          fil: 'Gawin ang pareho sa magkabila. Bawasan ng 5 ang bawat isa.',
        },
        diagram: { kind: 'balance', left: 'x', right: '7' },
      },
      {
        text: { en: 'Undo ÷ with ×. x/3 = 4 means x = 12.', fil: 'I-undo ang ÷ gamit ang ×. Kung x/3 = 4, x = 12.' },
        diagram: { kind: 'balance', left: 'x/3', right: '4' },
      },
    ],
    questions: ['lin-1', 'lin-3'],
  },
  integers: {
    id: 'integers',
    concepts: [
      {
        text: { en: 'Negatives live left of zero.', fil: 'Nasa kaliwa ng zero ang mga negative.' },
        diagram: { kind: 'numberline', from: -5, to: 5, start: -3, jump: 0 },
      },
      {
        text: { en: 'Adding walks right. −3 + 7 lands on 4.', fil: 'Pakanan ang plus. Ang −3 + 7 ay 4.' },
        diagram: { kind: 'numberline', from: -4, to: 5, start: -3, jump: 7 },
      },
      {
        text: {
          en: 'Minus a negative turns around: 5 − (−2) = 7.',
          fil: 'Umiikot ang minus ng negative: 5 − (−2) = 7.',
        },
        diagram: { kind: 'numberline', from: 0, to: 8, start: 5, jump: 2 },
      },
    ],
    questions: ['int-1', 'int-2'],
  },
};

/** Lessons fall back to fractions for skills without a hand-written break. */
export function lessonFor(skill: SkillId): Lesson {
  return LESSONS[skill] ?? (LESSONS.fractions as Lesson);
}

export type FeedCard = {
  id: string;
  skill: SkillId;
  title: LText;
  diagram: DiagramSpec;
  tryIt: { prompt: string; options: [string, string]; answer: 0 | 1 };
  /** Seconds this card takes to watch. */
  seconds: number;
};

export const FEED: FeedCard[] = [
  {
    id: 'feed-1',
    skill: 'fractions',
    seconds: 30,
    title: { en: 'Bigger bottom, smaller slice.', fil: 'Mas malaking ibaba, mas maliit na hiwa.' },
    diagram: { kind: 'pie', parts: 5, filled: 1 },
    tryIt: { prompt: '1/3 or 1/5?', options: ['1/3', '1/5'], answer: 0 },
  },
  {
    id: 'feed-2',
    skill: 'fractions',
    seconds: 35,
    title: {
      en: 'Halves and quarters add once they match.',
      fil: 'Napagsasama ang halves at quarters kapag nagtugma.',
    },
    diagram: {
      kind: 'bars',
      rows: [
        { parts: 2, filled: 1, label: '1/2' },
        { parts: 4, filled: 2, label: '2/4' },
      ],
    },
    tryIt: { prompt: '1/2 = ?/4', options: ['2', '1'], answer: 0 },
  },
  {
    id: 'feed-3',
    skill: 'integers',
    seconds: 25,
    title: { en: 'Minus a negative walks right.', fil: 'Pakanan ang minus ng negative.' },
    diagram: { kind: 'numberline', from: 0, to: 7, start: 4, jump: 1 },
    tryIt: { prompt: '4 − (−1)', options: ['3', '5'], answer: 1 },
  },
  {
    id: 'feed-4',
    skill: 'algebraic',
    seconds: 30,
    title: { en: '3x + 2x = 5x. Like 3 mangoes + 2 mangoes.', fil: '3x + 2x = 5x. Parang 3 mangga + 2 mangga.' },
    diagram: { kind: 'tiles', x: 5, ones: 0 },
    tryIt: { prompt: 'x + x + x', options: ['3x', 'x³'], answer: 0 },
  },
  {
    id: 'feed-5',
    skill: 'ratio',
    seconds: 25,
    title: { en: 'Rice to water, 1 : 2. Order matters.', fil: 'Bigas sa tubig, 1 : 2. Mahalaga ang ayos.' },
    diagram: { kind: 'ratio', a: 1, b: 2 },
    tryIt: { prompt: '2 cups rice → water?', options: ['4 cups', '1 cup'], answer: 0 },
  },
  {
    id: 'feed-6',
    skill: 'geometry',
    seconds: 30,
    title: { en: 'A triangle’s angles always make 180°.', fil: 'Laging 180° ang anggulo ng tatsulok.' },
    diagram: { kind: 'triangle' },
    tryIt: { prompt: '60° + 60° + ?', options: ['90°', '60°'], answer: 1 },
  },
  {
    id: 'feed-7',
    skill: 'linear',
    seconds: 35,
    title: { en: 'Do the same to both sides.', fil: 'Gawin ang pareho sa magkabila.' },
    diagram: { kind: 'balance', left: 'x + 2', right: '5' },
    tryIt: { prompt: 'x + 2 = 5', options: ['3', '7'], answer: 0 },
  },
  {
    id: 'feed-8',
    skill: 'measurement',
    seconds: 25,
    title: { en: 'Area counts the squares inside.', fil: 'Binibilang ng area ang parisukat sa loob.' },
    diagram: { kind: 'grid', w: 4, h: 3 },
    tryIt: { prompt: '4 × 3 area', options: ['12', '14'], answer: 0 },
  },
];

export const OFFLINE_PACKS: { skill: SkillId; mb: number; lessons: number }[] = [
  { skill: 'fractions', mb: 4.2, lessons: 12 },
  { skill: 'algebraic', mb: 3.6, lessons: 10 },
  { skill: 'linear', mb: 3.9, lessons: 11 },
  { skill: 'integers', mb: 2.8, lessons: 8 },
  { skill: 'decimals', mb: 2.5, lessons: 8 },
  { skill: 'ratio', mb: 2.2, lessons: 7 },
  { skill: 'geometry', mb: 5.1, lessons: 9 },
  { skill: 'statistics', mb: 2.4, lessons: 6 },
];

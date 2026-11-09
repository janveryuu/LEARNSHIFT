import { QUESTION_BY_ID } from '@/data/questions';
import { TUTOR_BANK } from '@/data/tutorBank';

import type { Lang } from '@/store/useAppStore';

import type { Tutor, TutorAnswer, TutorVariant } from '../types';

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a));
const simplify = (n: number, d: number) => {
  const g = gcd(n, d) || 1;
  return `${n / g}/${d / g}`;
};

/**
 * For "a/b ± c/d" questions, write the steps with the learner's own numbers,
 * so the explanation is about this exact question, not a generic one.
 */
function fractionSteps(prompt: string, wrong: string, lang: Lang) {
  const m = prompt.match(/^(\d+)\/(\d+)\s*([+−-])\s*(\d+)\/(\d+)/);
  if (!m) return null;
  const [a, b, c, d] = [m[1], m[2], m[4], m[5]].map(Number);
  const op = m[3] === '+' ? '+' : '−';
  const l = (b * d) / gcd(b, d);
  const A = a * (l / b);
  const C = c * (l / d);
  const top = op === '+' ? A + C : A - C;
  const res = simplify(top, l);
  const sameBottom = b === d;
  if (lang === 'fil') {
    return {
      what: sameBottom
        ? `Ang sagot mo ay ${wrong}. Itaas lang ang dapat galawin.`
        : `Ang sagot mo ay ${wrong}: pinagsama mo ang itaas at ang ibaba.`,
      steps: [
        sameBottom
          ? `Parehong ${b} ang ibaba, kaya magkasinlaki na ang piraso.`
          : `Ang ibaba ay laki ng piraso. Hindi pa magkasinlaki ang /${b} at /${d}.`,
        sameBottom ? `Panatilihin ang ${b} sa ibaba.` : `Gawing /${l}: ${a}/${b} = ${A}/${l} at ${c}/${d} = ${C}/${l}.`,
        `Itaas lang: ${A}/${l} ${op} ${C}/${l} = ${top}/${l}${`${top}/${l}` !== res ? ` = ${res}` : ''}.`,
      ],
    };
  }
  return {
    what: sameBottom
      ? `You answered ${wrong}. Only the tops should change.`
      : `You answered ${wrong}: you ${op === '+' ? 'added' : 'subtracted'} the tops and the bottoms.`,
    steps: [
      sameBottom
        ? `Both bottoms are ${b}, so the pieces already match.`
        : `The bottom is the piece size. /${b} and /${d} pieces aren’t the same size yet.`,
      sameBottom ? `Keep the ${b} on the bottom.` : `Make them match: ${a}/${b} = ${A}/${l} and ${c}/${d} = ${C}/${l}.`,
      `Now only the tops: ${A}/${l} ${op} ${C}/${l} = ${top}/${l}${`${top}/${l}` !== res ? ` = ${res}` : ''}.`,
    ],
  };
}

/**
 * Grounded tutor. Retrieves the vetted explanation for the misconception
 * behind the learner's exact wrong answer. If the wrong answer maps to no
 * known misconception, it answers from the question's hint with low
 * confidence, which flags it for the teacher's review queue.
 */
export const tutor: Tutor = {
  async explain(questionId, wrongIndex, lang, variant: TutorVariant = 'default') {
    // Simulated model latency so the typing shimmer has something to cover.
    await wait(400 + ((questionId.length * 97 + wrongIndex * 131) % 500));
    const q = QUESTION_BY_ID[questionId];
    const mis = q?.mis[wrongIndex] ?? 'unknown';

    if (!q || mis === 'unknown') {
      const hint = q ? q.hint[lang] : '';
      const right = q ? q.options[q.answer] : '';
      const answer: TutorAnswer = {
        misconception: 'unknown',
        what: lang === 'fil' ? `Malapit ka. Ang tamang sagot ay ${right}.` : `Close. The right answer is ${right}.`,
        steps: [hint, lang === 'fil' ? 'Subukan ulit nang dahan-dahan.' : 'Try it again slowly.'],
        example: '',
        check: null,
        confidence: 0.55,
        source: 'generated',
      };
      return answer;
    }

    const e = TUTOR_BANK[mis];
    const own =
      variant !== 'simpler' && (mis === 'frac-add-across' || mis === 'frac-no-common')
        ? fractionSteps(q.prompt.en, q.options[wrongIndex], lang)
        : null;
    const steps = own ? own.steps : variant === 'simpler' ? e.simpler.map((s) => s[lang]) : e.steps.map((s) => s[lang]);
    return {
      misconception: mis,
      what: own ? own.what : e.what[lang],
      steps,
      example: variant === 'example2' ? e.example2[lang] : e.example[lang],
      check: e.check,
      confidence: 0.93,
      source: 'bank',
    } satisfies TutorAnswer;
  },
};

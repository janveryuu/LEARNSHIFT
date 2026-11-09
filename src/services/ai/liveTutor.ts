/**
 * The tutor the app uses. Known mistakes come from the teacher-vetted bank
 * (instant, works offline). New mistakes go to Gemini through the `tutor`
 * edge function, which checks the math and queues unsure answers for the
 * teacher. Offline or rate-limited: a careful hint, flagged for review.
 */
import { QUESTION_BY_ID } from '@/data/questions';
import { IS_PITCH } from '@/lib/config';
import { tutorChat, tutorExplain } from '@/services/backend/api';
import { useAppStore, type Lang } from '@/store/useAppStore';

import type { TutorAnswer, TutorVariant } from '../types';
import { tutor } from './tutor';

export type LiveAnswer = TutorAnswer & { review: boolean; offline?: boolean };

export async function explain(questionId: string, wrongIndex: number, lang: Lang, variant: TutorVariant): Promise<LiveAnswer> {
  const q = QUESTION_BY_ID[questionId];
  const mis = q?.mis[wrongIndex];
  const known = !!mis && mis !== 'unknown';
  if (IS_PITCH || known || !q) {
    const a = await tutor.explain(questionId, wrongIndex, lang, variant);
    return { ...a, review: a.confidence < 0.7 };
  }
  try {
    return await tutorExplain(questionId, wrongIndex, lang, variant);
  } catch {
    const a = await tutor.explain(questionId, wrongIndex, lang, variant);
    // Let the teacher see what the student got while the AI was unreachable.
    useAppStore.getState().flag(
      { student: useAppStore.getState().studentName, questionId, wrongIndex, confidence: a.confidence },
      {
        question_id: questionId,
        wrong_index: wrongIndex,
        lang,
        misconception: a.misconception,
        content: { what: a.what, steps: a.steps, problems: ['AI unreachable; hint shown instead'] },
        confidence: a.confidence,
      },
    );
    return { ...a, source: 'bank', review: true, offline: true };
  }
}

export async function chat(
  questionId: string | null,
  lang: Lang,
  history: { me: string; reply: string }[],
  message: string,
  fallback: string,
): Promise<string> {
  if (IS_PITCH) return fallback;
  try {
    return await tutorChat(questionId, lang, history, message);
  } catch {
    return fallback;
  }
}

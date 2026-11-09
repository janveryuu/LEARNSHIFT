// Gemini tutor. Two modes:
//   explain: { mode: 'explain', questionId, wrongIndex, lang, variant }
//   chat:    { mode: 'chat', questionId?, lang, history, message }
// Explanations are checked against the real answer; anything that fails the
// check is saved for the student's teacher to review.
import { admin, HttpError, json, rateTake, requireUser, serve } from '../_shared/server.ts';
import {
  chatPrompt,
  gemini,
  parseTutor,
  QUESTIONS,
  tutorPrompt,
  verify,
  type Lang,
  type Variant,
} from '../_shared/tutor-core.ts';

const KEY = Deno.env.get('GEMINI_API_KEY') ?? '';
const MODELS = (Deno.env.get('GEMINI_MODELS') ?? 'gemini-3.5-flash,gemini-3.5-flash-lite').split(',').map((s) => s.trim());

/** Tries each model in order; overloaded or rate-limited models fall through. */
async function ask(prompt: string, asJson: boolean): Promise<{ text: string; model: string }> {
  let last: unknown;
  for (const model of MODELS) {
    try {
      return { text: await gemini(KEY, model, prompt, asJson, 25000), model };
    } catch (e) {
      last = e;
      console.warn(`${model} failed: ${(e as Error).message.slice(0, 160)}`);
    }
  }
  throw last ?? new Error('No model available');
}

serve(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  const lang: Lang = body.lang === 'fil' ? 'fil' : 'en';

  if (body.mode === 'chat') {
    const message = String(body.message ?? '').slice(0, 400).trim();
    if (!message) throw new HttpError(400, 'Empty message');
    if (!(await rateTake(user.id, 'tutor-chat', 30, 3600))) throw new HttpError(429, 'Tarsi needs a short rest. Try again later.');
    const q = body.questionId ? (QUESTIONS[body.questionId] ?? null) : null;
    const history = Array.isArray(body.history)
      ? body.history.slice(-4).map((h: { me?: string; reply?: string }) => ({
          me: String(h.me ?? '').slice(0, 400),
          reply: String(h.reply ?? '').slice(0, 600),
        }))
      : [];
    const { text, model } = await ask(chatPrompt(q, lang, history, message), false);
    return json({ reply: text.slice(0, 600), model });
  }

  const q = QUESTIONS[String(body.questionId ?? '')];
  const wrongIndex = Number(body.wrongIndex);
  if (!q || !Number.isInteger(wrongIndex) || wrongIndex < 0 || wrongIndex >= q.options.length || wrongIndex === q.answer)
    throw new HttpError(400, 'Unknown question');
  const variant: Variant = ['simpler', 'example2'].includes(body.variant) ? body.variant : 'default';
  if (!(await rateTake(user.id, 'tutor', 40, 3600))) throw new HttpError(429, 'Tarsi needs a short rest. Try again later.');

  const { text, model } = await ask(tutorPrompt(q, wrongIndex, lang, variant), true);
  const out = parseTutor(text);
  const { confidence, problems } = verify(q, out);
  const status = confidence < 0.7 ? 'needs_review' : 'auto';
  const answer = {
    misconception: q.mis[wrongIndex] ?? 'unknown',
    what: out.what,
    steps: out.steps,
    example: out.example,
    check: out.check,
    confidence,
    source: 'generated' as const,
  };

  const { data: row, error } = await admin
    .from('tutor_answers')
    .insert({
      student_id: user.id,
      question_id: body.questionId,
      wrong_index: wrongIndex,
      lang,
      misconception: answer.misconception,
      content: { ...answer, problems },
      confidence,
      source: 'generated',
      model,
      status,
    })
    .select('id')
    .single();
  if (error) console.error('save failed', error);

  return json({ ...answer, id: row?.id ?? null, review: status === 'needs_review', model });
});

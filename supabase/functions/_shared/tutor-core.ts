// Gemini tutor core. Plain TypeScript (no Deno APIs) so the same code runs in
// the edge function and in the local benchmark script.
import content from './content.json' with { type: 'json' };

export type Lang = 'en' | 'fil';
export type Variant = 'default' | 'simpler' | 'example2';
export type LText = { en: string; fil: string };
export type Question = {
  skill: string;
  prompt: LText;
  options: string[];
  answer: number;
  hint: LText;
  mis: Record<string, string>;
};

export const QUESTIONS = content.questions as unknown as Record<string, Question>;
export const SKILL_NAMES = content.skills as unknown as Record<string, LText>;

export type TutorOut = {
  what: string;
  steps: string[];
  example: string;
  check: { prompt: string; options: string[]; answer: number } | null;
  final_answer: string;
};

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    what: { type: 'STRING', description: 'One sentence naming the exact mistake behind the wrong answer.' },
    steps: { type: 'ARRAY', items: { type: 'STRING' }, description: '2 to 4 short steps using the question numbers.' },
    example: { type: 'STRING', description: 'One similar worked example, one line.' },
    check: {
      type: 'OBJECT',
      properties: {
        prompt: { type: 'STRING' },
        options: { type: 'ARRAY', items: { type: 'STRING' } },
        answer: { type: 'INTEGER', description: '0-based index of the correct option.' },
      },
      required: ['prompt', 'options', 'answer'],
    },
    final_answer: { type: 'STRING', description: 'The correct answer to the original question, exactly as written in the options.' },
  },
  required: ['what', 'steps', 'example', 'check', 'final_answer'],
};

const LANG_RULE: Record<Lang, string> = {
  en: 'Write in simple English for a 13-year-old.',
  fil: 'Write in natural, simple Filipino (Tagalog) for a 13-year-old Filipino student. Keep math terms that Filipino classes use in English, like "fraction", "denominator", "equation". Do not use deep or formal Tagalog.',
};

export function tutorPrompt(q: Question, wrongIndex: number, lang: Lang, variant: Variant) {
  const style =
    variant === 'simpler'
      ? 'The student did not understand the first explanation. Use even shorter sentences and an everyday Filipino example (food, money, jeepney fare).'
      : variant === 'example2'
        ? 'Give a different worked example than the obvious one.'
        : '';
  return [
    'You are Tarsi, a kind math tutor in a learning app for Grade 7 to 10 students in the Philippines.',
    'A student answered a multiple-choice question wrong. Explain the exact mistake they likely made, then how to get the right answer.',
    'Rules: be warm and brief, never shame the student, no emojis, no markdown, each step under 25 words, use the numbers from this question.',
    'The check question must be a NEW short multiple-choice question (2 to 4 options) on the same idea, with exactly one correct option.',
    LANG_RULE[lang],
    style,
    '',
    `Question: ${q.prompt.en}`,
    `Options: ${q.options.map((o, i) => `${i + 1}) ${o}`).join('  ')}`,
    `Correct answer: ${q.options[q.answer]}`,
    `Student chose: ${q.options[wrongIndex]}`,
    `Teacher hint: ${q.hint.en}`,
  ]
    .filter(Boolean)
    .join('\n');
}

export function chatPrompt(q: Question | null, lang: Lang, history: { me: string; reply: string }[], message: string) {
  return [
    'You are Tarsi, a kind math tutor for Grade 7 to 10 students in the Philippines.',
    'Answer the student in at most 3 short sentences. Stay on math and studying. If they ask about anything unsafe or unrelated, gently steer back to the lesson.',
    'Never give personal opinions, never ask for personal information, no emojis, no markdown.',
    `Reply in the language the student writes in (English, Filipino or Taglish). If unsure: ${LANG_RULE[lang]}`,
    q ? `They are working on: ${q.prompt.en} (correct answer: ${q.options[q.answer]}).` : '',
    ...history.slice(-4).flatMap((h) => [`Student: ${h.me}`, `Tarsi: ${h.reply}`]),
    `Student: ${message}`,
    'Tarsi:',
  ]
    .filter(Boolean)
    .join('\n');
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[−–]/g, '-')
    .replace(/\s+/g, '')
    .replace(/^x=/, '');

/**
 * Confidence from checking the math, not from the model's own opinion:
 * the explanation must land on the real answer, and the check question must
 * be well formed.
 */
export function verify(q: Question, out: TutorOut): { confidence: number; problems: string[] } {
  const problems: string[] = [];
  const right = norm(q.options[q.answer]);
  if (norm(out.final_answer) !== right) problems.push(`final answer "${out.final_answer}" ≠ "${q.options[q.answer]}"`);
  const lastStep = out.steps[out.steps.length - 1] ?? '';
  if (!norm(lastStep).includes(right) && !norm(out.what).includes(right)) problems.push('steps never reach the answer');
  if (out.steps.length < 2 || out.steps.length > 5) problems.push('step count');
  const c = out.check;
  if (!c || c.options.length < 2 || c.options.length > 4 || c.answer < 0 || c.answer >= c.options.length)
    problems.push('bad check question');
  else if (new Set(c.options.map(norm)).size !== c.options.length) problems.push('duplicate check options');
  const confidence = problems.length === 0 ? 0.9 : problems.length === 1 && problems[0] === 'steps never reach the answer' ? 0.72 : 0.45;
  return { confidence, problems };
}

export async function gemini(
  apiKey: string,
  model: string,
  prompt: string,
  json: boolean,
  timeoutMs = 20000,
  thinking: 'minimal' | 'low' | null = json ? 'low' : 'minimal',
): Promise<string> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          ...(json
            ? { temperature: 0.3, responseMimeType: 'application/json', responseSchema: SCHEMA, maxOutputTokens: 4096 }
            : { temperature: 0.5, maxOutputTokens: 1024 }),
          // Thinking tokens count toward maxOutputTokens; keep them small.
          ...(thinking ? { thinkingConfig: { thinkingLevel: thinking } } : {}),
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_LOW_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_LOW_AND_ABOVE' },
        ],
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      // Some models don't accept a thinking level: retry once without it.
      if (res.status === 400 && thinking && /thinking/i.test(err)) {
        clearTimeout(t);
        return gemini(apiKey, model, prompt, json, timeoutMs, null);
      }
      throw new Error(`Gemini ${res.status}: ${err.slice(0, 300)}`);
    }
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts
      ?.map((p: { text?: string }) => p.text ?? '')
      .join('');
    if (!text) throw new Error(`Gemini returned no text (${data?.candidates?.[0]?.finishReason ?? 'unknown'})`);
    return text.trim();
  } finally {
    clearTimeout(t);
  }
}

export function parseTutor(text: string): TutorOut {
  const o = JSON.parse(text.replace(/^```(json)?|```$/g, ''));
  return {
    what: String(o.what ?? ''),
    steps: Array.isArray(o.steps) ? o.steps.map(String).slice(0, 5) : [],
    example: String(o.example ?? ''),
    check: o.check
      ? { prompt: String(o.check.prompt), options: (o.check.options ?? []).map(String), answer: Number(o.check.answer) }
      : null,
    final_answer: String(o.final_answer ?? ''),
  };
}

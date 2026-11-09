// Compares Gemini models on wrong answers the tutor bank does not cover.
//   GEMINI_API_KEY=... node scripts/bench-gemini.ts
import { gemini, parseTutor, QUESTIONS, tutorPrompt, verify, type Lang } from '../supabase/functions/_shared/tutor-core.ts';

const key = process.env.GEMINI_API_KEY!;
const models = (process.env.MODELS ?? 'gemini-3.8-flash,gemini-3.5-flash').split(',');
const cases: [string, number][] = [];
for (const [id, q] of Object.entries(QUESTIONS))
  for (let i = 0; i < q.options.length; i++) if (i !== q.answer && (!q.mis[i] || q.mis[i] === 'unknown')) cases.push([id, i]);
const pick = cases.filter((_, i) => i % Math.ceil(cases.length / 8) === 0).slice(0, 8);
console.log(`${cases.length} uncovered wrong answers; testing ${pick.length} × en/fil`);

for (const model of models) {
  let ok = 0, n = 0, ms = 0, errs = 0;
  const notes: string[] = [];
  for (const [id, wrong] of pick)
    for (const lang of ['en', 'fil'] as Lang[]) {
      n++;
      const q = QUESTIONS[id];
      const t0 = Date.now();
      try {
        const out = parseTutor(await gemini(key, model, tutorPrompt(q, wrong, lang, 'default'), true, 45000));
        ms += Date.now() - t0;
        const v = verify(q, out);
        if (v.confidence >= 0.7) ok++;
        else notes.push(`${id}/${lang}: ${v.problems.join('; ')}`);
        if (n === 2) console.log(`  sample ${model} ${id} fil:`, JSON.stringify(out).slice(0, 420));
      } catch (e) {
        errs++;
        notes.push(`${id}/${lang}: ERROR ${(e as Error).message.slice(0, 120)}`);
      }
    }
  console.log(`${model}: verified ${ok}/${n}, errors ${errs}, avg ${Math.round(ms / Math.max(1, n - errs))} ms`);
  for (const x of notes) console.log('   -', x);
}

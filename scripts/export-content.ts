// Copies the bundled question bank into the edge functions, so the server
// tutor grades and explains exactly the questions the app shows.
//   npx -y tsx scripts/export-content.ts
import { writeFileSync } from 'node:fs';

import { QUESTIONS } from '../src/data/questions';
import { SKILLS } from '../src/data/skills';

const questions = Object.fromEntries(
  QUESTIONS.map((q) => [q.id, { skill: q.skill, prompt: q.prompt, options: q.options, answer: q.answer, hint: q.hint, mis: q.mis }]),
);
const skills = Object.fromEntries(SKILLS.map((s) => [s.id, s.name]));
writeFileSync('supabase/functions/_shared/content.json', JSON.stringify({ questions, skills }, null, 1));
console.log(`exported ${QUESTIONS.length} questions, ${SKILLS.length} skills`);

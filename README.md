# LearnShift

**Same phone, better minutes.**
LearnShift notices when screen time is turning unhealthy and turns that moment into a short lesson on the exact skill the student is missing.

Built for the AIdeathon: Tech Connect SYNC. Frontend prototype for students, guardians and teachers.

---

## Features

**Student**
- Home with streak, screen-time gauge and live risk chip
- Smart nudges in four calm levels: check-in, learning break, wind-down, guardian lock
- 45-second learning breaks with idea cards and adaptive quizzes
- Bilingual AI tutor (English / Filipino) that explains the student's exact mistake
- Skill Map showing the root learning gap
- Insights: weekly report, learning heatmap, shareable card
- *Your little isla*: a calm island that grows with learning (with Tarsi, the tarsier guide)
- Focus timer, offline lesson packs, privacy center, nudge history

**Guardian**: weekly habit summary, bedtime and lock controls, request inbox (habits only, never grades)

**Teacher**: class skill heatmap, needs-support list, review queue for low-confidence tutor answers (learning only, never screen time)

## AI components (mocked on-device)

| Component | What it does |
|---|---|
| Risk model | Logistic score from session length, time of day, school day, app type, with readable reasons |
| Gap engine | Bayesian Knowledge Tracing over a prerequisite graph to find the root skill gap |
| Intervention policy | Safety guardrails first, then Thompson sampling to pick the gentlest nudge that works |
| Tutor | Misconception bank and step-by-step explanations; flags low-confidence answers for teacher review |

All four live behind typed interfaces in `src/services/types.ts`, ready for a real backend.

## Tech stack

Expo SDK 58 · React Native · Expo Router · TypeScript · Reanimated 4 · Zustand · FlashList · React Native SVG

## Getting started

```bash
npm install
npx expo start
```

- **Phone:** scan the QR code with Expo Go
- **Web:** press `w` (best for the Teacher and Guardian dashboards)

## Demo

Tap **Demo** on Home (or long-press the LearnShift logo) to open the demo panel:

1. **Afternoon scroll**: a 45-minute video session triggers a check-in, then a learning break
2. **11:30 PM school night**: night theme and wind-down mode
3. **Guardian lock**: ask a guardian for 15 more minutes and approve it from the Guardian view
4. **Wrong answer**: the tutor explains the exact mistake, in English or Filipino

Switch **Role** in the demo panel to see the Guardian and Teacher views.

## Project structure

```
src/
  app/          screens (Expo Router)
  components/   UI, learning, isla, student and teacher components
  services/     mock AI and usage data
  store/        app state
  data/         skills, questions, lessons, seed data
  i18n/         English and Filipino strings
```

## Privacy

No real accounts or data. Screen-time data is simulated. Guardians see habits only; teachers see learning only.

## AI tools used

- **Claude Code (Anthropic)**: planning, UI, screens, mock AI services and bilingual content, built from the team's brief and concept

## License

See [LICENSE](LICENSE).

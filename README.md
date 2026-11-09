# LearnShift

**Same phone, better minutes.**
LearnShift notices when screen time turns into doomscrolling and turns that moment into a short lesson on the exact skill the student is missing.

Built for the AIdeathon: Tech Connect SYNC. One app for three roles: students, guardians and teachers.

---

## What works

**Student (Android and iPhone)**
- Doomscroll detection:
  - Android: watches which app is in front and for how long, then sends a check-in, a 45-second learning break, or a wind-down after bedtime.
  - iPhone: uses Apple Screen Time thresholds on the apps the student picks.
- Adaptive quizzes and learning breaks. Mastery is tracked per skill (Bayesian Knowledge Tracing), and the app finds the root gap on a prerequisite graph.
- Gemini tutor in English and Filipino. It explains the exact mistake with the question's own numbers, and it checks its own math before showing an answer.
- Streaks, coins, *Your little isla*, insights, focus timer, offline packs, privacy center with "Download my data".

**Guardian**
- Weekly habit summary, late-night alerts, bedtime and night-lock controls.
- Live "15 more minutes" requests. Habits only, never grades.

**Teacher (best on a laptop)**
- Classes with join codes and a live mastery heatmap.
- A needs-support list, and a review queue for AI answers that failed the math check. Learning only, never screen time.

## Architecture

```
Phone app (Expo) ── Supabase: Auth · Postgres + row-level security · Realtime · Edge Functions
   │                                         │
   └ native monitor (Android service /       ├ tutor   → Gemini (gemini-3.5-flash, falls back to -lite)
     iOS Screen Time extension) ── ingest ───┤ notify  → Expo push
                                             └ delete-account
```

- **Privacy:** only minutes per app, daily totals and nudges are uploaded, never content, messages or browsing. Guardians see per-app minutes; teachers never see screen time. Database policies enforce who sees what, and 59 automated checks prove it.
- **Offline-first:** the app works from a local copy and syncs writes when back online.

## Run it

```bash
npm install
npx expo start            # web: press w
```

- `.env` holds the public Supabase URL and publishable key.
- The Gemini key is a server secret: `npx supabase secrets set GEMINI_API_KEY=...`

**Builds (EAS):**

```bash
npx eas-cli@latest build -p android --profile preview   # real app, APK
npx eas-cli@latest build -p android --profile pitch     # demo build with the Demo panel
npx eas-cli@latest update --channel preview             # ship JS fixes over the air
```

**iPhone Screen Time:** needs an Apple Developer account and Apple's Family Controls approval. Then build with `APPLE_TEAM_ID=XXXXXXXXXX`; the Screen Time plugin turns on only when that variable is set.

**Backend:**
- Schema: `supabase/migrations/`
- Functions: `supabase/functions/`
- Apply: `npx supabase db push` and `npx supabase functions deploy`

## Testing

[TESTING.md](TESTING.md) has the 18-step phone checklist. Automated checks:

```bash
node --env-file=.env scripts/backend-test.mjs
npm run typecheck
npm run lint
```

## Project structure

```
src/app/            screens (Expo Router): student, guardian, teacher, onboarding, account
src/services/       backend (api, sync, guardian, teacher), monitor (Android/iOS), ai, notifications
src/store/          local state (offline-first) and auth
modules/usage-monitor/   native Android module (Kotlin): detection service, nudges, reporting
supabase/           migrations and edge functions (tutor, notify, ingest, delete-account)
```

## AI tools used

- **Claude Code (Anthropic):** planning, design, app and backend code, native Android module, tests and bilingual content, built from the team's brief.
- **Google Gemini (gemini-3.5-flash):** the in-app tutor's explanations and chat.

## License

See [LICENSE](LICENSE).

# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

LearnShift is an anti-doomscroll learning app for Filipino Grade 7–12 students, with student, guardian and teacher roles. Expo SDK 58 / React Native 0.88 / React 19 / TypeScript strict, Supabase backend, a native Android usage monitor, and a Gemini tutor. Read `AGENTS.md` too: Expo APIs change every SDK, so check the versioned docs before touching Expo or EAS APIs, and always use `npx expo install`.

## Commands

```bash
npm run web                      # Expo dev server for web (Android/iOS need a dev build, not Expo Go)
npm run typecheck                # tsc --noEmit (excludes supabase/functions and scripts)
npm run lint                     # expo lint; React Compiler rules are errors
npm run format                   # prettier on src
node --env-file=.env scripts/backend-test.mjs   # end-to-end checks against the LIVE Supabase project
```

- The backend test is the only test suite. It creates throwaway `@learnshift-test.com` accounts and deletes them through the `delete-account` function. To run one area, comment out sections in the script; there is no per-test runner.
- Supabase CLI v3 is linked to the remote project. Hosted changes need `--yes`:
  - `npx supabase migration new <name>`, then `npx supabase db push --remote --yes`
  - `npx supabase functions deploy [name] --use-api --yes`
  - `npx supabase db advisors --remote`
  - `npx supabase db query --remote --read-only "<sql>"`
- **Builds:**
  - `npx eas-cli@latest build -p android --profile preview`: the real-app APK.
  - `--profile pitch`: the offline demo build, `EXPO_PUBLIC_PITCH=1`.
  - JS-only fixes: `npx eas-cli@latest update --channel preview`.
  - Ask before building an APK; the user prefers batching native changes.
- **Website:** `npx expo export -p web && npx eas-cli@latest deploy --prod` publishes https://learnshift.expo.app.
- **After editing `src/data/questions.ts` or `skills.ts`,** regenerate the server copy: `npx -y tsx --tsconfig tsconfig.json scripts/export-content.ts`. This writes `supabase/functions/_shared/content.json`. Then redeploy `tutor`.

## Architecture

**Two build flavours (`src/lib/config.ts`).**
- `IS_PITCH`: the offline Mika demo, with seeded data, the Demo panel (`/demo`) and the ShortVids simulator.
- Otherwise the real app, with Supabase accounts.

Many screens branch on `IS_PITCH`. Keep both paths working when editing a screen.

**Offline-first student data.**
- `src/store/useAppStore.ts` (zustand + AsyncStorage persist) is the student's local source of truth.
- Mutating actions set `dirty` flags or push to `outbox`.
- `src/services/backend/sync.ts` flushes those to Supabase, pulls server state on start, on foreground, and on realtime events (guardian changes to `guardian_controls`, `student_settings`, `time_requests`, links and classes).
- A pull never overwrites a field that is still dirty.
- `answer(e, meta)` must receive `meta` (question id, choice, context) or the attempt never reaches the teacher.

**Auth and session.**
- `src/store/useAuth.ts` holds the session and profile.
- `src/services/backend/session.tsx` (`SessionEffects`, mounted in `src/app/_layout.tsx`) keeps the store on the signed-in user, starts student sync, registers push and bridges the native monitor.
- `useRoleGate` in each role layout redirects other roles.
- The role comes from sign-up metadata via a DB trigger and is never updatable.

**Role views.**
- Guardian and teacher screens don't use the student store. They use their own zustand stores with realtime subscriptions:
  - `src/services/backend/guardian.ts`: children, per-child usage, nudges, requests, controls, `app_usage`, `live_status`.
  - `src/services/backend/teacher.ts`: classes, rosters, mastery, `tutor_answers` review queue.
- All server calls go through `src/services/backend/api.ts`.

**Database (`supabase/migrations/`).**
- The privacy split is enforced by RLS:
  - Guardians see habits: `usage_daily`, `nudge_events`, `app_usage`, `live_status`, `time_requests`.
  - Teachers see learning: `attempts`, `mastery`, `mastery_daily`, `tutor_answers`.
  - Neither sees the other's data.
- Relationship checks are `private.is_guardian_of` and `private.is_teacher_of`.
- Linking, joining, request decisions and device tokens go through SECURITY DEFINER RPCs in `public`, each with an `auth.uid()` check.
- New tables are not auto-exposed: add explicit GRANTs, RLS policies, realtime publication if needed, and cases in `scripts/backend-test.mjs`.

**Edge functions (`supabase/functions/`, Deno).**
- `verify_jwt = false` in `config.toml`; each function authenticates the caller itself.
- `tutor`: Gemini via `_shared/tutor-core.ts`.
  - Model order from the `GEMINI_MODELS` secret, currently `gemini-3.5-flash`, then `-lite`.
  - Confidence comes from `verify()` re-checking the math. Failures are saved as `needs_review` for teachers.
  - The client uses the misconception bank first (`src/services/ai/liveTutor.ts`).
- `notify`: Expo push.
- `ingest`: reports from the native monitor, authenticated by the `x-device-token` header, not a user session.
- `delete-account`.

**Doomscroll detection.**
- `src/services/monitor/` is one interface over two implementations:
  - Android: the local Expo module `modules/usage-monitor` (Kotlin).
  - iPhone: `react-native-device-activity` (Screen Time).
- `bridge.ts` pushes config (bedtime, lock, guardian limits, root skill, language) to native whenever it changes.
- **Android:**
  - `MonitorService` is a `specialUse` foreground service. It ticks every 2.5–15 s, reads `UsageStatsManager` events, scores risk with a Kotlin port of `src/services/ai/riskModel.ts`, and applies guardrails in order: lock, then bedtime wind-down, then guardian limit (with countdown), then adaptive nudges.
  - It reports nudges, daily and per-app totals, and the live app to `ingest`.
  - Keep `riskModel.ts` and `Nudges.kt` `Risk` in sync.
  - Kotlin can't be compiled locally (no Android SDK); only an EAS build verifies it.
- **iPhone:**
  - Screen Time is threshold-based and is enabled only when the build has `APPLE_TEAM_ID` (`app.config.js`); `extra.screenTime` gates the JS.
  - Without Apple's Family Controls approval it can't be built.
- JS calls to native functions added after a shipped APK must be optional (`?.()`), because OTA updates can reach older binaries.

**Web.**
- On desktop widths, `src/app/_layout.tsx` renders `PhoneFrame` (`src/components/web/PhoneFrame.tsx`). It embeds the same site in a 9:16 iframe, so every screen lays itself out for phone width.
- `?full` skips the frame; `?phone` restores it.

**Code conventions.**
- **React Compiler is on.** Lint fails on:
  - reading refs, or calling `Date.now()` / impure functions, during render (use `useNow()` or lazy `useState`);
  - synchronous `setState` in effects;
  - creating components during render.
- **Reanimated 4:** use `.get()`/`.set()`.
- **Zustand selectors** must not return fresh `[]`/`{}`.
- **Strings:** all student copy lives in `src/i18n/en.ts` and `fil.ts` (typed by `Strings`). Guardian strings are in `staff.ts`, EN + FIL. Teacher strings are English only.
- **Routes** live in `src/app/` (Expo Router).
- **Secrets:** `.env` holds only the public Supabase URL and publishable key. The Gemini key is a Supabase secret.

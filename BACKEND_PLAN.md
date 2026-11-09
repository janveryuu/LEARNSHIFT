# LearnShift: Full-Stack Plan (v2)

**Goal:** a fully working LearnShift for students, guardians and teachers, with real accounts, realtime sync, a Gemini-powered tutor and real doomscroll detection, tested on two real phones: an Android (your brother's) and an iPhone (yours). Ready for the hackathon.

**Out of scope for now:** publishing to Google Play and the App Store (see "Later" at the end).

Status: **draft, waiting for approval.** Nothing below is built yet.

---

## 1. What each phone allows

| | Android | iPhone (iOS 16+) |
|---|---|---|
| See which app is open and for how long | Yes, after the student grants "Usage access" | **No.** Apple never shares other apps' usage |
| Detect doomscrolling | Yes, minute by minute | Yes, as **time thresholds** on apps the student picks (e.g. 45 min on selected apps) |
| "Time to study" notification | Yes | Yes |
| Guardian lock | Soft lock: LearnShift jumps in front of a blocked app | **Real lock**: Apple's Screen Time shield blocks the apps |
| Exact minutes in guardian report | Yes | No. Guardians see alerts and learning progress |

**Installing on the phones without the stores:**
- **Android:** a direct APK install, like the one you already have. Free, no account needed.
- **iPhone:** without a Mac, the only way to install a test app is an **Apple Developer account ($99/year)**. Your iPhone gets registered once, and Expo builds an app only your registered devices can install.
- **iPhone doomscroll detection** needs Apple's **Family Controls** permission. Apple may require its approval even for test installs. **Request it as soon as you have the developer account.** Until it's approved, the iPhone app still runs every other feature: accounts, learning, tutor, guardian, realtime, bedtime reminders.
- **Expo Go is no longer used.** You install a LearnShift test app instead. It still updates instantly from my code changes, like Expo Go does.

---

## 2. Architecture

```
 Student phone                        Guardian phone            Teacher (laptop browser)
 ┌──────────────────────────────┐     ┌──────────────┐          ┌──────────────────┐
 │ LearnShift app               │     │ LearnShift   │          │ LearnShift web   │
 │ • Usage monitor (native)     │     │ guardian view│          │ teacher view     │
 │ • Risk model + nudge rules   │     └──────┬───────┘          └────────┬─────────┘
 │ • Local notifications        │            │                           │
 │ • Offline cache + sync queue │            │                           │
 └──────────────┬───────────────┘            │                           │
                │          HTTPS + Realtime (live updates)               │
 ┌──────────────▼────────────────────────────▼───────────────────────────▼───────┐
 │ Supabase                                                                      │
 │ • Auth (accounts)   • Postgres database with per-role privacy rules           │
 │ • Realtime          • Edge Functions: tutor, push notifications, reports      │
 └──────────────┬────────────────────────────────────────┬───────────────────────┘
                │                                        │
         Gemini API (tutor)                     Expo Push (notifications)
```

**Privacy:** the list of apps a student used **never leaves their phone**. Only daily totals and nudge alerts are uploaded. Guardians see habits only; teachers see learning only. Supabase's database rules enforce both, and tests prove it.

**Keys stay safe:**
- The Gemini key lives only on Supabase's server, never inside the app.
- The Supabase "anon" key is safe to put in the app.
- The "service role" key never goes in the app or in chat.

---

## 3. Data model

| Table | Holds | Who can read it |
|---|---|---|
| `profiles` | role, name, grade, language, bedtime | self; linked guardian and class teacher see the name only |
| `guardian_links` | guardian ↔ student, consent time | both |
| `classes`, `class_members` | teacher sections, join codes | teacher; enrolled students |
| `skills`, `questions`, `lessons` | curriculum (from the current data files) | all signed-in users |
| `attempts` | every answer, right or wrong, with the mistake type | student; their teacher |
| `mastery` | per-skill level, updated automatically after each answer | student; their teacher |
| `progress` | coins, streak, isla buildings | student |
| `usage_daily` | daily totals only, no app names | student; guardian |
| `nudge_events` | each nudge and how the student responded | student; guardian |
| `guardian_settings` | bedtime, lock on/off and hours, alerts | student; guardian edits |
| `time_requests` | "15 more minutes" requests and answers | student; guardian |
| `tutor_answers` | AI explanations, confidence, review status | student; teacher reviews |
| `push_tokens` | device notification tokens | self |

---

## 4. Phases

### Phase 0: Setup (you)
1. Create a free Supabase project.
2. Log the CLI in yourself, in the terminal: `npx supabase login`. You sign in through your browser, so no secret passes through chat. Then send me the **project URL** and **anon key**.
3. Store the Gemini key on Supabase yourself with one command I'll give you. It never appears in chat or code.
4. Apple Developer account ($99/yr). Then:
   - Request Family Controls.
   - Register your iPhone (I'll give you a link to open on the phone).
5. On your brother's Android, allow "Install unknown apps" for the browser or file manager.

### Phase 1: Accounts and foundation
- Database tables, privacy rules and curriculum seed.
- **Sign-in:** email and password at first. Supabase's built-in email sender only allows a few emails per hour, so code-by-email sign-in waits until we add a free sender. Google sign-in comes in Phase 6.
- Onboarding creates real accounts with roles.
- **Guardian linking:** the student's phone shows a 6-digit code, the guardian enters it, and the guardian gives consent. This follows the Data Privacy Act (RA 10173) consent rules for minors.
- **Classes:** the teacher creates a class, gets a join code, and students join with it.
- The mock data and mock services are replaced by real ones behind the same interfaces, so the screens you like stay the same.
- **Done when:** a student, a guardian and a teacher account can sign up, link and join a class.

### Phase 2: Learning and the Gemini tutor
- Every answer is saved and mastery updates on the server, so all devices show the same numbers.
- Coins, streak and the isla are saved to the account. Switching phones keeps them.
- **Gemini tutor:**
  - The model is chosen by testing. I'll list the models your key can use, run both Flash candidates on our ~30 sample mistakes, and pick on accuracy, English/Filipino quality and speed.
  - The tutor tries the built-in mistake bank first, which is instant and works offline. It calls Gemini only for new mistakes and returns a structured answer.
  - Confidence comes from **checking the math**: the server recomputes the correct answer and compares it with Gemini's final step. A mismatch sends the answer to the teacher's review queue.
- **Offline:** answers made offline are queued and sent when the phone reconnects.
- **Done when:** a student answers on the phone and the teacher's heatmap changes within seconds.

### Phase 3: Realtime and push notifications
- Live updates for:
  - the guardian inbox and approvals
  - lock on/off
  - the teacher heatmap, needs-support list and review queue
- **Push notifications:**
  - To the guardian: "Mika asked for 15 minutes", a late-night alert, and a weekly summary.
  - To the student: "Approved".
- The guardian weekly summary and the teacher needs-support list are built from real data.
- **Teacher web:** hosted at a free public link, so teachers just open it in a browser. This is a website, not a store release.
- **Done when:** the student asks for time on one phone, the guardian approves on the other, and the student's lock lifts on its own.

### Phase 4: Android doomscroll detection
- A native Android module:
  - A friendly explainer screen first, then the "Usage access" permission.
  - A light background service checks the open app every minute. Android requires a small permanent notification for this: "LearnShift is looking out for you".
  - It sorts apps into video, social, games and other.
  - It runs the same risk model and nudge rules as now.
- **Doomscroll → notification:** "45 min on videos. 45-second break?" Tapping it opens the right lesson.
- **After bedtime:**
  - A wind-down notification, plus an alert to the guardian.
  - During lock hours, LearnShift comes to the front over blocked apps. Emergency calls always work.
- **Battery:** a setup guide for brands that kill background apps, depending on your brother's phone brand (Xiaomi, Oppo, Vivo, Realme, Samsung).
- **Done when:** on your brother's Android, scrolling a video app past the limit pops the study notification, and your phone gets the guardian alert.

### Phase 5: iPhone doomscroll detection
- Screen Time extensions added through an Expo plugin:
  - The student picks the apps to watch, once.
  - At 30, 45 or 60 minutes on those apps, the study notification fires and the event syncs to the guardian.
  - During lock hours, Apple's shield blocks the apps, showing a LearnShift screen with an "Ask guardian" button.
- **Done when:** on your iPhone, the threshold notification and the shield work. **This depends on Apple's Family Controls approval.**

### Phase 6: Polish and full device test
- **Every screen:**
  - loading, error, empty and offline states
  - English and Filipino
  - night theme
- **Account:**
  - forgot password, delete account, sign out, switch role
  - Google sign-in
- **Tests:**
  - Automated tests for the risk model, mastery math, nudge rules and every privacy rule.
  - Full run of the device test checklist below on both phones. I fix everything that fails until the checklist passes.
- **Pitch build:** a separate build that keeps the Demo panel, so judges see all four scenarios in minutes instead of waiting 45 real minutes.

---

## 5. Device test checklist (must all pass)

Suggested setup:
- **Your brother's Android:** student.
- **Your iPhone:** guardian, and also an iPhone student test account for Phase 5.
- **A laptop:** teacher.

| # | Test | Phones |
|---|---|---|
| 1 | Sign up as student, guardian, teacher; sign out and back in | all |
| 2 | Guardian links with the 6-digit code; consent saved | Android + iPhone |
| 3 | Student joins the teacher's class with the join code | Android + laptop |
| 4 | Onboarding pre-test finds the first gap | Android |
| 5 | Quiz answer updates mastery on phone and teacher heatmap live | Android + laptop |
| 6 | Wrong answer → tutor explains in English and Filipino | Android + iPhone |
| 7 | New mistake → Gemini answer; wrong-math answer lands in review queue | Android + laptop |
| 8 | Teacher approves or edits a tutor answer | laptop |
| 9 | Doomscroll on a video app → study notification → tap opens lesson | Android |
| 10 | Same on iPhone at the time threshold | iPhone (needs Apple approval) |
| 11 | Past bedtime → wind-down notification + guardian alert | Android + iPhone |
| 12 | Guardian turns lock on → blocked app is covered | Android, iPhone |
| 13 | Student asks for 15 min → guardian push → approve → unlocks live | Android + iPhone |
| 14 | Coins, streak, isla survive reinstall / new phone | Android |
| 15 | Airplane mode: quiz offline, syncs after reconnect | Android |
| 16 | Guardian cannot see grades; teacher cannot see screen time | all |
| 17 | Phone restart: detection keeps working | Android |
| 18 | Delete account removes all data | any |

I can't hold the phones, so you'll run the steps and tell me or show me what happens. I'll fix each failure and push the fix straight to your phones.

---

## 6. What I need from you, and when

| Item | Needed by | Cost |
|---|---|---|
| Supabase project URL + anon key, CLI login | Phase 1 | Free |
| Gemini API key (set by you on Supabase) | Phase 2 | Free tier to start |
| Your brother's Android model, and access to it for testing | Phase 4 | — |
| Apple Developer account, iPhone registered | Phase 5 (earlier is better) | $99/year |
| Family Controls request sent to Apple | as early as possible | — |

**Gemini free tier:** Google may use free-tier requests to improve its models. For real students, switch to a paid key before launch; for testing it's fine.

## 7. Risks

- **Apple's Family Controls approval is slow or denied.** The iPhone keeps every feature except doomscroll detection and the real lock, which arrive when approved. Android detection doesn't depend on Apple.
- **Phone brands that kill background apps.** We handle it with the battery setup guide and test on your brother's actual phone.
- **Gemini model names change often.** The model name lives in one server setting, so we can switch without rebuilding the app.

---

## Later: store release (after the hackathon)

- **Google Play:**
  - Usage access declaration and Data Safety form.
  - A closed test with 12 testers for 14 days.
- **App Store:**
  - TestFlight.
  - Privacy labels.
  - Family Controls distribution approval.
  - App review.
- Privacy policy, terms and store listings in English and Filipino.

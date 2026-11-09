# Testing LearnShift on real phones

Setup used below:
- **Your brother's Android**: student.
- **Your iPhone**: guardian.
- **A laptop browser**: teacher.

## 1. Install

**Android (student).** Download the APK from the link in the build message, open it, and allow "Install unknown apps" if asked.

**iPhone (guardian).** An iPhone can't install a test app without an Apple Developer account ($99/year), because this project has no Mac. Once you have the account:

```bash
npx eas-cli@latest device:create
```

Open the link it prints on your iPhone to register it, then build:

```bash
npx eas-cli@latest build -p ios --profile preview
```

Until then, run the guardian on a second Android phone, or in a laptop browser (see below).

**Laptop (teacher), or any role on the web:**

```bash
npx expo start --web
```

## 2. One-time phone setup (student Android)

Onboarding walks through these; you can reopen them anytime in Profile › Account.
1. **Usage access** → find LearnShift → switch on. This is required for doomscroll detection.
2. **Show over other apps**: lets the night lock cover blocked apps.
3. **Keep running**: allow, so the phone doesn't close LearnShift in the background.
4. **Autostart** (on Xiaomi, OPPO, vivo, realme, Infinix, TECNO and similar phones): Settings › Apps › LearnShift › Autostart → on.
5. **Notifications** → allow.

When detection is on, a quiet notification reads "Tarsi is looking out for you".

## 3. Checklist

| # | Do this | Expect | Phones |
|---|---|---|---|
| 1 | Create a student, a guardian and a teacher account. Sign out and back in on each | Each lands on its own home | all |
| 2 | Student: Profile › Account shows a 6-digit code. Guardian: enter it, tick consent, Link | Student sees "Linked with …" without refreshing | Android + guardian |
| 3 | Teacher: create a class and copy the join code. Student: Profile › Account › Class code | Student appears on the teacher heatmap within seconds | Android + laptop |
| 4 | Finish onboarding with the 5-question check | "Your first gap" names a skill | Android |
| 5 | Student: Learn › any quiz, answer 3 questions | Teacher heatmap cells change within seconds | Android + laptop |
| 6 | Get a quiz answer wrong, tap the tutor, switch EN ⇄ FIL | Explanation uses the question's numbers, in both languages | Android |
| 7 | Get an unusual answer wrong, e.g. 1/2 + 1/3 = 1/6 | "Written by AI" explanation. Any answer that fails the math check shows in the teacher's review queue | Android + laptop |
| 8 | Teacher: approve or edit a review item | Item moves to reviewed | laptop |
| 9 | Student: scroll YouTube or TikTok without stopping. On a school day the risk model reaches a check-in at about 35 min and a break at about 55 min; later at night it's sooner | "N min on videos" check-in (with 5 more min), then a 45-second break notification. Tapping opens the lesson; the guardian's Recent nudges shows it | Android |
| 9b | **Guardian limit (fastest real test).** Guardian: Controls › Break after › Videos & social › **10m**. Student: open TikTok or YouTube | A quiet **“TikTok · break in 9:59”** countdown appears in the notification bar and counts down live. At 0, a **“10-min limit reached”** reminder pops up with Take a break / 5 more min, then the countdown restarts. The guardian sees **Using now: TikTok** and the app in **Screen time by app** | Android + guardian |
| 10 | iPhone student (needs Apple's Family Controls approval) | Same after 30 / 45 / 60 min on chosen apps | iPhone |
| 11 | Set bedtime a few minutes from now, then scroll a video app for 5 min after it | Wind-down notification. Guardian gets "… is still on the phone" | Android + guardian |
| 12 | Guardian: switch on Guardian lock (set bedtime to now first). Student: open a video app | LearnShift lock screen covers it. Emergency call works | Android |
| 13 | Student on the lock screen: "Ask … for 15 min". Guardian: Approve | Guardian gets the request live. Student's lock lifts without refreshing | Android + guardian |
| 14 | Student: take a break, then sign in on another phone or the web | Coins, streak and isla are the same | Android + web |
| 15 | Student: airplane mode, answer a quiz, then turn it off | Answers reach the teacher after reconnecting | Android + laptop |
| 16 | Check what each role sees | Guardian never sees grades; teacher never sees screen time | all |
| 17 | Restart the Android phone, then scroll a video app | Detection resumes without opening LearnShift | Android |
| 18 | Profile › Account › Delete account (tap twice) | Account and all its data are gone; signing in fails | any |

To preview a nudge without waiting: Profile › Account › **Send a test nudge**.

No reminder? Profile › Account › **Break reminders** must show a check mark. If it shows **Turn on**, tap it and allow notifications for LearnShift.

## 4. If something fails

Note which step, which phone, and what you saw (a screenshot helps). JavaScript fixes ship over the air: close and reopen the app twice to get them. Native fixes need a new APK.

## 5. Automated checks

```bash
node --env-file=.env scripts/backend-test.mjs
```

59 checks against the live backend: sign-up, linking, classes, every privacy rule, realtime, monitor ingest, the Gemini tutor and notifications. The test accounts delete themselves afterwards.

```bash
npm run typecheck && npm run lint
```

# Paty + Feed Shift — implementation plan

## 1. What the team asked for (from the chat screenshots)

| Team message (paraphrased) | What it means for the app |
|---|---|
| "Highlight this in the app": use an AI model so the app can include a **learning / educational feed** | The headline feature is not a timer. It is an AI that changes *what* you see. |
| The model picks videos that **make it easier to exit the doomscroll** | Learning clips are short, end with an easy exit, and never loop forever. |
| "If we only make a timer, it will just look like a timer" | Drop the alarm-style "45 min, take a break?" card as the main moment. |
| "We can't control YouTube/TikTok, so inside the same app use a **disguised transition**: the next swipe is a different feed" | When the AI decides it is time, the **next swipe lands on LearnShift learning clips** in the same vertical-video format. No pop-up wall. |
| "A bit like a launcher, because it sees app usage" | It is driven by the usage monitor that already exists (which app, how long). |
| "Make it like an alarm? It knows it's been 45 min, so time to shift" | The 45-minute signal stays, but it triggers a **feed shift**, not an alarm. |

## 2. The feature: Feed Shift

1. Student watches ShortVids (the demo app). The clock fast-forwards to 45 min.
2. The risk model fires. Instead of a blocking card, a small Paty pill slides in: "Paty is shifting your feed".
3. The clips *after* the current one are replaced with **learning clips**, ranked by the gap engine (root gap first).
4. The next swipe plays a short **shift transition** (a pixel wipe), then a learning clip in the same full-screen video layout. It has a one-tap "Try it" question, Save, and "Why this?".
5. After 3 learning clips, an **Easy exit** page appears: "Take a 5-min break", "Keep learning", or "Close the app". The scroll ends there.
6. Honest by design: every learning clip carries a small "LearnShift" badge, and "Why this?" explains the 45 min + gap reason. Consent is still captured in onboarding.

Scope: the pitch build (`IS_PITCH`): ShortVids simulator, Demo scenario 1, and onboarding copy. On a real phone LearnShift cannot rewrite another app's feed. The real-app story is an overlay launched by the monitor, which is a native follow-up.

## 3. Mascot: Paty

- Replace Tarsi (the tarsier) with **Paty**, a pixel-art student: brown hair with a tuft, round blue glasses, white uniform shirt, navy tie, red backpack with yellow stars, navy pants, black shoes.
- Built as **code-generated pixel art** (a sprite grid rendered as SVG rects), so it stays crisp at any size, themable, and animatable.
- Life: idle breathing bob, random blinks every 3–6 s, waving arm, tap-to-bounce. Expressions: happy, curious, proud, concerned, sleepy, cheering, studying, waving. Props: book, pencil, wrench.
- The streak face (`TarsiSpark`) becomes a Paty head. All copy says "Paty" (EN + FIL + staff).
- Reduced motion turns off the loops.

## 4. Onboarding background

- Replace the flat cream with a warm, clean **"study desk" backdrop**:
  - a soft vertical gradient (cream to a warm peach),
  - a faint pixel dot grid (it echoes Paty's pixel style),
  - a soft glow behind the mascot,
  - a few slow-twinkling pixel sparkles.
- Low contrast, so text and buttons keep their contrast. Works in Day and Night themes.

## 5. Delivery

1. `npm run typecheck` and `npm run lint`.
2. Verify in the browser (onboarding, simulator shift, demo panel).
3. Export the pitch web build and deploy it to the `pitch` alias at https://learnshift--pitch.expo.app/demo.
4. Build the pitch APK with EAS: `--profile pitch`.

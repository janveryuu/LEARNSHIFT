# Decisions

One line each. Newest at the bottom.

- Expo SDK 58 (latest stable on 2026-11-09); routes live in `src/app/` per the SDK 58 template instead of root `app/`.
- Press feedback uses core `Pressable` + Reanimated shared values instead of gesture-handler buttons: works identically on iOS, Android and web, and gesture-handler v3 changed its button API.
- `@gorhom/bottom-sheet` deferred: native page sheets come from Expo Router `presentation: 'formSheet' | 'modal'`; in-screen sheets use a small Reanimated sheet. Revisit only if a screen needs snap points.
- Inter on Android and web is loaded per weight (500/600/700/800) and selected by family name, because Android ignores `fontWeight` on custom fonts.
- Night theme is a full token set, not a filter; `useTheme()` reads a store value that is `auto` (follows the bedtime window), `day` or `night`.
- Mascot Tarsi is drawn in react-native-svg as layered parts (body, ears, eyes, lids, scarf, arms, prop) so expressions are props, not separate images.
- Haptics are no-ops on web (expo-haptics throws there), wrapped in `src/design/haptics.ts`.
- Pressable scale: 0.96 for buttons and chips, 0.98 for cards, per the brief.
- Tab icons: phosphor `fill` weight; inline icons `bold` weight at 20 px.
- Gauge geometry: 220° arc centered on the top, 44 ticks; filled ticks ramp from faint to full accent toward the "now" marker.
- React Compiler stays on (template default); shared values use `.get()` / `.set()` instead of `.value`, which is what Reanimated asks for under the compiler.
- Layout animations (`entering`/`exiting`) are native-only via `nativeOnly()`; on web Reanimated left those views at `visibility: hidden`. Web is only the Teacher/Guardian surface.
- SVG rotations use `transform="rotate(a x y)"` strings, not `rotation`/`origin` props, which leak an invalid `transform-origin` DOM attribute on web.
- Night `tileDark` is `#232845` (lifted above the `#161A2C` cards) so feature tiles still read as special at night.
- Streak faces are original "TarsiSpark" heads (ears + big eyes) in the spark gradient; past days without a break show a calm gray face, never a failure mark.
- Gallery accepts `?mode=day|night|both` so screenshots and demos can open a fixed theme.
- Web build uses `output: "single"` (SPA) so persisted zustand state never runs during static rendering.
- Home tab route is `/home`, not `(student)/(tabs)/index`, so it doesn't collide with the root `index.tsx` role redirect.
- Guardian and Teacher live under real segments (`/guardian`, `/teacher`) instead of route groups, so web URLs read well.
- Onboarding is one paged screen (`/onboarding`) with spring page transitions, not nine routes; back/forward stay in one place.
- The Shift sheet is an in-place bottom sheet rendered inside the tab-bar slot (under the bar), so the center button stays tappable and rotates to ×; no `shift.tsx` route.
- In-screen sheets use our own `BottomSheet` (Reanimated + gesture-handler v3 `usePanGesture`); `@gorhom/bottom-sheet` stays out.
- Tabs come from `expo-router/js-tabs` with a custom `tabBar`; `Tabs` from `expo-router` is deprecated in SDK 58.
- BKT updates are damped (18% of each step) and "weak" means < 60%: raw BKT jumped Fractions from 41% to 79% on one correct answer.
- Mastery forecast is linear (+5 points per break), per the brief; a simulated BKT drift never converged.
- The tutor writes fraction add/subtract steps from the learner's own numbers, so the explanation matches the exact question.
- Wrong answers with no known misconception get a hint-based answer at 55% confidence and land in the teacher's review queue.
- Night guardrail is enforced three ways: policy (`night-no-quiz`), Home/Shift UI (wind-down replaces break/quiz), and a route guard on break and quiz.
- Isla coins are lifetime and never spent: buildings unlock at thresholds, so there is no store, loss or countdown pressure.
- Feed shows only as many cards as today's cap allows, then an end card. No infinite scroll.
- Teacher copy is English only (DepEd working language); every student flow and the Guardian view are complete in Filipino.
- SVG taps go through transparent `Pressable` overlays (skill map, isla) because SVG press events misfire on web; overlays also carry screen-reader labels.
- Scenario 1 auto-continues to the break after ~4 s unless the presenter touches the card, so the demo never stalls.
- Lock-screen request status is tracked by the request id sent from that screen (session store), not by timestamps.
- Teacher heatmap cells size to the card width (no sideways scroll at 360 dp); the header row is sticky.
- Grade letter = 45% breaks taken + 35% calm nights + 20% mastery gain, shared by Insights, Share card and Guardian.

# LearnShift — Build Plan

Frontend-only Expo app (SDK 58, Expo Router, TypeScript strict). All data and the four AI components are mocked behind typed interfaces in `src/services/`.

## File tree

```
learnshift/
  design/reference/            Clucky screenshots (design DNA only, never shipped)
  src/
    app/                       Expo Router routes (SDK 58 convention: routes live in src/app)
      _layout.tsx              fonts, theme provider, gesture root, splash
      index.tsx                redirect by role / onboarding state
      demo.tsx                 Demo control panel (modal)
      dev/gallery.tsx          Component gallery (Day + Night)
      onboarding.tsx           paged: welcome, role, grade, language, consent, usage-access, bedtime, pretest, first-gap
      (student)/
        (tabs)/_layout.tsx     custom TabBar
        (tabs)/home.tsx        Home (route /home; root index.tsx redirects by role)
        (tabs)/learn.tsx       Learn hub
        (tabs)/insights.tsx    Insights
        (tabs)/profile.tsx     Profile & settings
        feed.tsx break/[id].tsx quiz/[skillId].tsx tutor.tsx skill/[id].tsx
        isla.tsx isla-how.tsx focus.tsx winddown.tsx lock.tsx privacy.tsx nudges.tsx
        offline.tsx simulate.tsx bedtime.tsx share.tsx
      guardian/index.tsx       summary, controls, requests (two columns ≥ 900 px)
      teacher/                 index (class heatmap, needs support, review queue), student/[id]
    design/                    tokens.ts theme.ts typography.ts motion.ts
    components/
      ui/                      primitives (see list below)
      mascot/                  Tarsi.tsx, TarsiSpark.tsx
      isla/                    IsoTile.tsx, buildings/*.tsx, IslaScene.tsx
    services/
      types.ts                 interfaces for every service
      usage/                   UsageProvider + MockUsageProvider
      ai/                      riskModel.ts gapEngine.ts interventionPolicy.ts tutor.ts
    data/                      skills.ts lessons.ts questions.ts class.ts seed.ts
    store/                     useAppStore.ts (zustand + persist)
    i18n/                      en.ts fil.ts useT.ts
```

## UI primitives (`src/components/ui/`)

Text, PressableScale, Card, InsetCard, DarkTile, PillButton, Chip, RiskChip, SegmentedControl,
Stepper, WheelPicker, ListGroup, ListRow, Toggle, SheetHeader, LargeTitleHeader, TabBar,
AnimatedNumber, TickGauge, Ring, Heatmap, BarChart, StatTile, ProgressBar, StreakRow,
CoinCounter, Skeleton, EmptyState, Stagger (entry animation helper).

## Phases

- [x] **Phase 0 — Foundation:** Expo + Router + fonts + Day/Night theme + motion + all UI primitives + Tarsi + gallery.
- [x] **Phase 1 — Demo-critical:** tab bar, Home, ShortVids simulator, nudges L1–L4, Learning break, adaptive quiz, Tutor, Demo panel, Teacher heatmap. Verify the 4 demo scenarios before moving on.
- [x] **Phase 2 — Learning depth:** Learn hub, Skill Map + skill sheet, Feed with cap, Insights.
- [x] **Phase 3 — Ecosystem:** Isla + How it grows, Guardian views, Onboarding, Profile + bedtime editor, Privacy center, Nudge history, Focus, Offline packs.
- [x] **Phase 4 — Polish:** screen-by-screen pass against the quality bar, copy, springs, Filipino strings, device tests.

## Verification per phase

`npx tsc --noEmit` clean → `npx expo start --web` renders with no console warnings → check on a phone in Expo Go.

## Status (2026-11-09)

Phases 0–4 built. `tsc` and `expo lint` clean. Web checked at 360, 375, 500 and 1300 px with a clean console.
All four demo scenarios play end to end on web. Still to do: a pass on a real iPhone and Android phone in Expo Go.

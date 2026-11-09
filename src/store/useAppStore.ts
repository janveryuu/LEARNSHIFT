import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_REVIEW, type ReviewItem } from '@/data/class';
import { SEED_BUILT, seedNudges, type BuildingId, type NudgeEntry, type NudgeResponse } from '@/data/seed';
import { MIKA_MASTERY, type SkillId } from '@/data/skills';
import { gapEngine } from '@/services/ai/gapEngine';
import type { AnswerEvidence, ArmStats, Mastery, NudgeAction } from '@/services/types';

export type Role = 'student' | 'guardian' | 'teacher';
export type Lang = 'en' | 'fil';
export type ThemePref = 'auto' | 'day' | 'night';
export type BedtimeDays = 'school' | 'weekends' | 'every';

export type Bedtime = {
  /** Minutes after midnight. 22:00 → 1320. */
  start: number;
  end: number;
};

export type DemoOverrides = {
  /** Minutes after midnight, or null to use the real clock. */
  clock: number | null;
  schoolDay: boolean | null;
  risk: number | null;
};

export type GuardianSettings = {
  name: string;
  linked: boolean;
  lockEnabled: boolean;
  lateNightAlerts: boolean;
  limitStyle: 'adaptive' | 'fixed';
};

export type TimeRequest = {
  id: string;
  at: string;
  minutes: number;
  status: 'pending' | 'approved' | 'declined';
};

type State = {
  role: Role;
  lang: Lang;
  themePref: ThemePref;
  bedtime: Bedtime;
  bedtimeDays: BedtimeDays;
  onboarded: boolean;
  demo: DemoOverrides;

  coins: number;
  breaksToday: number;
  mastery: Mastery;
  answers: number;
  nudges: NudgeEntry[];
  feed: { day: string; minutes: number; saved: string[] };
  guardian: GuardianSettings;
  requests: TimeRequest[];
  offline: SkillId[];
  built: BuildingId[];
  stats: ArmStats;
  review: ReviewItem[];
  reviewed: Record<string, 'approved' | 'edited'>;
  paused: boolean;
  lastMiss: { q: string; a: number } | null;
};

type Actions = {
  setRole: (role: Role) => void;
  setLang: (lang: Lang) => void;
  setThemePref: (pref: ThemePref) => void;
  setBedtime: (bedtime: Bedtime, days?: BedtimeDays) => void;
  setDemo: (patch: Partial<DemoOverrides>) => void;
  setOnboarded: (v: boolean) => void;
  addCoins: (n: number) => void;
  answer: (e: AnswerEvidence) => Mastery;
  setMastery: (m: Mastery) => void;
  logNudge: (level: NudgeEntry['level'], reasons: NudgeEntry['reasons'], response: NudgeResponse) => string;
  respondNudge: (id: string, response: NudgeResponse) => void;
  recordBreak: () => void;
  addFeedMinutes: (n: number) => void;
  toggleSaved: (id: string) => void;
  setGuardian: (patch: Partial<GuardianSettings>) => void;
  requestTime: () => string;
  resolveRequest: (id: string, status: 'approved' | 'declined') => void;
  toggleOffline: (skill: SkillId) => void;
  build: (id: BuildingId) => void;
  reward: (arm: keyof ArmStats, accepted: boolean) => void;
  flag: (item: Omit<ReviewItem, 'id'>) => void;
  setReviewed: (id: string, status: 'approved' | 'edited') => void;
  setPaused: (v: boolean) => void;
  setLastMiss: (m: { q: string; a: number } | null) => void;
  reset: () => void;
};

const todayKey = () => new Date().toISOString().slice(0, 10);

/** Last night's "15 more minutes" ask, so the guardian inbox has something real. */
function seedRequest(): TimeRequest {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(21, 52, 0, 0);
  return { id: 'r-seed', at: d.toISOString(), minutes: 15, status: 'pending' };
}

const initial = (): State => ({
  role: 'student',
  lang: 'en',
  themePref: 'auto',
  bedtime: { start: 22 * 60, end: 6 * 60 },
  bedtimeDays: 'school',
  onboarded: true,
  demo: { clock: null, schoolDay: null, risk: null },

  coins: 1240,
  breaksToday: 0,
  mastery: { ...MIKA_MASTERY },
  answers: 142,
  nudges: seedNudges(),
  feed: { day: todayKey(), minutes: 6, saved: [] },
  guardian: { name: 'Mom', linked: true, lockEnabled: false, lateNightAlerts: true, limitStyle: 'adaptive' },
  requests: [seedRequest()],
  offline: ['fractions', 'algebraic'],
  built: [...SEED_BUILT],
  // Mika has accepted check-ins about half the time and breaks more often.
  stats: { checkin: { a: 3, b: 3 }, break: { a: 4, b: 2 }, winddown: { a: 3, b: 1 } },
  review: [...SEED_REVIEW],
  reviewed: {},
  paused: false,
  lastMiss: null,
});

let nid = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(nid++).toString(36)}`;

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initial(),
      setRole: (role) => set({ role }),
      setLang: (lang) => set({ lang }),
      setThemePref: (themePref) => set({ themePref }),
      setBedtime: (bedtime, days) => set((s) => ({ bedtime, bedtimeDays: days ?? s.bedtimeDays })),
      setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),
      setOnboarded: (onboarded) => set({ onboarded }),
      addCoins: (n) => set((s) => ({ coins: s.coins + n })),
      answer: (e) => {
        const next = gapEngine.update(get().mastery, e);
        set((s) => ({ mastery: next, answers: s.answers + 1 }));
        return next;
      },
      setMastery: (mastery) => set({ mastery }),
      logNudge: (level, reasons, response) => {
        const id = uid('n');
        set((s) => ({
          nudges: [{ id, at: new Date().toISOString(), level, reasons, response }, ...s.nudges].slice(0, 60),
        }));
        return id;
      },
      respondNudge: (id, response) =>
        set((s) => ({ nudges: s.nudges.map((n) => (n.id === id ? { ...n, response } : n)) })),
      recordBreak: () => set((s) => ({ breaksToday: s.breaksToday + 1 })),
      addFeedMinutes: (n) =>
        set((s) => {
          const day = todayKey();
          const base = s.feed.day === day ? s.feed.minutes : 0;
          return { feed: { ...s.feed, day, minutes: base + n } };
        }),
      toggleSaved: (id) =>
        set((s) => ({
          feed: {
            ...s.feed,
            saved: s.feed.saved.includes(id) ? s.feed.saved.filter((x) => x !== id) : [...s.feed.saved, id],
          },
        })),
      setGuardian: (patch) => set((s) => ({ guardian: { ...s.guardian, ...patch } })),
      requestTime: () => {
        const id = uid('r');
        set((s) => ({
          requests: [{ id, at: new Date().toISOString(), minutes: 15, status: 'pending' as const }, ...s.requests],
        }));
        return id;
      },
      resolveRequest: (id, status) =>
        set((s) => ({ requests: s.requests.map((r) => (r.id === id ? { ...r, status } : r)) })),
      toggleOffline: (skill) =>
        set((s) => ({
          offline: s.offline.includes(skill) ? s.offline.filter((x) => x !== skill) : [...s.offline, skill],
        })),
      build: (id) => set((s) => (s.built.includes(id) ? s : { built: [...s.built, id] })),
      reward: (arm, accepted) =>
        set((s) => ({
          stats: {
            ...s.stats,
            [arm]: { a: s.stats[arm].a + (accepted ? 1 : 0), b: s.stats[arm].b + (accepted ? 0 : 1) },
          },
        })),
      flag: (item) => set((s) => ({ review: [{ ...item, id: uid('rv') }, ...s.review] })),
      setReviewed: (id, status) => set((s) => ({ reviewed: { ...s.reviewed, [id]: status } })),
      setPaused: (paused) => set({ paused }),
      setLastMiss: (lastMiss) => set({ lastMiss }),
      reset: () => set(initial()),
    }),
    {
      name: 'learnshift-app',
      version: 2,
      storage: createJSONStorage(() => AsyncStorage),
      // Any older shape: start fresh from the seed.
      migrate: () => initial(),
    },
  ),
);

export function nowMinutes(override: number | null): number {
  if (override != null) return override;
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function inWindow(minutes: number, { start, end }: Bedtime): boolean {
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** True when the bedtime window applies tonight given which nights are selected. */
export function bedtimeApplies(days: BedtimeDays, schoolNight: boolean): boolean {
  if (days === 'every') return true;
  return days === 'school' ? schoolNight : !schoolNight;
}

export type { NudgeAction };

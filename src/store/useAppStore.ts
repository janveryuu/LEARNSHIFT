import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { SEED_REVIEW, type ReviewItem } from '@/data/class';
import { SEED_BUILT, seedNudges, type BuildingId, type NudgeEntry, type NudgeResponse } from '@/data/seed';
import { MIKA_HISTORY, MIKA_MASTERY, SKILLS, type SkillId } from '@/data/skills';
import { IS_PITCH, PITCH_NAMES } from '@/lib/config';
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
  /** First linked guardian's name ('' when none). */
  name: string;
  linked: boolean;
  lockEnabled: boolean;
  lateNightAlerts: boolean;
  limitStyle: 'adaptive' | 'fixed';
};

export type LockWindow = { start: number; end: number; unlockUntil: string | null };

export type TimeRequest = {
  id: string;
  at: string;
  minutes: number;
  status: 'pending' | 'approved' | 'declined';
};

/** One day of habits, from the usage monitor and the app itself. */
export type UsageDay = {
  day: string;
  total: number;
  video: number;
  social: number;
  games: number;
  late: number;
  offAt: number | null;
  breaks: number;
  learning: number;
  sessions: number;
  unlocks: number;
};

export type AttemptMeta = { questionId: string; chosen: number; context: 'quiz' | 'break' | 'pretest' | 'feed' };

/** Writes waiting to reach the server (kept across restarts, so offline works). */
export type OutboxOp =
  | {
      kind: 'attempt';
      row: {
        client_id: string;
        question_id: string;
        skill_id: string;
        chosen: number;
        correct: boolean;
        seconds: number;
        hints: number;
        context: string;
        created_at: string;
      };
    }
  | {
      kind: 'flag';
      row: { question_id: string; wrong_index: number; lang: Lang; misconception: string; content: unknown; confidence: number };
    };

export type Dirty = {
  progress: boolean;
  settings: boolean;
  mastery: SkillId[];
  nudges: string[];
  usageToday: boolean;
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
  breaksDay: string;
  mastery: Mastery;
  answers: number;
  nudges: NudgeEntry[];
  feed: { day: string; minutes: number; saved: string[] };
  guardian: GuardianSettings;
  lock: LockWindow;
  requests: TimeRequest[];
  offline: SkillId[];
  built: BuildingId[];
  stats: ArmStats;
  review: ReviewItem[];
  reviewed: Record<string, 'approved' | 'edited'>;
  paused: boolean;
  lastMiss: { q: string; a: number } | null;

  // ── Account data (real builds) ──
  userId: string | null;
  studentName: string;
  guardians: { id: string; name: string }[];
  classes: { id: string; name: string; grade: number }[];
  usage: UsageDay[];
  /** YYYY-MM-DD → answers that day, for the learning heatmap. */
  learnDays: Record<string, number>;
  /** Weekly mastery per skill, oldest first (excluding now). */
  history: Record<SkillId, number[]>;
  dirty: Dirty;
  outbox: OutboxOp[];
  lastSync: string | null;
};

type Actions = {
  setRole: (role: Role) => void;
  setLang: (lang: Lang) => void;
  setThemePref: (pref: ThemePref) => void;
  setBedtime: (bedtime: Bedtime, days?: BedtimeDays) => void;
  setDemo: (patch: Partial<DemoOverrides>) => void;
  setOnboarded: (v: boolean) => void;
  addCoins: (n: number) => void;
  answer: (e: AnswerEvidence, meta?: AttemptMeta) => Mastery;
  setMastery: (m: Mastery) => void;
  logNudge: (level: NudgeEntry['level'], reasons: NudgeEntry['reasons'], response: NudgeResponse) => string;
  respondNudge: (id: string, response: NudgeResponse) => void;
  recordBreak: (learningMinutes?: number) => void;
  addFeedMinutes: (n: number) => void;
  toggleSaved: (id: string) => void;
  setGuardian: (patch: Partial<GuardianSettings>) => void;
  requestTime: () => string;
  resolveRequest: (id: string, status: 'approved' | 'declined') => void;
  toggleOffline: (skill: SkillId) => void;
  build: (id: BuildingId) => void;
  reward: (arm: keyof ArmStats, accepted: boolean) => void;
  flag: (item: Omit<ReviewItem, 'id'>, server?: Extract<OutboxOp, { kind: 'flag' }>['row']) => void;
  setReviewed: (id: string, status: 'approved' | 'edited') => void;
  setPaused: (v: boolean) => void;
  setLastMiss: (m: { q: string; a: number } | null) => void;
  /** Server → store, without marking anything dirty. */
  hydrate: (patch: Partial<State>) => void;
  /** Called by the sync engine once writes have landed. */
  clean: (patch: Partial<Dirty> & { outbox?: OutboxOp[] }) => void;
  reset: () => void;
};

export const todayKey = (d = new Date()) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

/** Last night's "15 more minutes" ask, so the pitch guardian inbox has something real. */
function seedRequest(): TimeRequest {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(21, 52, 0, 0);
  return { id: 'r-seed', at: d.toISOString(), minutes: 15, status: 'pending' };
}

export const PRIOR_MASTERY = Object.fromEntries(SKILLS.map((s) => [s.id, s.bkt.pL0])) as Mastery;
const EMPTY_HISTORY = Object.fromEntries(SKILLS.map((s) => [s.id, [] as number[]])) as unknown as Record<
  SkillId,
  number[]
>;
const CLEAN: Dirty = { progress: false, settings: false, mastery: [], nudges: [], usageToday: false };

const shared = () => ({
  themePref: 'auto' as ThemePref,
  bedtime: { start: 22 * 60, end: 6 * 60 },
  bedtimeDays: 'school' as BedtimeDays,
  demo: { clock: null, schoolDay: null, risk: null },
  breaksToday: 0,
  breaksDay: todayKey(),
  feed: { day: todayKey(), minutes: 0, saved: [] as string[] },
  lock: { start: 22 * 60, end: 6 * 60, unlockUntil: null },
  reviewed: {},
  paused: false,
  lastMiss: null,
  dirty: CLEAN,
  outbox: [],
  lastSync: null,
});

const pitchState = (): State => ({
  ...shared(),
  role: 'student',
  lang: 'en',
  onboarded: true,
  coins: 1240,
  mastery: { ...MIKA_MASTERY },
  answers: 142,
  nudges: seedNudges(),
  feed: { day: todayKey(), minutes: 6, saved: [] },
  guardian: { name: PITCH_NAMES.guardian, linked: true, lockEnabled: false, lateNightAlerts: true, limitStyle: 'adaptive' },
  requests: [seedRequest()],
  offline: ['fractions', 'algebraic'],
  built: [...SEED_BUILT],
  // Mika has accepted check-ins about half the time and breaks more often.
  stats: { checkin: { a: 3, b: 3 }, break: { a: 4, b: 2 }, winddown: { a: 3, b: 1 } },
  review: [...SEED_REVIEW],
  userId: null,
  studentName: PITCH_NAMES.student,
  guardians: [{ id: 'mom', name: PITCH_NAMES.guardian }],
  classes: [{ id: 'sampaguita', name: PITCH_NAMES.section, grade: 8 }],
  usage: [],
  learnDays: {},
  history: MIKA_HISTORY,
});

const realState = (): State => ({
  ...shared(),
  role: 'student',
  lang: 'en',
  onboarded: false,
  coins: 0,
  mastery: { ...PRIOR_MASTERY },
  answers: 0,
  nudges: [],
  guardian: { name: '', linked: false, lockEnabled: false, lateNightAlerts: true, limitStyle: 'adaptive' },
  requests: [],
  offline: [],
  built: ['bahay'],
  stats: { checkin: { a: 1, b: 1 }, break: { a: 1, b: 1 }, winddown: { a: 1, b: 1 } },
  review: [],
  userId: null,
  studentName: '',
  guardians: [],
  classes: [],
  usage: [],
  learnDays: {},
  history: EMPTY_HISTORY,
});

export const initialState = (): State => (IS_PITCH ? pitchState() : realState());

let nid = 0;
export const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(nid++).toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const addUnique = <T>(list: T[], v: T) => (list.includes(v) ? list : [...list, v]);

export const useAppStore = create<State & Actions>()(
  persist(
    (set, get) => ({
      ...initialState(),
      setRole: (role) => set({ role }),
      setLang: (lang) => set({ lang }),
      setThemePref: (themePref) => set({ themePref }),
      setBedtime: (bedtime, days) =>
        set((s) => ({ bedtime, bedtimeDays: days ?? s.bedtimeDays, dirty: { ...s.dirty, settings: true } })),
      setDemo: (patch) => set((s) => ({ demo: { ...s.demo, ...patch } })),
      setOnboarded: (onboarded) => set((s) => ({ onboarded, dirty: { ...s.dirty, progress: true } })),
      addCoins: (n) => set((s) => ({ coins: s.coins + n, dirty: { ...s.dirty, progress: true } })),
      answer: (e, meta) => {
        const s = get();
        const next = gapEngine.update(s.mastery, e, meta?.context === 'pretest' ? 0.5 : undefined);
        const day = todayKey();
        const outbox: OutboxOp[] = meta
          ? [
              ...s.outbox,
              {
                kind: 'attempt',
                row: {
                  client_id: uid('a'),
                  question_id: meta.questionId,
                  skill_id: e.skill,
                  chosen: meta.chosen,
                  correct: e.correct,
                  seconds: Math.min(32000, Math.round(e.seconds)),
                  hints: e.hints,
                  context: meta.context,
                  created_at: new Date().toISOString(),
                },
              },
            ]
          : s.outbox;
        set({
          mastery: next,
          answers: s.answers + 1,
          learnDays: { ...s.learnDays, [day]: (s.learnDays[day] ?? 0) + 1 },
          outbox,
          dirty: { ...s.dirty, progress: true, mastery: addUnique(s.dirty.mastery, e.skill) },
        });
        return next;
      },
      setMastery: (mastery) => set({ mastery }),
      logNudge: (level, reasons, response) => {
        const id = uid('n');
        set((s) => ({
          nudges: [{ id, at: new Date().toISOString(), level, reasons, response }, ...s.nudges].slice(0, 60),
          dirty: { ...s.dirty, nudges: addUnique(s.dirty.nudges, id) },
        }));
        return id;
      },
      respondNudge: (id, response) =>
        set((s) => ({
          nudges: s.nudges.map((n) => (n.id === id ? { ...n, response } : n)),
          dirty: { ...s.dirty, nudges: addUnique(s.dirty.nudges, id) },
        })),
      recordBreak: (learningMinutes = 1) =>
        set((s) => {
          const day = todayKey();
          const breaksToday = (s.breaksDay === day ? s.breaksToday : 0) + 1;
          const usage = [...s.usage];
          const i = usage.findIndex((u) => u.day === day);
          const base: UsageDay =
            i >= 0
              ? usage[i]
              : {
                  day,
                  total: 0,
                  video: 0,
                  social: 0,
                  games: 0,
                  late: 0,
                  offAt: null,
                  breaks: 0,
                  learning: 0,
                  sessions: 0,
                  unlocks: 0,
                };
          const row = { ...base, breaks: breaksToday, learning: base.learning + learningMinutes };
          if (i >= 0) usage[i] = row;
          else usage.push(row);
          return {
            breaksToday,
            breaksDay: day,
            usage,
            dirty: { ...s.dirty, usageToday: true, progress: true },
          };
        }),
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
          dirty: { ...s.dirty, progress: true },
        })),
      setGuardian: (patch) =>
        set((s) => ({
          guardian: { ...s.guardian, ...patch },
          dirty: patch.limitStyle ? { ...s.dirty, settings: true } : s.dirty,
        })),
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
          dirty: { ...s.dirty, progress: true },
        })),
      build: (id) =>
        set((s) => (s.built.includes(id) ? s : { built: [...s.built, id], dirty: { ...s.dirty, progress: true } })),
      reward: (arm, accepted) =>
        set((s) => ({
          stats: {
            ...s.stats,
            [arm]: { a: s.stats[arm].a + (accepted ? 1 : 0), b: s.stats[arm].b + (accepted ? 0 : 1) },
          },
          dirty: { ...s.dirty, progress: true },
        })),
      flag: (item, server) =>
        set((s) => ({
          review: [{ ...item, id: uid('rv') }, ...s.review],
          outbox: server ? [...s.outbox, { kind: 'flag', row: server }] : s.outbox,
        })),
      setReviewed: (id, status) => set((s) => ({ reviewed: { ...s.reviewed, [id]: status } })),
      setPaused: (paused) => set((s) => ({ paused, dirty: { ...s.dirty, settings: true } })),
      setLastMiss: (lastMiss) => set({ lastMiss }),
      hydrate: (patch) => set(patch),
      clean: ({ outbox, ...flags }) =>
        set((s) => ({
          dirty: {
            progress: flags.progress === false ? false : s.dirty.progress,
            settings: flags.settings === false ? false : s.dirty.settings,
            usageToday: flags.usageToday === false ? false : s.dirty.usageToday,
            mastery: flags.mastery ? s.dirty.mastery.filter((m) => !flags.mastery!.includes(m)) : s.dirty.mastery,
            nudges: flags.nudges ? s.dirty.nudges.filter((n) => !flags.nudges!.includes(n)) : s.dirty.nudges,
          },
          outbox: outbox ? s.outbox.filter((o) => !outbox.includes(o)) : s.outbox,
        })),
      reset: () => set(initialState()),
    }),
    {
      name: IS_PITCH ? 'learnshift-pitch' : 'learnshift-app',
      version: 3,
      storage: createJSONStorage(() => AsyncStorage),
      // Any older shape: start fresh.
      migrate: () => initialState(),
      // Today's break count resets at midnight.
      onRehydrateStorage: () => (s) => {
        if (s && s.breaksDay !== todayKey()) s.hydrate({ breaksToday: 0, breaksDay: todayKey() });
      },
    },
  ),
);

export function nowMinutes(override: number | null): number {
  if (override != null) return override;
  const d = new Date();
  return d.getHours() * 60 + d.getMinutes();
}

export function inWindow(minutes: number, { start, end }: Bedtime): boolean {
  if (start === end) return false;
  return start <= end ? minutes >= start && minutes < end : minutes >= start || minutes < end;
}

/** True when the bedtime window applies tonight given which nights are selected. */
export function bedtimeApplies(days: BedtimeDays, schoolNight: boolean): boolean {
  if (days === 'every') return true;
  return days === 'school' ? schoolNight : !schoolNight;
}

/** Whether the guardian lock is in force right now. */
export function lockActive(s: Pick<State, 'guardian' | 'lock'>, clock: number, now = Date.now()): boolean {
  if (!s.guardian.lockEnabled) return false;
  if (!inWindow(clock, { start: s.lock.start, end: s.lock.end })) return false;
  return !(s.lock.unlockUntil && Date.parse(s.lock.unlockUntil) > now);
}

export type { NudgeAction };

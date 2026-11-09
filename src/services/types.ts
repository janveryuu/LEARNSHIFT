/**
 * Service contracts. The UI only talks to these interfaces; today they are
 * backed by deterministic mocks, later by on-device models and a backend.
 */
import type { Lang } from '@/store/useAppStore';
import type { LText } from '@/i18n/useT';
import type { MisconceptionId } from '@/data/questions';
import type { SkillId } from '@/data/skills';
import type { RiskLevel } from '@/design/tokens';

// ── 1. Session risk model (on-device) ────────────────────────────────────────

export type AppCategory = 'video' | 'social' | 'games' | 'study' | 'other';

/** Usage metadata only. Never content, messages or screens. */
export type UsageFeatures = {
  /** Minutes after midnight. */
  clock: number;
  sessionMinutes: number;
  category: AppCategory;
  unlocksLastHour: number;
  minutesSinceBreak: number;
  schoolDay: boolean;
  /** Inside the learner's bedtime window. */
  inBedtime: boolean;
};

export type RiskReason =
  | { key: 'minutes'; value: number }
  | { key: 'clock'; value: number }
  | { key: 'schoolDay' }
  | { key: 'weekend' }
  | { key: 'pastBedtime' }
  | { key: 'unlocks'; value: number }
  | { key: 'noBreak'; value: number }
  | { key: 'videos' };

export type RiskResult = {
  risk: number;
  lateNight: boolean;
  level: RiskLevel;
  reasons: RiskReason[];
};

export interface RiskModel {
  score(f: UsageFeatures): RiskResult;
}

// ── 2. Knowledge gap engine (BKT) ────────────────────────────────────────────

export type Mastery = Record<SkillId, number>;

export type AnswerEvidence = {
  skill: SkillId;
  correct: boolean;
  /** Seconds to answer. */
  seconds: number;
  hints: number;
};

export type Forecast = { weeks: number; date: Date; mastered: boolean };

export interface GapEngine {
  /** `damping` overrides how far one answer moves mastery (the pre-test uses more). */
  update(mastery: Mastery, e: AnswerEvidence, damping?: number): Mastery;
  /** Deepest weak prerequisite behind `target`. */
  rootGap(mastery: Mastery, target?: SkillId): SkillId;
  /** Weak skills that `root` is holding back. */
  blocked(mastery: Mastery, root: SkillId): SkillId[];
  forecast(mastery: Mastery, skill: SkillId, breaksPerWeek?: number, from?: Date): Forecast;
}

// ── 3. Intervention policy (bandit + guardrails) ─────────────────────────────

export type NudgeAction = 'quiet' | 'checkin' | 'break' | 'winddown' | 'lock';

export type ArmStats = Record<Exclude<NudgeAction, 'quiet' | 'lock'>, { a: number; b: number }>;

export type PolicyInput = {
  risk: RiskResult;
  rootGap: SkillId;
  gapDue: boolean;
  stats: ArmStats;
  guardian: { lockEnabled: boolean };
  paused: boolean;
  focusing: boolean;
  /** Deterministic seed for Thompson sampling (demo replays identically). */
  seed: number;
};

export type PolicyDecision = {
  action: NudgeAction;
  /** Which guardrail or arm decided. */
  rule: 'paused' | 'focus' | 'night-no-quiz' | 'lock-enabled' | 'low-risk' | 'bandit';
  skill: SkillId;
};

export interface InterventionPolicy {
  next(input: PolicyInput): PolicyDecision;
}

// ── 4. Grounded tutor ────────────────────────────────────────────────────────

export type TutorVariant = 'default' | 'simpler' | 'example2';

export type TutorAnswer = {
  misconception: MisconceptionId;
  what: string;
  steps: string[];
  example: string;
  check: { prompt: string; options: string[]; answer: number } | null;
  /** 0–1. Below 0.7 the answer is flagged for teacher review. */
  confidence: number;
  source: 'bank' | 'generated';
};

export interface Tutor {
  explain(questionId: string, wrongIndex: number, lang: Lang, variant?: TutorVariant): Promise<TutorAnswer>;
}

// ── Usage provider ───────────────────────────────────────────────────────────

export type DaySummary = {
  /** 0 = Sunday. */
  weekday: number;
  minutes: number;
  lateMinutes: number;
  breaks: number;
  /** Minutes after midnight the phone went quiet. */
  offAt: number;
};

export interface UsageProvider {
  /** The last 7 days, oldest first, today last. */
  week(now: Date): DaySummary[];
  /** The features for "right now", honoring demo overrides. */
  live(input: { clock: number; schoolDay: boolean; inBedtime: boolean; simMinutes: number }): UsageFeatures;
}

export type Localized = LText;

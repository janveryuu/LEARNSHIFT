import type { DaySummary, UsageFeatures, UsageProvider } from '../types';

/** Mika's last 7 days, oldest first; index 6 is today (minutes so far). */
const WEEK: Omit<DaySummary, 'weekday'>[] = [
  { minutes: 150, lateMinutes: 0, breaks: 2, offAt: 21 * 60 + 40 },
  { minutes: 132, lateMinutes: 0, breaks: 3, offAt: 22 * 60 + 4 },
  { minutes: 170, lateMinutes: 12, breaks: 1, offAt: 23 * 60 + 52 },
  { minutes: 124, lateMinutes: 0, breaks: 0, offAt: 21 * 60 + 55 },
  { minutes: 118, lateMinutes: 0, breaks: 2, offAt: 22 * 60 },
  { minutes: 96, lateMinutes: 0, breaks: 1, offAt: 21 * 60 + 30 },
  { minutes: 134, lateMinutes: 0, breaks: 0, offAt: 0 },
];

/** Same figures, previous week: the "↓ 32m vs last week" baseline. */
export const LAST_WEEK_AVG = 166;

/**
 * Emits a believable stream for the demo persona plus the live session that
 * the ShortVids simulator drives. A real build reads UsageStatsManager /
 * Screen Time aggregates here: timestamps and categories, never content.
 */
export const usageProvider: UsageProvider = {
  week(now) {
    const today = now.getDay();
    return WEEK.map((d, i) => ({ ...d, weekday: (today - (6 - i) + 7) % 7 }));
  },

  live({ clock, schoolDay, inBedtime, simMinutes }): UsageFeatures {
    const active = simMinutes > 0;
    return {
      clock,
      sessionMinutes: active ? simMinutes : 6,
      category: active ? 'video' : 'other',
      unlocksLastHour: active ? 8 : 4,
      minutesSinceBreak: active ? simMinutes : 38,
      schoolDay,
      inBedtime,
    };
  },
};

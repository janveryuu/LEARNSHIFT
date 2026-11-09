import { useMemo } from 'react';

import type { StreakDay } from '@/components/ui';
import { formatClock, formatDuration, useT } from '@/i18n/useT';
import { LAST_WEEK_AVG, usageProvider } from '@/services/usage/MockUsageProvider';
import type { DaySummary } from '@/services/types';
import { IS_PITCH } from '@/lib/config';
import { todayKey, useAppStore, type UsageDay } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export type Week = {
  days: DaySummary[];
  streak: StreakDay[];
  /** Consecutive learning days ending today. */
  streakCount: number;
  avgMinutes: number;
  dropMinutes: number;
  lateMinutes: number;
  breaks: number;
  breakTarget: number;
};

/** Mika's week for Home and Insights, with today's live figures folded in. */
export function useWeek(): Week {
  const t = useT();
  const breaksToday = useAppStore((s) => s.breaksToday);
  const sim = useSession((s) => s.simMinutes);
  const usage = useAppStore((s) => s.usage);

  return useMemo(() => {
    const now = new Date();
    const today = now.getDay();
    const days = IS_PITCH
      ? usageProvider
          .week(now)
          .map((d, i) => (i === 6 ? { ...d, breaks: breaksToday, minutes: d.minutes + Math.round(sim) } : d))
      : realWeek(usage, now, breaksToday);
    const lastWeekAvg = IS_PITCH ? LAST_WEEK_AVG : previousAvg(usage, now);
    const byWeekday = new Map(days.map((d) => [d.weekday, d]));

    const streak: StreakDay[] = Array.from({ length: 7 }, (_, i) => {
      if (i > today) return { state: 'future' };
      const d = byWeekday.get(i);
      if (i === today) return { state: 'today', info: `${t.common.today} · ${t.streak.soFar(breaksToday)}` };
      if (!d) return { state: 'future' };
      return {
        state: d.breaks > 0 ? 'done' : 'rest',
        lateNight: d.lateMinutes > 0,
        info: `${t.days.long[i]} · ${t.streak.breaks(d.breaks)} · ${t.streak.offAt(formatClock(d.offAt))}`,
      };
    });

    let streakCount = breaksToday > 0 ? 1 : 0;
    for (let i = 5; i >= 0; i--) {
      if (days[i].breaks > 0) streakCount++;
      else break;
    }

    const past = days.slice(0, 6);
    const avgMinutes = Math.round(days.reduce((a, d) => a + d.minutes, 0) / 7);
    return {
      days,
      streak,
      streakCount,
      avgMinutes,
      dropMinutes: lastWeekAvg == null ? 0 : Math.max(0, lastWeekAvg - avgMinutes),
      lateMinutes: days.reduce((a, d) => a + d.lateMinutes, 0),
      breaks: past.reduce((a, d) => a + d.breaks, 0) + breaksToday,
      breakTarget: 12,
    };
  }, [t, breaksToday, sim, usage]);
}

const DAY_MS = 24 * 3600 * 1000;

/** The last 7 days from synced usage, oldest first, empty days as zeros. */
export function realWeek(usage: UsageDay[], now: Date, breaksToday: number): DaySummary[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now.getTime() - (6 - i) * DAY_MS);
    const row = usage.find((u) => u.day === todayKey(d));
    return {
      weekday: d.getDay(),
      minutes: row?.total ?? 0,
      lateMinutes: row?.late ?? 0,
      breaks: i === 6 ? Math.max(breaksToday, row?.breaks ?? 0) : (row?.breaks ?? 0),
      offAt: row?.offAt ?? 0,
    };
  });
}

/** Average daily minutes over days 7–13 ago, or null without data. */
function previousAvg(usage: UsageDay[], now: Date): number | null {
  const rows = Array.from({ length: 7 }, (_, i) => usage.find((u) => u.day === todayKey(new Date(now.getTime() - (7 + i) * DAY_MS))));
  const have = rows.filter((r): r is UsageDay => !!r && r.total > 0);
  if (have.length < 3) return null;
  return Math.round(have.reduce((a, r) => a + r.total, 0) / have.length);
}

/** "2h 14m" → ["2h 14", "m"] so the unit can render small. */
export function splitDuration(minutes: number): [string, string] {
  const s = formatDuration(minutes);
  return [s.slice(0, -1), s.slice(-1)];
}

/** Habits-only grade for guardians (they never see mastery). */
export function habitGrade(breaks: number, target: number, lateMinutes: number) {
  const score = 0.55 * Math.min(1, breaks / target) + 0.45 * Math.max(0, 1 - lateMinutes / 40);
  const grade =
    score >= 0.9 ? 'A' : score >= 0.8 ? 'A-' : score >= 0.7 ? 'B+' : score >= 0.6 ? 'B' : score >= 0.5 ? 'C+' : 'C';
  return { score, grade };
}

/** Letter grade from the week: calm nights, breaks taken and mastery trend. */
export function weeklyGrade(breaks: number, target: number, lateMinutes: number, masteryUp: number) {
  const score =
    0.45 * Math.min(1, breaks / target) +
    0.35 * Math.max(0, 1 - lateMinutes / 40) +
    0.2 * Math.min(1, masteryUp / 0.25);
  const grade =
    score >= 0.9 ? 'A' : score >= 0.8 ? 'A-' : score >= 0.7 ? 'B+' : score >= 0.6 ? 'B' : score >= 0.5 ? 'C+' : 'C';
  return { score, grade };
}

/** How much a skill grew since the oldest weekly point we have (0 when no history). */
export function masteryGain(now: number, history: number[]): number {
  return history.length ? Math.max(0, now - history[0]) : 0;
}

/** Learning-day intensities for the heatmap, `weeks` × 7 (oldest first), from answers per day. */
export function learnHeatmap(days: Record<string, number>, weeks: number, today = new Date()): number[] {
  const total = weeks * 7;
  const lastIndex = total - 1 - (6 - today.getDay());
  return Array.from({ length: total }, (_, i) => {
    if (i > lastIndex) return 0;
    const d = new Date(today.getTime() - (lastIndex - i) * 24 * 3600 * 1000);
    const y = d.getFullYear();
    const key = `${y}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const n = days[key] ?? 0;
    return n === 0 ? 0 : n < 3 ? 1 : n < 6 ? 2 : n < 10 ? 3 : 4;
  });
}

import { useMemo } from 'react';

import type { StreakDay } from '@/components/ui';
import { formatClock, formatDuration, useT } from '@/i18n/useT';
import { LAST_WEEK_AVG, usageProvider } from '@/services/usage/MockUsageProvider';
import type { DaySummary } from '@/services/types';
import { useAppStore } from '@/store/useAppStore';
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

  return useMemo(() => {
    const now = new Date();
    const today = now.getDay();
    const days = usageProvider
      .week(now)
      .map((d, i) => (i === 6 ? { ...d, breaks: breaksToday, minutes: d.minutes + Math.round(sim) } : d));
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
      dropMinutes: Math.max(0, LAST_WEEK_AVG - avgMinutes),
      lateMinutes: days.reduce((a, d) => a + d.lateMinutes, 0),
      breaks: past.reduce((a, d) => a + d.breaks, 0) + breaksToday,
      breakTarget: 12,
    };
  }, [t, breaksToday, sim]);
}

/** "2h 14m" → ["2h 14", "m"] so the unit can render small. */
export function splitDuration(minutes: number): [string, string] {
  const s = formatDuration(minutes);
  return [s.slice(0, -1), s.slice(-1)];
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

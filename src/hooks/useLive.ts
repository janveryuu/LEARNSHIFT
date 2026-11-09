import { useEffect, useMemo, useState } from 'react';

import { SKILL_BY_ID, type SkillId } from '@/data/skills';
import { formatClock, type LText } from '@/i18n/useT';
import type { Strings } from '@/i18n/en';
import { gapEngine } from '@/services/ai/gapEngine';
import { levelFor, riskModel } from '@/services/ai/riskModel';
import type { RiskReason, RiskResult, UsageFeatures } from '@/services/types';
import { IS_PITCH } from '@/lib/config';
import { useDevice } from '@/services/monitor/bridge';
import { usageProvider } from '@/services/usage/MockUsageProvider';
import { inWindow, nowMinutes, todayKey, useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export type Live = {
  clock: number;
  schoolDay: boolean;
  inBedtime: boolean;
  features: UsageFeatures;
  risk: RiskResult;
  capMinutes: number;
  usedMinutes: number;
  root: SkillId;
  blocked: SkillId[];
};

function useClock(): number {
  const override = useAppStore((s) => s.demo.clock);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (override != null) return;
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, [override]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => nowMinutes(override), [override, tick]);
}

const round15 = (m: number) => Math.round(m / 15) * 15;

/** Everything the student screens derive from "now": risk, cap, root gap. */
export function useLive(): Live {
  const clock = useClock();
  const demo = useAppStore((s) => s.demo);
  const bedtime = useAppStore((s) => s.bedtime);
  const mastery = useAppStore((s) => s.mastery);
  const limitStyle = useAppStore((s) => s.guardian.limitStyle);
  const simMinutes = useSession((s) => s.simMinutes);
  const device = useDevice((s) => s.live);
  const usage = useAppStore((s) => s.usage);

  return useMemo(() => {
    const weekday = new Date().getDay();
    const schoolDay = demo.schoolDay ?? (weekday >= 1 && weekday <= 5);
    const inBedtime = inWindow(clock, bedtime);
    const today = usage.find((u) => u.day === todayKey());
    const features: UsageFeatures = IS_PITCH
      ? usageProvider.live({ clock, schoolDay, inBedtime, simMinutes })
      : {
          clock,
          sessionMinutes: device?.sessionMinutes ?? 0,
          category: device?.category ?? 'other',
          unlocksLastHour: device?.unlocksLastHour ?? 0,
          minutesSinceBreak: device?.sessionMinutes ?? 0,
          schoolDay,
          inBedtime,
        };
    let risk = riskModel.score(features);
    if (demo.risk != null) risk = { ...risk, risk: demo.risk, level: levelFor(demo.risk, risk.lateNight) };

    const base = schoolDay ? 180 : 240;
    const capMinutes = limitStyle === 'fixed' ? base : Math.max(60, round15(base * (1.15 - 0.5 * risk.risk)));
    const usedMinutes = IS_PITCH
      ? usageProvider.week(new Date())[6].minutes + Math.round(simMinutes)
      : (today?.total ?? 0);
    const root = gapEngine.rootGap(mastery);
    const blocked = gapEngine.blocked(mastery, root);
    return { clock, schoolDay, inBedtime, features, risk, capMinutes, usedMinutes, root, blocked };
  }, [clock, demo.schoolDay, demo.risk, bedtime, mastery, limitStyle, simMinutes, device, usage]);
}

/** Localized chip text for one risk-model reason. */
export function reasonText(t: Strings, r: RiskReason): string {
  switch (r.key) {
    case 'minutes':
      return t.reasons.minutes(r.value);
    case 'clock':
      return formatClock(r.value);
    case 'schoolDay':
      return t.reasons.schoolDay;
    case 'weekend':
      return t.reasons.weekend;
    case 'pastBedtime':
      return t.reasons.pastBedtime;
    case 'unlocks':
      return t.reasons.unlocks(r.value);
    case 'noBreak':
      return t.reasons.noBreak(r.value);
    case 'videos':
      return t.reasons.videos;
    case 'limit':
      return t.reasons.limit(r.value);
  }
}

export function skillName(id: SkillId): LText {
  return SKILL_BY_ID[id].name;
}

/**
 * iPhone screen-use detection with Apple Screen Time (DeviceActivity).
 *
 * Apple never shows other apps' usage to an app. Instead, the student picks
 * apps once, and Apple's background extension fires at time thresholds:
 *   - daytime: 30 / 45 / 60 / 90 min on the chosen apps today → study nudge
 *   - bedtime: 10 min on the chosen apps after bedtime → wind-down + guardian alert
 *   - lock hours (if the guardian turned the lock on) → a real Screen Time shield
 * Each threshold also reports to the server, so the guardian sees it.
 */
import { Platform } from 'react-native';

type DA = typeof import('react-native-device-activity');

let mod: DA | null = null;
function lib(): DA | null {
  if (Platform.OS !== 'ios') return null;
  if (!mod) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      mod = require('react-native-device-activity') as DA;
    } catch {
      mod = null;
    }
  }
  return mod;
}

export const SELECTION_ID = 'ls-watch';
const DAY = 'ls-day';
const BED = ['ls-bed-a', 'ls-bed-b'];
const LOCK = ['ls-lock-a', 'ls-lock-b'];
const RELOCK = 'ls-relock';

export function available(): boolean {
  try {
    return !!lib()?.isAvailable();
  } catch {
    return false;
  }
}

export function status() {
  const da = lib();
  if (!da) return { authorized: false, monitoring: false, apps: 0 };
  const authorized = da.getAuthorizationStatus() === 2;
  const sel = da.getFamilyActivitySelectionId(SELECTION_ID);
  const meta = sel ? da.activitySelectionMetadata({ activitySelectionId: SELECTION_ID }) : undefined;
  const apps = meta
    ? (meta.applicationCount ?? 0) + (meta.categoryCount ?? 0) + (meta.webDomainCount ?? 0)
    : 0;
  return { authorized, monitoring: da.getActivities().length > 0, apps };
}

export async function authorize(): Promise<boolean> {
  const da = lib();
  if (!da) return false;
  await da.requestAuthorization('individual');
  return da.getAuthorizationStatus() === 2;
}

/** Saves the student's chosen apps (from the picker) under our selection id. */
export function saveSelection(selection: string) {
  lib()?.setFamilyActivitySelectionId({ id: SELECTION_ID, familyActivitySelection: selection });
}

export function stopAll() {
  const da = lib();
  if (!da) return;
  da.stopMonitoring();
  try {
    da.unblockSelection({ activitySelectionId: SELECTION_ID });
  } catch {
    // nothing blocked
  }
}

export function testNudge() {
  const da = lib();
  if (!da) return false;
  da.configureActions({
    activityName: 'ls-test',
    callbackName: 'intervalDidStart',
    actions: [{ type: 'sendNotification', payload: { title: 'LearnShift test', body: 'Screen Time nudges are working.' } }],
  });
  return true;
}

type Payload = {
  enabled: boolean;
  url: string;
  key: string;
  deviceToken: string;
  lang: 'en' | 'fil';
  bedtimeStart: number;
  bedtimeEnd: number;
  bedtimeDays: string;
  lockEnabled: boolean;
  lockStart: number;
  lockEnd: number;
  unlockUntil: number;
  rootSkill: string;
  rootSkillName: string;
  guardianName: string;
  paused: boolean;
  scrollLimit: number | null;
};

const hm = (m: number) => ({ hour: Math.floor(m / 60) % 24, minute: m % 60 });
const fmt = (m: number) => {
  const h = Math.floor(m / 60) % 24;
  return `${h % 12 || 12}:${String(m % 60).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Splits a window that crosses midnight into two same-day intervals. */
function windows(start: number, end: number): [number, number][] {
  if (start === end) return [];
  if (start < end) return [[start, end - 1]];
  return [
    [start, 1439],
    [0, Math.max(0, end - 1)],
  ].filter(([a, b]) => b - a >= 15) as [number, number][];
}

export function configure(p: Payload) {
  const da = lib();
  if (!da) return;
  da.stopMonitoring();
  const selection = da.getFamilyActivitySelectionId(SELECTION_ID);
  if (!p.enabled || !selection || da.getAuthorizationStatus() !== 2) return;

  const fil = p.lang === 'fil';
  const ingest = (body: Record<string, unknown>) => ({
    type: 'sendHttpRequest' as const,
    url: `${p.url}/functions/v1/ingest`,
    options: {
      method: 'POST' as const,
      headers: { 'content-type': 'application/json', apikey: p.key, 'x-device-token': p.deviceToken },
      body: { platform: 'ios', ...body },
    },
  });

  // Daytime thresholds.
  if (!p.paused) {
    // Apple counts total time on the chosen apps today, so the guardian's
    // limit becomes the first threshold.
    const lim = p.scrollLimit ?? 0;
    const steps = [...new Set([...(lim ? [lim] : []), 30, 45, 60, 90])].sort((a, b) => a - b);
    for (const m of steps) {
      const level = m >= 60 || m === lim ? 'break' : 'checkin';
      da.configureActions({
        activityName: DAY,
        callbackName: 'eventDidReachThreshold',
        eventName: `m${m}`,
        actions: [
          {
            type: 'sendNotification',
            payload: {
              title:
                m === lim
                  ? fil
                    ? `Naabot na ang ${m}-min na limit`
                    : `${m}-min limit reached`
                  : fil
                    ? `${m} min ka na ngayong araw`
                    : `${m} min on your apps today`,
              body: fil
                ? `Break? 45 segundo ng ${p.rootSkillName} kasama si Tarsi.`
                : `Break? 45 seconds of ${p.rootSkillName} with Tarsi.`,
              userInfo: { url: `/break/${p.rootSkill}` },
            },
          },
          ingest({ events: [{ client_id: `ios-day-${m}`, level, reasons: [{ key: 'minutes', value: m }] }] }),
        ],
      });
    }
    da.startMonitoring(
      DAY,
      { intervalStart: { hour: 0, minute: 0 }, intervalEnd: { hour: 23, minute: 59 }, repeats: true },
      steps.map((m) => ({
        eventName: `m${m}`,
        familyActivitySelection: selection,
        threshold: { minute: m % 60, hour: Math.floor(m / 60) },
      })),
    );
  }

  // Bedtime: 10 minutes on the chosen apps → wind-down.
  windows(p.bedtimeStart, p.bedtimeEnd).forEach(([a, b], i) => {
    da.configureActions({
      activityName: BED[i],
      callbackName: 'eventDidReachThreshold',
      eventName: 'late10',
      actions: [
        {
          type: 'sendNotification',
          payload: {
            title: fil ? 'Oras na para magpahinga' : 'Time to wind down',
            body: fil ? 'Lampas na sa oras ng tulog mo. May kalmadong wind-down si Tarsi.' : 'It’s past your bedtime. Tarsi has a calm wind-down ready.',
            userInfo: { url: '/winddown' },
          },
        },
        ingest({ events: [{ client_id: `ios-bed-${i}`, level: 'winddown', reasons: [{ key: 'pastBedtime' }] }] }),
      ],
    });
    da.startMonitoring(BED[i], { intervalStart: hm(a), intervalEnd: hm(b), repeats: true }, [
      { eventName: 'late10', familyActivitySelection: selection, threshold: { minute: 10 } },
    ]);
  });

  // Guardian lock: a real shield on the chosen apps during lock hours.
  if (p.lockEnabled) {
    da.updateShield(
      {
        title: fil ? 'Nagpapahinga ang mga app' : 'Apps are resting',
        subtitle: fil
          ? `Night lock ni ${p.guardianName || 'guardian mo'} hanggang ${fmt(p.lockEnd)}. Laging gumagana ang emergency call.`
          : `${p.guardianName || 'Your guardian'} set the night lock until ${fmt(p.lockEnd)}. Emergency calls always work.`,
        primaryButtonLabel: 'OK',
        secondaryButtonLabel: fil ? 'Humingi ng 15 min' : 'Ask for 15 min',
        iconSystemName: 'moon.stars.fill',
      },
      {
        primary: { behavior: 'close' },
        secondary: {
          behavior: 'close',
          actions: [
            {
              type: 'sendNotification',
              payload: {
                title: fil ? 'I-tap para humingi ng 15 min' : 'Tap to ask for 15 min',
                body: fil ? 'Bubuksan ang LearnShift.' : 'Opens LearnShift.',
                userInfo: { url: '/lock' },
              },
            },
          ],
        },
      },
    );
    const now = Date.now();
    const unlocked = p.unlockUntil > now;
    windows(p.lockStart, p.lockEnd).forEach(([a, b], i) => {
      da.configureActions({
        activityName: LOCK[i],
        callbackName: 'intervalDidStart',
        actions: [{ type: 'blockSelection', familyActivitySelectionId: SELECTION_ID }],
      });
      da.configureActions({
        activityName: LOCK[i],
        callbackName: 'intervalDidEnd',
        actions: [{ type: 'unblockSelection', familyActivitySelectionId: SELECTION_ID }],
      });
      da.startMonitoring(LOCK[i], { intervalStart: hm(a), intervalEnd: hm(b), repeats: true }, []);
    });
    const d = new Date();
    const clock = d.getHours() * 60 + d.getMinutes();
    const inLock =
      p.lockStart < p.lockEnd ? clock >= p.lockStart && clock < p.lockEnd : clock >= p.lockStart || clock < p.lockEnd;
    if (inLock && !unlocked) da.blockSelection({ activitySelectionId: SELECTION_ID });
    if (unlocked) {
      da.unblockSelection({ activitySelectionId: SELECTION_ID });
      // Lock again when the approved minutes run out.
      const at = new Date(p.unlockUntil);
      const startMin = at.getHours() * 60 + at.getMinutes();
      da.configureActions({
        activityName: RELOCK,
        callbackName: 'intervalDidStart',
        actions: [{ type: 'blockSelection', familyActivitySelectionId: SELECTION_ID }],
      });
      da.startMonitoring(
        RELOCK,
        { intervalStart: hm(startMin), intervalEnd: hm(Math.min(1439, startMin + 30)), repeats: false },
        [],
      );
    }
  } else {
    try {
      da.unblockSelection({ activitySelectionId: SELECTION_ID });
    } catch {
      // nothing blocked
    }
  }
}

/**
 * Screen-use monitor: one interface over
 *   - Android: our native UsageMonitor module (usage access + background service)
 *   - iPhone:  Apple Screen Time via react-native-device-activity (needs Apple's
 *              Family Controls approval; on only when the build has a Team ID)
 *   - web / Expo Go: unsupported, everything resolves to "off".
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

import { UsageMonitor, type LiveSession, type NativeDay } from '../../../modules/usage-monitor';
import { SKILL_BY_ID, type SkillId } from '@/data/skills';
import { SUPABASE_KEY, SUPABASE_URL } from '@/lib/config';
import { createDeviceToken } from '@/services/backend/api';

import * as ios from './ios';

export type MonitorPlatform = 'android' | 'ios' | 'none';

export const platform: MonitorPlatform =
  Platform.OS === 'android' && UsageMonitor
    ? 'android'
    : Platform.OS === 'ios' && Constants.expoConfig?.extra?.screenTime === true && ios.available()
      ? 'ios'
      : 'none';

export type MonitorStatus = {
  platform: MonitorPlatform;
  /** Android usage access / iOS Screen Time authorization. */
  access: boolean;
  /** Android only: can bring the lock screen over other apps. */
  overlay: boolean;
  /** Android only: exempt from battery optimization (keeps detection alive). */
  battery: boolean;
  running: boolean;
  /** iOS only: number of apps/categories chosen to watch. */
  apps: number;
  brand: string;
  /** Break reminders can pop up (app notifications on, channel not muted). */
  notifications: boolean;
};

export function status(): MonitorStatus {
  if (platform === 'android' && UsageMonitor) {
    return {
      platform,
      access: UsageMonitor.hasUsageAccess(),
      overlay: UsageMonitor.canDrawOverlays(),
      battery: UsageMonitor.isIgnoringBatteryOptimizations(),
      running: UsageMonitor.isRunning(),
      apps: 0,
      brand: UsageMonitor.deviceBrand(),
      notifications: UsageMonitor.notificationsEnabled?.() ?? true,
    };
  }
  if (platform === 'ios') {
    const s = ios.status();
    return {
      platform,
      access: s.authorized,
      overlay: true,
      battery: true,
      running: s.monitoring,
      apps: s.apps,
      brand: 'apple',
      notifications: true,
    };
  }
  return { platform, access: false, overlay: false, battery: false, running: false, apps: 0, brand: '', notifications: false };
}

/** Opens the system screen where the student grants access. */
export async function requestAccess(): Promise<boolean> {
  if (platform === 'android') {
    UsageMonitor!.openUsageAccessSettings();
    return false; // the screen re-checks when the app comes back
  }
  if (platform === 'ios') return ios.authorize();
  return false;
}

export function openOverlaySettings() {
  UsageMonitor?.openOverlaySettings();
}

export function openNotificationSettings() {
  if (UsageMonitor?.openNotificationSettings) UsageMonitor.openNotificationSettings();
  else UsageMonitor?.openAppSettings();
}

export function openBatterySettings() {
  UsageMonitor?.openBatterySettings();
}

export async function getLive(): Promise<LiveSession | null> {
  if (platform !== 'android') return null;
  try {
    return await UsageMonitor!.getLive();
  } catch {
    return null;
  }
}

export async function getDays(count = 7): Promise<NativeDay[]> {
  if (platform !== 'android') return [];
  try {
    return await UsageMonitor!.getDays(count);
  } catch {
    return [];
  }
}

export async function reportNow() {
  if (platform === 'android') await UsageMonitor!.reportNow().catch(() => false);
}

export function testNudge(level: 'checkin' | 'break' | 'winddown' | 'lock') {
  if (platform === 'android') return UsageMonitor!.testNudge(level);
  if (platform === 'ios') return ios.testNudge();
  return false;
}

// ── Configuration ────────────────────────────────────────────────────────

const TOKEN_KEY = 'learnshift-device-token';

/** The monitor reports with its own device token; created once per install. */
async function deviceToken(userId: string): Promise<string | null> {
  const key = `${TOKEN_KEY}-${userId}`;
  const saved = await AsyncStorage.getItem(key);
  if (saved) return saved;
  try {
    const t = await createDeviceToken(platform === 'ios' ? 'ios' : 'android');
    await AsyncStorage.setItem(key, t);
    return t;
  } catch {
    return null;
  }
}

export async function forgetDevice() {
  const keys = (await AsyncStorage.getAllKeys()).filter((k) => k.startsWith(TOKEN_KEY));
  await AsyncStorage.multiRemove(keys);
  if (platform === 'android') UsageMonitor!.configure(JSON.stringify({ enabled: false }));
  if (platform === 'ios') ios.stopAll();
}

export type MonitorConfig = {
  userId: string;
  enabled: boolean;
  lang: 'en' | 'fil';
  bedtimeStart: number;
  bedtimeEnd: number;
  bedtimeDays: string;
  lockEnabled: boolean;
  lockStart: number;
  lockEnd: number;
  unlockUntil: number;
  paused: boolean;
  focusUntil: number;
  rootSkill: SkillId;
  guardianName: string;
  scrollLimit: number | null;
  gamesLimit: number | null;
};

let lastJson = '';

/** Pushes the current settings down to the native monitor (no-op if unchanged). */
export async function configure(cfg: MonitorConfig) {
  if (platform === 'none') return;
  const token = cfg.enabled ? await deviceToken(cfg.userId) : null;
  const payload = {
    ...cfg,
    enabled: cfg.enabled && !!token,
    url: SUPABASE_URL,
    key: SUPABASE_KEY,
    deviceToken: token ?? '',
    rootSkillName: SKILL_BY_ID[cfg.rootSkill].name[cfg.lang],
  };
  const json = JSON.stringify(payload);
  if (json === lastJson) return;
  lastJson = json;
  if (platform === 'android') UsageMonitor!.configure(json);
  else ios.configure(payload);
}

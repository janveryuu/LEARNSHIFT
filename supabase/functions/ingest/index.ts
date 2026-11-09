// Reports from the background monitor (Android service / iOS Screen Time
// extension). Authenticated with a device token, because the monitor runs
// when the app (and its sign-in session) is not.
//   headers: x-device-token
//   body: { platform, events?: NudgeEvent[], usage?: UsageDay[] }
import { admin, HttpError, json, lateNightAlert, rateTake, serve } from '../_shared/server.ts';

type NudgeEvent = { client_id: string; at: string; level: string; reasons?: unknown[]; response?: string; clock?: number; late?: number };
type UsageDay = {
  day: string;
  total_min: number;
  video_min?: number;
  social_min?: number;
  games_min?: number;
  late_min?: number;
  sessions?: number;
  unlocks?: number;
  off_at?: number | null;
};

type AppRow = { day: string; package: string; label: string; category: string; minutes: number };
type Live = { package?: string | null; label?: string | null; category?: string | null; session_min?: number; screen_on?: boolean };

const CATS = new Set(['video', 'social', 'games', 'study', 'other']);
const LEVELS = new Set(['checkin', 'break', 'winddown', 'lock']);
const RESPONSES = new Set(['took', 'snoozed', 'followed', 'locked', 'requested', 'quiet']);
const int = (v: unknown, max: number) => Math.max(0, Math.min(max, Math.round(Number(v) || 0)));

serve(async (req) => {
  const token = req.headers.get('x-device-token') ?? '';
  if (!/^[0-9a-f]{64}$/.test(token)) throw new HttpError(401, 'Unknown device');
  const { data: studentId } = await admin.rpc('device_student', { p_token: token });
  if (!studentId) throw new HttpError(401, 'Unknown device');
  if (!(await rateTake(studentId, 'ingest', 400, 3600))) throw new HttpError(429, 'Slow down');

  const body = await req.json().catch(() => ({}));
  const source = body.platform === 'ios' ? 'ios' : 'android';
  const events: NudgeEvent[] = Array.isArray(body.events) ? body.events.slice(0, 50) : [];
  const usage: UsageDay[] = Array.isArray(body.usage) ? body.usage.slice(0, 14) : [];

  // The iOS Screen Time extension sends fixed request bodies, so the server
  // stamps the time, the Manila clock, and a per-day id.
  if (source === 'ios') {
    const manila = new Date(Date.now() + 8 * 3600 * 1000);
    const day = manila.toISOString().slice(0, 10);
    const clock = manila.getUTCHours() * 60 + manila.getUTCMinutes();
    const { data: st } = await admin.from('student_settings').select('bedtime_start').eq('student_id', studentId).maybeSingle();
    const late = ((clock - (st?.bedtime_start ?? 1320)) % 1440 + 1440) % 1440;
    for (const e of events) {
      e.client_id = `${String(e.client_id ?? 'ios').slice(0, 40)}-${day}`;
      e.at = new Date().toISOString();
      e.clock = clock;
      e.late = e.level === 'winddown' ? late : 0;
      if (!Array.isArray(e.reasons)) e.reasons = [];
      e.reasons = [...e.reasons, { key: 'clock', value: clock }];
    }
  }

  const nudgeRows = events
    .filter((e) => typeof e.client_id === 'string' && LEVELS.has(e.level) && !Number.isNaN(Date.parse(e.at)))
    .map((e) => ({
      student_id: studentId,
      client_id: e.client_id.slice(0, 80),
      at: new Date(e.at).toISOString(),
      level: e.level,
      reasons: Array.isArray(e.reasons) ? e.reasons.slice(0, 8) : [],
      response: RESPONSES.has(e.response ?? '') ? e.response : 'quiet',
      source,
    }));
  if (nudgeRows.length) {
    const { error } = await admin.from('nudge_events').upsert(nudgeRows, { onConflict: 'student_id,client_id' });
    if (error) throw error;
  }

  const usageRows = usage
    .filter((u) => /^\d{4}-\d{2}-\d{2}$/.test(u.day))
    .map((u) => ({
      student_id: studentId,
      day: u.day,
      total_min: int(u.total_min, 1440),
      video_min: int(u.video_min, 1440),
      social_min: int(u.social_min, 1440),
      games_min: int(u.games_min, 1440),
      late_min: int(u.late_min, 1440),
      sessions: int(u.sessions, 2000),
      unlocks: int(u.unlocks, 2000),
      off_at: u.off_at == null ? null : int(u.off_at, 1439),
      source,
      updated_at: new Date().toISOString(),
    }));
  if (usageRows.length) {
    const { error } = await admin.from('usage_daily').upsert(usageRows, { onConflict: 'student_id,day' });
    if (error) throw error;
  }

  // Per-app minutes (guardians see these; teachers never do).
  const apps: AppRow[] = Array.isArray(body.apps) ? body.apps.slice(0, 80) : [];
  const appRows = apps
    .filter((a) => /^\d{4}-\d{2}-\d{2}$/.test(a.day) && typeof a.package === 'string' && a.package.length > 0)
    .map((a) => ({
      student_id: studentId,
      day: a.day,
      package: a.package.slice(0, 200),
      label: String(a.label || a.package).slice(0, 80),
      category: CATS.has(a.category) ? a.category : 'other',
      minutes: int(a.minutes, 1440),
      updated_at: new Date().toISOString(),
    }));
  if (appRows.length) {
    const { error } = await admin.from('app_usage').upsert(appRows, { onConflict: 'student_id,day,package' });
    if (error) throw error;
  }

  // The app in front right now.
  const live: Live | null = body.live && typeof body.live === 'object' ? body.live : null;
  if (live) {
    const { error } = await admin.from('live_status').upsert({
      student_id: studentId,
      package: live.package ? String(live.package).slice(0, 200) : null,
      label: live.label ? String(live.label).slice(0, 80) : null,
      category: live.category && CATS.has(live.category) ? live.category : null,
      session_min: int(live.session_min, 1440),
      screen_on: !!live.screen_on,
      updated_at: new Date().toISOString(),
    });
    if (error) throw error;
  }

  // A fresh wind-down after bedtime tells the guardians (once per night).
  let alerted = false;
  const late = events.find(
    (e) => e.level === 'winddown' && Date.now() - Date.parse(e.at) < 30 * 60 * 1000 && typeof e.clock === 'number',
  );
  if (late) alerted = await lateNightAlert(studentId, int(late.clock, 1439), int(late.late, 600));

  return json({ events: nudgeRows.length, usage: usageRows.length, apps: appRows.length, live: !!live, alerted });
});

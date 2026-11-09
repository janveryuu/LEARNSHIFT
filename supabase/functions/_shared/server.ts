// Shared edge function helpers (Deno).
import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2.119.0';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-device-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json' } });
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Service-role client: bypasses RLS, so every caller check happens in code. */
export const admin: SupabaseClient = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  { auth: { persistSession: false, autoRefreshToken: false } },
);

export async function requireUser(req: Request): Promise<User> {
  const auth = req.headers.get('authorization') ?? '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in first');
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) throw new HttpError(401, 'Sign in first');
  return data.user;
}

export async function rateTake(user: string, kind: string, max: number, windowS: number) {
  const { data, error } = await admin.rpc('rate_take', { p_user: user, p_kind: kind, p_max: max, p_window_s: windowS });
  if (error) throw error;
  return data === true;
}

export function serve(handler: (req: Request) => Promise<Response>) {
  Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
    if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
    try {
      return await handler(req);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      console.error(e);
      return json({ error: 'Something went wrong' }, 500);
    }
  });
}

// ── Push notifications (Expo push service) ───────────────────────────────

export type Push = { title: string; body: string; data?: Record<string, unknown> };

export async function pushTo(userIds: string[], msg: Push) {
  if (userIds.length === 0) return 0;
  const { data: tokens } = await admin.from('push_tokens').select('token').in('user_id', userIds);
  if (!tokens?.length) return 0;
  const res = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(
      tokens.map((t) => ({
        to: t.token,
        title: msg.title,
        body: msg.body,
        data: msg.data ?? {},
        sound: 'default',
        channelId: 'family',
        priority: 'high',
      })),
    ),
  });
  const out = await res.json().catch(() => null);
  // Forget tokens for uninstalled apps.
  const dead: string[] = [];
  (out?.data ?? []).forEach((r: { status: string; details?: { error?: string } }, i: number) => {
    if (r.status === 'error' && r.details?.error === 'DeviceNotRegistered') dead.push(tokens[i].token);
  });
  if (dead.length) await admin.from('push_tokens').delete().in('token', dead);
  return tokens.length - dead.length;
}

export async function guardiansOf(studentId: string, onlyAlerts = false): Promise<string[]> {
  const { data } = await admin.from('guardian_links').select('guardian_id').eq('student_id', studentId);
  const ids = (data ?? []).map((r) => r.guardian_id as string);
  if (!onlyAlerts || ids.length === 0) return ids;
  const { data: c } = await admin.from('guardian_controls').select('late_alerts').eq('student_id', studentId).maybeSingle();
  return c && c.late_alerts === false ? [] : ids;
}

export async function nameOf(id: string): Promise<{ name: string; lang: 'en' | 'fil' }> {
  const { data } = await admin.from('profiles').select('display_name, lang').eq('id', id).maybeSingle();
  return { name: data?.display_name?.split(' ')[0] ?? 'Your child', lang: data?.lang === 'fil' ? 'fil' : 'en' };
}

const fmt = (min: number) => {
  const h = Math.floor(min / 60) % 24;
  const m = min % 60;
  return `${h % 12 || 12}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
};

/** Guardian-facing late-night alert, at most once per student per 6 hours. */
export async function lateNightAlert(studentId: string, clockMin: number, minutes: number) {
  if (!(await rateTake(studentId, 'late-alert', 1, 6 * 3600))) return false;
  const guardians = await guardiansOf(studentId, true);
  const { name } = await nameOf(studentId);
  await pushTo(guardians, {
    title: `${name} is still on the phone`,
    body: `It's ${fmt(clockMin)}. ${minutes} min past bedtime. LearnShift started wind-down.`,
    data: { url: '/guardian' },
  });
  return true;
}

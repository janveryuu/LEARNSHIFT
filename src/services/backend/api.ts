/**
 * Every server call the app makes, in one place. Throws Error with a short,
 * user-facing message on failure.
 */
import { errorText, functionError, supabase } from '@/lib/supabase';
import type { Lang, Role } from '@/store/useAppStore';
import { refreshProfile, useAuth } from '@/store/useAuth';
import type { TutorAnswer, TutorVariant } from '@/services/types';

const fail = (e: unknown): never => {
  throw new Error(errorText(e));
};

// ── Accounts ─────────────────────────────────────────────────────────────

export async function signUp(input: {
  email: string;
  password: string;
  name: string;
  role: Role;
  grade?: number | null;
  lang: Lang;
}) {
  const { data, error } = await supabase.auth.signUp({
    email: input.email.trim().toLowerCase(),
    password: input.password,
    options: {
      data: { role: input.role, display_name: input.name.trim(), grade: input.grade ?? null, lang: input.lang },
    },
  });
  if (error) fail(error);
  if (!data.session) throw new Error('Check your email to confirm your account, then sign in.');
  return data.session;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
  if (error) fail(error);
  return data.session;
}

export async function signOut() {
  await supabase.auth.signOut().catch(() => {});
}

export async function resetPassword(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
    redirectTo: 'learnshift://reset',
  });
  if (error) fail(error);
}

export async function updatePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) fail(error);
}

export async function deleteAccount() {
  const { error } = await supabase.functions.invoke('delete-account', { body: {} });
  if (error) throw new Error(await functionError(error));
  await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
}

export async function updateProfile(patch: { display_name?: string; grade?: number | null; lang?: Lang }) {
  const id = useAuth.getState().profile?.id;
  if (!id) return;
  const { error } = await supabase.from('profiles').update(patch).eq('id', id);
  if (error) fail(error);
  await refreshProfile();
}

// ── Family and class links ───────────────────────────────────────────────

export async function myLinkCode(regenerate = false): Promise<string> {
  const { data, error } = await supabase.rpc('my_link_code', { regenerate });
  if (error) fail(error);
  return data as string;
}

export async function linkStudent(code: string): Promise<{ student_id: string; name: string }> {
  const { data, error } = await supabase.rpc('link_student', { p_code: code });
  if (error) fail(error);
  return data as { student_id: string; name: string };
}

export async function unlink(guardianId: string, studentId: string) {
  const { error } = await supabase
    .from('guardian_links')
    .delete()
    .eq('guardian_id', guardianId)
    .eq('student_id', studentId);
  if (error) fail(error);
}

export async function joinClass(code: string): Promise<{ class_id: string; name: string; grade: number }> {
  const { data, error } = await supabase.rpc('join_class', { p_code: code });
  if (error) fail(error);
  return data as { class_id: string; name: string; grade: number };
}

export async function leaveClass(classId: string) {
  const id = useAuth.getState().profile?.id;
  const { error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', id!);
  if (error) fail(error);
}

export async function createClass(name: string, grade: number) {
  const { data, error } = await supabase
    .from('classes')
    .insert({ name: name.trim(), grade })
    .select('id, name, grade, join_code')
    .single();
  if (error) fail(error);
  return data as { id: string; name: string; grade: number; join_code: string };
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from('classes').delete().eq('id', id);
  if (error) fail(error);
}

export async function removeStudent(classId: string, studentId: string) {
  const { error } = await supabase.from('class_members').delete().eq('class_id', classId).eq('student_id', studentId);
  if (error) fail(error);
}

// ── Time requests and controls ───────────────────────────────────────────

export async function requestTime(minutes = 15) {
  const { data, error } = await supabase.from('time_requests').insert({ minutes }).select().single();
  if (error) fail(error);
  notify({ type: 'time_request', id: data.id });
  return data as { id: string; created_at: string; minutes: number; status: 'pending' };
}

export async function decideRequest(id: string, approve: boolean) {
  const { data, error } = await supabase.rpc('decide_request', { p_id: id, p_approve: approve });
  if (error) fail(error);
  notify({ type: 'request_decided', id });
  return data;
}

export async function setControls(
  studentId: string,
  patch: Partial<{
    lock_enabled: boolean;
    lock_start: number;
    lock_end: number;
    late_alerts: boolean;
    scroll_limit: number | null;
    games_limit: number | null;
  }>,
) {
  const me = useAuth.getState().profile?.id;
  const { error } = await supabase
    .from('guardian_controls')
    .upsert({ student_id: studentId, ...patch, updated_by: me, updated_at: new Date().toISOString() });
  if (error) fail(error);
  if ('lock_enabled' in patch) notify({ type: 'lock_changed', studentId });
}

export async function setStudentSettings(
  studentId: string,
  patch: Partial<{ bedtime_start: number; bedtime_end: number; bedtime_days: string; limit_style: string; paused: boolean }>,
) {
  const { error } = await supabase
    .from('student_settings')
    .upsert({ student_id: studentId, ...patch, updated_at: new Date().toISOString() });
  if (error) fail(error);
}

// ── Notifications ────────────────────────────────────────────────────────

/** Fire-and-forget: a missed push never blocks the action that caused it. */
export function notify(body: Record<string, unknown>) {
  supabase.functions.invoke('notify', { body }).catch(() => {});
}

export async function registerPushToken(token: string, platform: 'ios' | 'android' | 'web') {
  const { error } = await supabase.rpc('register_push_token', { p_token: token, p_platform: platform });
  if (error) fail(error);
}

export async function createDeviceToken(platform: 'ios' | 'android') {
  const { data, error } = await supabase.rpc('create_device_token', { p_platform: platform });
  if (error) fail(error);
  return data as string;
}

// ── Tutor ────────────────────────────────────────────────────────────────

export async function tutorExplain(
  questionId: string,
  wrongIndex: number,
  lang: Lang,
  variant: TutorVariant,
): Promise<TutorAnswer & { review: boolean }> {
  const { data, error } = await supabase.functions.invoke('tutor', {
    body: { mode: 'explain', questionId, wrongIndex, lang, variant },
  });
  if (error) throw new Error(await functionError(error));
  return data;
}

export async function tutorChat(
  questionId: string | null,
  lang: Lang,
  history: { me: string; reply: string }[],
  message: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke('tutor', {
    body: { mode: 'chat', questionId, lang, history, message },
  });
  if (error) throw new Error(await functionError(error));
  return data.reply as string;
}

/** Records how the student answered a nudge the phone's monitor sent. */
export function respondToNudge(clientId: string, response: 'took' | 'snoozed' | 'followed' | 'requested') {
  const id = useAuth.getState().profile?.id;
  if (!id || !clientId) return;
  supabase
    .from('nudge_events')
    .update({ response })
    .eq('student_id', id)
    .eq('client_id', clientId)
    .then(() => {}, () => {});
}

/** Everything the server holds about the signed-in student, for "Download my data". */
export async function exportMyData() {
  const p = useAuth.getState().profile;
  if (!p) return {};
  const id = p.id;
  const q = <T>(r: PromiseLike<{ data: T | null }>) => Promise.resolve(r).then((x) => x.data);
  const [progress, mastery, attempts, usage, nudges, requests, tutor, links, classes] = await Promise.all([
    q(supabase.from('progress').select('*').eq('student_id', id).maybeSingle()),
    q(supabase.from('mastery').select('skill_id, p, updated_at').eq('student_id', id)),
    q(supabase.from('attempts').select('question_id, chosen, correct, seconds, context, created_at').eq('student_id', id)),
    q(supabase.from('usage_daily').select('*').eq('student_id', id)),
    q(supabase.from('nudge_events').select('at, level, reasons, response, source').eq('student_id', id)),
    q(supabase.from('time_requests').select('minutes, status, created_at, decided_at').eq('student_id', id)),
    q(supabase.from('tutor_answers').select('question_id, lang, content, confidence, status, created_at').eq('student_id', id)),
    q(supabase.from('guardian_links').select('guardian_id, consent_at').eq('student_id', id)),
    q(supabase.from('class_members').select('class_id, joined_at').eq('student_id', id)),
  ]);
  return {
    profile: { name: p.display_name, email: p.email, grade: p.grade, language: p.lang },
    progress,
    mastery,
    attempts,
    usage_daily: usage,
    nudges,
    time_requests: requests,
    tutor_answers: tutor,
    guardians: links,
    classes,
    note: 'Which apps you used stays on your phone. Only daily totals are stored here. No messages, screens or browsing are ever collected.',
  };
}

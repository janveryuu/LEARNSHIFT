// End-to-end backend test against the live Supabase project.
// Creates a throwaway student, guardian, teacher and stranger, checks every
// privacy rule and the realtime path, then deletes the accounts.
//
//   node --env-file=.env scripts/backend-test.mjs
import { createClient } from '@supabase/supabase-js';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY;
const run = Date.now().toString(36);
let seq = 0;
let failed = 0;
let passed = 0;

function ok(cond, label, extra) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${label}`);
  } else {
    failed++;
    console.log(`  ✗ ${label}`, extra ?? '');
  }
}

async function user(role, name) {
  const c = createClient(URL, KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await c.auth.signUp({
    email: `ls-test-${role}-${run}-${++seq}@learnshift-test.com`,
    password: `Test-${run}-pw!`,
    options: { data: { role, display_name: name, grade: role === 'student' ? 8 : null, lang: 'en' } },
  });
  if (error || !data.session) throw new Error(`${role} sign-up failed: ${error?.message ?? 'no session'}`);
  return { c, id: data.user.id };
}

const rows = async (q) => {
  const { data, error } = await q;
  return error ? { error } : data;
};

const all = [];
try {
  console.log('Sign-up');
  const student = await user("student", "Test Student");
  all.push(student);
  const guardian = await user("guardian", "Test Guardian");
  all.push(guardian);
  const teacher = await user("teacher", "Test Teacher");
  all.push(teacher);
  const stranger = await user("guardian", "Stranger");
  all.push(stranger);

  const p = await rows(student.c.from('profiles').select('*').eq('id', student.id).single());
  ok(p.role === 'student' && p.grade === 8, 'profile created from sign-up', p);
  const s = await rows(student.c.from('student_settings').select('*').eq('student_id', student.id));
  ok(s.length === 1, 'student settings row created');
  const pr = await rows(student.c.from('progress').select('*').eq('student_id', student.id));
  ok(pr.length === 1 && pr[0].coins === 0, 'progress row created');

  console.log('Role is fixed');
  const { error: roleErr } = await student.c.from('profiles').update({ role: 'teacher' }).eq('id', student.id);
  ok(!!roleErr, 'student cannot change own role');

  console.log('Guardian linking');
  const { data: code } = await student.c.rpc('my_link_code');
  ok(/^\d{6}$/.test(code), 'student gets a 6-digit code', code);
  const { error: badLink } = await guardian.c.rpc('link_student', { p_code: '000000' === code ? '111111' : '000000' });
  ok(!!badLink, 'wrong code is rejected');
  const { data: linked, error: linkErr } = await guardian.c.rpc('link_student', { p_code: code });
  ok(!linkErr && linked.student_id === student.id, 'guardian links with the code', linkErr);
  const { error: teacherLink } = await teacher.c.rpc('link_student', { p_code: code });
  ok(!!teacherLink, 'teacher cannot use a guardian code');
  const gp = await rows(guardian.c.from('profiles').select('display_name').eq('id', student.id));
  ok(gp.length === 1, 'guardian sees student name');
  const sp = await rows(student.c.from('profiles').select('display_name').eq('id', guardian.id));
  ok(sp.length === 1, 'student sees guardian name');

  console.log('Class joining');
  const { data: cls, error: clsErr } = await teacher.c.from('classes').insert({ name: 'Sampaguita', grade: 8 }).select().single();
  ok(!clsErr && /^[A-Z0-9]{6}$/.test(cls.join_code), 'teacher creates class with join code', clsErr);
  const { error: guardClass } = await guardian.c.from('classes').insert({ name: 'Nope' });
  ok(!!guardClass, 'guardian cannot create a class');
  const { data: joined, error: joinErr } = await student.c.rpc('join_class', { p_code: cls.join_code.toLowerCase() });
  ok(!joinErr && joined.class_id === cls.id, 'student joins with code (any case)', joinErr);
  const roster = await rows(teacher.c.from('class_members').select('student_id, profiles(display_name)').eq('class_id', cls.id));
  ok(roster.length === 1 && roster[0].profiles.display_name === 'Test Student', 'teacher sees roster with names', roster);

  console.log('Student writes');
  const now = new Date().toISOString();
  const day = now.slice(0, 10);
  const w = await Promise.all([
    student.c.from('attempts').insert({ client_id: 'a1', question_id: 'fra-1', skill_id: 'fractions', chosen: 0, correct: false, seconds: 9 }),
    student.c.from('mastery').upsert({ student_id: student.id, skill_id: 'fractions', p: 0.41 }),
    student.c.from('mastery_daily').upsert({ student_id: student.id, day, skill_id: 'fractions', p: 0.41 }),
    student.c.from('usage_daily').upsert({ student_id: student.id, day, total_min: 134, video_min: 80, late_min: 12 }),
    student.c.from('nudge_events').insert({ client_id: 'n1', level: 'break', reasons: [{ key: 'videos' }], response: 'took' }),
    student.c.from('progress').update({ coins: 20 }).eq('student_id', student.id),
  ]);
  ok(w.every((r) => !r.error), 'attempt, mastery, usage, nudge, progress saved', w.map((r) => r.error).filter(Boolean));

  console.log('Privacy: guardian sees habits, never grades');
  ok((await rows(guardian.c.from('usage_daily').select('*').eq('student_id', student.id))).length === 1, 'guardian sees usage');
  ok((await rows(guardian.c.from('nudge_events').select('*').eq('student_id', student.id))).length === 1, 'guardian sees nudges');
  ok((await rows(guardian.c.from('mastery').select('*').eq('student_id', student.id))).length === 0, 'guardian cannot see mastery');
  ok((await rows(guardian.c.from('attempts').select('*').eq('student_id', student.id))).length === 0, 'guardian cannot see answers');
  ok((await rows(guardian.c.from('progress').select('*').eq('student_id', student.id))).length === 0, 'guardian cannot see progress');

  console.log('Privacy: teacher sees learning, never screen time');
  ok((await rows(teacher.c.from('mastery').select('*').eq('student_id', student.id))).length === 1, 'teacher sees mastery');
  ok((await rows(teacher.c.from('attempts').select('*').eq('student_id', student.id))).length === 1, 'teacher sees answers');
  ok((await rows(teacher.c.from('usage_daily').select('*').eq('student_id', student.id))).length === 0, 'teacher cannot see usage');
  ok((await rows(teacher.c.from('nudge_events').select('*').eq('student_id', student.id))).length === 0, 'teacher cannot see nudges');
  ok((await rows(teacher.c.from('time_requests').select('*').eq('student_id', student.id))).length === 0, 'teacher cannot see requests');

  console.log('Privacy: strangers see nothing');
  for (const t of ['profiles', 'usage_daily', 'nudge_events', 'mastery', 'attempts', 'guardian_controls', 'link_codes']) {
    const col = t === 'profiles' ? 'id' : 'student_id';
    ok((await rows(stranger.c.from(t).select('*').eq(col, student.id))).length === 0, `stranger cannot read ${t}`);
  }
  const { error: strangerWrite } = await stranger.c.from('usage_daily').upsert({ student_id: student.id, day, total_min: 1 });
  ok(!!strangerWrite, 'stranger cannot write usage');

  console.log('Controls and time requests (realtime)');
  const { error: selfUnlock } = await student.c.from('guardian_controls').update({ lock_enabled: false }).eq('student_id', student.id);
  const ctl = await rows(guardian.c.from('guardian_controls').select('*').eq('student_id', student.id).single());
  ok(ctl.lock_enabled === false && (selfUnlock || true), 'controls row exists for guardian');
  await guardian.c.from('guardian_controls').update({ lock_enabled: true }).eq('student_id', student.id);
  const { data: afterStudent } = await student.c
    .from('guardian_controls')
    .update({ lock_enabled: false })
    .eq('student_id', student.id)
    .select();
  ok(!afterStudent || afterStudent.length === 0, 'student cannot switch the lock off');
  const { error: fakeApproved } = await student.c.from('time_requests').insert({ minutes: 15, status: 'approved' });
  ok(!!fakeApproved, 'student cannot self-approve a request');

  const events = [];
  const channel = guardian.c
    .channel(`test-${run}`)
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'time_requests' }, (e) => events.push(e))
    .subscribe();
  await new Promise((r) => {
    const t = setInterval(() => {
      if (channel.state === 'joined') {
        clearInterval(t);
        r();
      }
    }, 100);
  });
  await new Promise((r) => setTimeout(r, 1500));
  const { data: req, error: reqErr } = await student.c.from('time_requests').insert({ minutes: 15 }).select().single();
  ok(!reqErr && req.status === 'pending', 'student asks for 15 min', reqErr);
  for (let i = 0; i < 50 && events.length === 0; i++) await new Promise((r) => setTimeout(r, 200));
  ok(events.length === 1 && events[0].new.id === req.id, 'guardian receives the request live');
  await guardian.c.removeChannel(channel);
  const { error: strangerDecide } = await stranger.c.rpc('decide_request', { p_id: req.id, p_approve: true });
  ok(!!strangerDecide, 'stranger cannot approve');
  const { data: decided, error: decideErr } = await guardian.c.rpc('decide_request', { p_id: req.id, p_approve: true });
  ok(!decideErr && decided.status === 'approved', 'guardian approves', decideErr);
  const ctl2 = await rows(student.c.from('guardian_controls').select('unlock_until').eq('student_id', student.id).single());
  const mins = (new Date(ctl2.unlock_until).getTime() - Date.now()) / 60000;
  ok(mins > 14 && mins <= 15.1, 'student is unlocked for 15 minutes', ctl2);

  console.log('Devices');
  const { data: dt } = await student.c.rpc('create_device_token', { p_platform: 'android' });
  ok(/^[0-9a-f]{64}$/.test(dt ?? ''), 'student gets a monitor device token');
  const { error: guardDt } = await guardian.c.rpc('create_device_token', { p_platform: 'android' });
  ok(!!guardDt, 'guardian cannot create a monitor token');
  const { error: pushErr } = await guardian.c.rpc('register_push_token', { p_token: `ExponentPushToken[test-${run}]`, p_platform: 'ios' });
  ok(!pushErr, 'push token registered', pushErr);

  console.log('Monitor ingest');
  const ingest = (token, body) =>
    fetch(`${URL}/functions/v1/ingest`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': token, apikey: KEY },
      body: JSON.stringify(body),
    });
  const bad = await ingest('0'.repeat(64), { events: [] });
  ok(bad.status === 401, 'unknown device token rejected', bad.status);
  const good = await ingest(dt, {
    platform: 'android',
    events: [{ client_id: 'mon-1', at: new Date().toISOString(), level: 'checkin', reasons: [{ key: 'minutes', value: 45 }] }],
    usage: [{ day, total_min: 150, video_min: 95, sessions: 12 }],
  });
  const gb = await good.json();
  ok(good.ok && gb.events === 1 && gb.usage === 1, 'monitor reports nudge + usage', gb);
  const mon = await rows(guardian.c.from('nudge_events').select('source').eq('client_id', 'mon-1'));
  ok(mon.length === 1 && mon[0].source === 'android', 'guardian sees the monitor nudge');
  const u2 = await rows(guardian.c.from('usage_daily').select('total_min').eq('student_id', student.id).single());
  ok(u2.total_min === 150, 'monitor usage overwrites the day');

  console.log('Gemini tutor');
  const t0 = Date.now();
  const { data: tut, error: tutErr } = await student.c.functions.invoke('tutor', {
    body: { mode: 'explain', questionId: 'fra-1', wrongIndex: 2, lang: 'fil' },
  });
  ok(!tutErr && tut.steps?.length >= 2 && tut.source === 'generated', `explains an uncovered mistake (${Date.now() - t0} ms, ${tut?.model})`, tutErr?.message ?? tut);
  if (tut) console.log(`    "${tut.what}" · confidence ${tut.confidence}`);
  const saved = await rows(teacher.c.from('tutor_answers').select('id, status').eq('student_id', student.id));
  ok(saved.length === 1, 'teacher sees the tutor answer');
  const { data: rev, error: revErr } = await teacher.c
    .from('tutor_answers')
    .update({ status: 'approved', reviewed_by: teacher.id, reviewed_at: new Date().toISOString() })
    .eq('id', saved[0]?.id)
    .select();
  ok(!revErr && rev?.length === 1, 'teacher approves it', revErr);
  const { data: gRev } = await guardian.c.from('tutor_answers').select('id').eq('student_id', student.id);
  ok((gRev ?? []).length === 0, 'guardian cannot see tutor answers');
  const { data: chat, error: chatErr } = await student.c.functions.invoke('tutor', {
    body: { mode: 'chat', questionId: 'fra-1', lang: 'en', message: 'why do the bottoms need to match?' },
  });
  ok(!chatErr && typeof chat.reply === 'string' && chat.reply.length > 10, 'tutor chat replies', chatErr?.message ?? chat);
  if (chat?.reply) console.log(`    "${chat.reply.slice(0, 140)}"`);
  const { error: badQ } = await student.c.functions.invoke('tutor', { body: { mode: 'explain', questionId: 'nope', wrongIndex: 1 } });
  ok(!!badQ, 'unknown question rejected');

  console.log('Notifications');
  const { data: req2 } = await student.c.from('time_requests').insert({ minutes: 10 }).select().single();
  const { data: n1, error: n1e } = await student.c.functions.invoke('notify', { body: { type: 'time_request', id: req2.id } });
  ok(!n1e && typeof n1.sent === 'number', 'student notifies guardians of a request', n1e?.message);
  const { error: n2e } = await stranger.c.functions.invoke('notify', { body: { type: 'time_request', id: req2.id } });
  ok(!!n2e, "stranger cannot announce someone else's request");
  await guardian.c.rpc('decide_request', { p_id: req2.id, p_approve: false });
  const { error: n3e } = await guardian.c.functions.invoke('notify', { body: { type: 'request_decided', id: req2.id } });
  ok(!n3e, 'guardian notifies the student of the decision', n3e?.message);
  const { error: n4e } = await guardian.c.functions.invoke('notify', { body: { type: 'lock_changed', studentId: student.id } });
  ok(!n4e, 'guardian notifies a lock change', n4e?.message);
  const { error: n5e } = await stranger.c.functions.invoke('notify', { body: { type: 'lock_changed', studentId: student.id } });
  ok(!!n5e, 'stranger cannot notify a lock change');
} catch (e) {
  failed++;
  console.log('  ✗ crashed:', e.message);
} finally {
  console.log('Cleanup');
  for (const u of all) {
    const { error } = await u.c.functions.invoke('delete-account', { body: {} });
    if (error) console.log('  ! could not delete a test account:', error.message);
  }
}

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);

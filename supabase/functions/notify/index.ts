// Sends push notifications for family events. The caller says what happened;
// this function checks the caller is allowed to announce it, then notifies.
//   { type: 'time_request', id }      student → their guardians
//   { type: 'request_decided', id }   guardian → the student
//   { type: 'lock_changed', studentId } guardian → the student
//   { type: 'late_night', clock, minutes } student → guardians (throttled)
import { admin, guardiansOf, HttpError, json, lateNightAlert, nameOf, pushTo, rateTake, requireUser, serve } from '../_shared/server.ts';

serve(async (req) => {
  const user = await requireUser(req);
  const body = await req.json().catch(() => ({}));
  if (!(await rateTake(user.id, 'notify', 60, 3600))) throw new HttpError(429, 'Too many notifications');

  switch (body.type) {
    case 'time_request': {
      const { data: r } = await admin.from('time_requests').select('*').eq('id', body.id).maybeSingle();
      if (!r || r.student_id !== user.id) throw new HttpError(404, 'Request not found');
      const { name } = await nameOf(user.id);
      const sent = await pushTo(await guardiansOf(user.id), {
        title: `${name} asked for ${r.minutes} more minutes`,
        body: 'Open LearnShift to approve or decline.',
        data: { url: '/guardian', requestId: r.id },
      });
      return json({ sent });
    }
    case 'request_decided': {
      const { data: r } = await admin.from('time_requests').select('*').eq('id', body.id).maybeSingle();
      if (!r || r.decided_by !== user.id) throw new HttpError(404, 'Request not found');
      const { name } = await nameOf(user.id);
      const { lang } = await nameOf(r.student_id);
      const approved = r.status === 'approved';
      const sent = await pushTo([r.student_id], {
        title: approved
          ? lang === 'fil'
            ? `Pumayag si ${name}: ${r.minutes} minuto pa`
            : `${name} said yes: ${r.minutes} more minutes`
          : lang === 'fil'
            ? `Hindi muna ngayon, sabi ni ${name}`
            : `${name} said not tonight`,
        body: approved
          ? lang === 'fil'
            ? 'Bukas na ang phone mo.'
            : 'Your phone is unlocked.'
          : lang === 'fil'
            ? 'Pahinga muna. Bukas ulit.'
            : 'Time to rest. See you tomorrow.',
        data: { url: '/lock' },
      });
      return json({ sent });
    }
    case 'lock_changed': {
      const studentId = String(body.studentId ?? '');
      const { data: link } = await admin
        .from('guardian_links')
        .select('student_id')
        .eq('guardian_id', user.id)
        .eq('student_id', studentId)
        .maybeSingle();
      if (!link) throw new HttpError(404, 'Student not found');
      const { data: c } = await admin.from('guardian_controls').select('lock_enabled').eq('student_id', studentId).maybeSingle();
      const { name } = await nameOf(user.id);
      const { lang } = await nameOf(studentId);
      const on = !!c?.lock_enabled;
      const sent = await pushTo([studentId], {
        title: on
          ? lang === 'fil'
            ? `Binuksan ni ${name} ang night lock`
            : `${name} turned on the night lock`
          : lang === 'fil'
            ? `Pinatay ni ${name} ang night lock`
            : `${name} turned off the night lock`,
        body: on
          ? lang === 'fil'
            ? 'Matutulog ang mga app sa oras ng tulog. Laging bukas ang emergency call.'
            : 'Apps rest during bedtime. Emergency calls always work.'
          : lang === 'fil'
            ? 'Wala nang lock ngayong gabi.'
            : 'No lock tonight.',
        data: { url: '/home' },
      });
      return json({ sent });
    }
    case 'late_night': {
      const clock = Math.max(0, Math.min(1439, Number(body.clock) || 0));
      const minutes = Math.max(0, Math.min(600, Number(body.minutes) || 0));
      return json({ sent: await lateNightAlert(user.id, clock, minutes) });
    }
    default:
      throw new HttpError(400, 'Unknown notification');
  }
});

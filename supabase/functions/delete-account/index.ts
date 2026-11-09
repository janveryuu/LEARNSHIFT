// Deletes the caller's account and, through cascades, all of their data:
// profile, links, classes they teach, answers, usage, nudges and tokens.
import { admin, json, requireUser, serve } from '../_shared/server.ts';

serve(async (req) => {
  const user = await requireUser(req);
  // End every session first: deleting a user does not revoke live tokens.
  await admin.auth.admin.signOut(req.headers.get('authorization')!.replace(/^Bearer\s+/i, ''), 'global').catch(() => {});
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) throw error;
  return json({ deleted: true });
});

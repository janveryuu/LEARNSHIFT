/**
 * Student sync engine.
 *
 * The app keeps working from its local store (so it works offline); this
 * module pushes local changes up (dirty flags + outbox, retried until they
 * land) and pulls server state down on start, on foreground, and whenever a
 * realtime event says a guardian changed something.
 */
import { AppState } from 'react-native';

import type { NudgeEntry } from '@/data/seed';
import { SKILLS, type SkillId } from '@/data/skills';
import { supabase } from '@/lib/supabase';
import type { ArmStats } from '@/services/types';
import {
  PRIOR_MASTERY,
  todayKey,
  useAppStore,
  type BedtimeDays,
  type TimeRequest,
  type UsageDay,
} from '@/store/useAppStore';

const DAY_MS = 24 * 3600 * 1000;
const isoDay = (offsetDays: number) => todayKey(new Date(Date.now() - offsetDays * DAY_MS));

type Listener = () => void;
const afterPull = new Set<Listener>();
/** Called after every successful pull (the native monitor re-reads its config). */
export function onPulled(fn: Listener) {
  afterPull.add(fn);
  return () => afterPull.delete(fn);
}

// ── Pull ─────────────────────────────────────────────────────────────────

export async function pullStudent(userId: string) {
  const [prog, mastery, daily, settings, controls, links, classes, nudges, requests, usage, attempts, profile] =
    await Promise.all([
      supabase.from('progress').select('*').eq('student_id', userId).maybeSingle(),
      supabase.from('mastery').select('skill_id, p').eq('student_id', userId),
      supabase
        .from('mastery_daily')
        .select('day, skill_id, p')
        .eq('student_id', userId)
        .gte('day', isoDay(42))
        .order('day'),
      supabase.from('student_settings').select('*').eq('student_id', userId).maybeSingle(),
      supabase.from('guardian_controls').select('*').eq('student_id', userId).maybeSingle(),
      supabase
        .from('guardian_links')
        .select('guardian_id, profiles!guardian_links_guardian_id_fkey(display_name)')
        .eq('student_id', userId),
      supabase.from('class_members').select('classes(id, name, grade)').eq('student_id', userId),
      supabase.from('nudge_events').select('*').eq('student_id', userId).order('at', { ascending: false }).limit(60),
      supabase
        .from('time_requests')
        .select('*')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(20),
      supabase.from('usage_daily').select('*').eq('student_id', userId).gte('day', isoDay(13)).order('day'),
      supabase
        .from('attempts')
        .select('created_at')
        .eq('student_id', userId)
        .gte('created_at', new Date(Date.now() - 154 * DAY_MS).toISOString())
        .limit(5000),
      supabase.from('profiles').select('display_name, lang').eq('id', userId).maybeSingle(),
    ]);
  const firstError = [prog, mastery, daily, settings, controls, links, classes, nudges, requests, usage, attempts].find(
    (r) => r.error,
  )?.error;
  if (firstError) throw firstError;

  const s = useAppStore.getState();
  const dirty = s.dirty;
  const patch: Partial<ReturnType<typeof useAppStore.getState>> = { lastSync: new Date().toISOString() };

  if (profile.data) patch.studentName = profile.data.display_name;

  if (prog.data && !dirty.progress) {
    const p = prog.data;
    patch.coins = p.coins;
    patch.answers = p.answers;
    patch.built = p.built?.length ? p.built : ['bahay'];
    patch.offline = p.offline ?? [];
    patch.feed = { ...s.feed, saved: p.saved ?? [] };
    patch.onboarded = p.onboarded;
    if (p.stats && Object.keys(p.stats).length) patch.stats = p.stats as ArmStats;
  }

  if (mastery.data) {
    const m = { ...PRIOR_MASTERY, ...s.mastery };
    for (const r of mastery.data) if (!dirty.mastery.includes(r.skill_id)) m[r.skill_id as SkillId] = r.p;
    patch.mastery = m;
  }

  if (daily.data) {
    // Weekly points, oldest first, from the daily snapshots (excluding today).
    const history = Object.fromEntries(SKILLS.map((k) => [k.id, [] as number[]])) as Record<SkillId, number[]>;
    for (const k of SKILLS) {
      const rows = daily.data.filter((r) => r.skill_id === k.id && r.day !== todayKey());
      for (let w = 5; w >= 1; w--) {
        const cutoff = isoDay(w * 7);
        const last = [...rows].reverse().find((r) => r.day <= cutoff);
        if (last) history[k.id].push(last.p);
      }
    }
    patch.history = history;
  }

  if (settings.data && !dirty.settings) {
    const st = settings.data;
    patch.bedtime = { start: st.bedtime_start, end: st.bedtime_end };
    patch.bedtimeDays = st.bedtime_days as BedtimeDays;
    patch.paused = st.paused;
    patch.guardian = { ...(patch.guardian ?? s.guardian), limitStyle: st.limit_style };
  }

  const guardians = (links.data ?? []).map((l) => ({
    id: l.guardian_id as string,
    name: ((l.profiles as unknown as { display_name: string } | null)?.display_name ?? '').split(' ')[0],
  }));
  patch.guardians = guardians;
  patch.guardian = {
    ...(patch.guardian ?? s.guardian),
    name: guardians[0]?.name ?? '',
    linked: guardians.length > 0,
    lockEnabled: !!controls.data?.lock_enabled && guardians.length > 0,
    lateNightAlerts: controls.data?.late_alerts ?? true,
  };
  if (controls.data)
    patch.lock = {
      start: controls.data.lock_start,
      end: controls.data.lock_end,
      unlockUntil: controls.data.unlock_until,
    };

  patch.classes = (classes.data ?? [])
    .map((c) => c.classes as unknown as { id: string; name: string; grade: number } | null)
    .filter((c): c is { id: string; name: string; grade: number } => !!c);

  if (nudges.data) {
    const server: NudgeEntry[] = nudges.data.map((n) => ({
      id: n.client_id,
      at: n.at,
      level: n.level,
      reasons: n.reasons ?? [],
      response: n.response,
    }));
    const local = s.nudges.filter((n) => dirty.nudges.includes(n.id) && !server.some((x) => x.id === n.id));
    patch.nudges = [...local, ...server.filter((x) => !local.some((l) => l.id === x.id))]
      .sort((a, b) => b.at.localeCompare(a.at))
      .slice(0, 60);
  }

  if (requests.data)
    patch.requests = requests.data.map(
      (r): TimeRequest => ({ id: r.id, at: r.created_at, minutes: r.minutes, status: r.status }),
    );

  if (usage.data) {
    const server: UsageDay[] = usage.data.map((u) => ({
      day: u.day,
      total: u.total_min,
      video: u.video_min,
      social: u.social_min,
      games: u.games_min,
      late: u.late_min,
      offAt: u.off_at,
      breaks: u.breaks,
      learning: u.learning_min,
      sessions: u.sessions,
      unlocks: u.unlocks,
    }));
    // Keep today's local break count if it hasn't landed yet.
    const today = s.usage.find((u) => u.day === todayKey());
    patch.usage = server.map((u) =>
      u.day === todayKey() && today && dirty.usageToday
        ? { ...u, breaks: Math.max(u.breaks, today.breaks), learning: Math.max(u.learning, today.learning) }
        : u,
    );
    if (dirty.usageToday && today && !server.some((u) => u.day === todayKey())) patch.usage.push(today);
    const t = patch.usage.find((u) => u.day === todayKey());
    patch.breaksToday = Math.max(t?.breaks ?? 0, s.breaksDay === todayKey() ? s.breaksToday : 0);
    patch.breaksDay = todayKey();
  }

  if (attempts.data) {
    const days: Record<string, number> = {};
    for (const a of attempts.data) {
      const d = todayKey(new Date(a.created_at));
      days[d] = (days[d] ?? 0) + 1;
    }
    // Answers still in the outbox count too.
    for (const o of s.outbox)
      if (o.kind === 'attempt') {
        const d = todayKey(new Date(o.row.created_at));
        days[d] = (days[d] ?? 0) + 1;
      }
    patch.learnDays = days;
  }

  useAppStore.getState().hydrate(patch);
  afterPull.forEach((f) => f());
}

// ── Push ─────────────────────────────────────────────────────────────────

let flushing = false;

export async function flushStudent(userId: string) {
  if (flushing) return;
  flushing = true;
  try {
    const s = useAppStore.getState();
    const { dirty, outbox } = s;
    const now = new Date().toISOString();

    if (dirty.progress) {
      const { error } = await supabase
        .from('progress')
        .update({
          coins: s.coins,
          answers: s.answers,
          breaks_total: s.usage.reduce((a, u) => a + u.breaks, 0),
          built: s.built,
          stats: s.stats,
          offline: s.offline,
          saved: s.feed.saved,
          onboarded: s.onboarded,
          updated_at: now,
        })
        .eq('student_id', userId);
      if (error) throw error;
      useAppStore.getState().clean({ progress: false });
    }

    if (dirty.settings) {
      const { error } = await supabase.from('student_settings').upsert({
        student_id: userId,
        bedtime_start: s.bedtime.start,
        bedtime_end: s.bedtime.end,
        bedtime_days: s.bedtimeDays,
        limit_style: s.guardian.limitStyle,
        paused: s.paused,
        updated_at: now,
      });
      if (error) throw error;
      useAppStore.getState().clean({ settings: false });
    }

    if (dirty.mastery.length) {
      const skills = [...dirty.mastery];
      const rows = skills.map((k) => ({ student_id: userId, skill_id: k, p: s.mastery[k], updated_at: now }));
      const { error } = await supabase.from('mastery').upsert(rows);
      if (error) throw error;
      const day = todayKey();
      const { error: e2 } = await supabase
        .from('mastery_daily')
        .upsert(skills.map((k) => ({ student_id: userId, day, skill_id: k, p: s.mastery[k] })));
      if (e2) throw e2;
      useAppStore.getState().clean({ mastery: skills });
    }

    if (dirty.nudges.length) {
      const ids = [...dirty.nudges];
      const rows = s.nudges
        .filter((n) => ids.includes(n.id))
        .map((n) => ({
          student_id: userId,
          client_id: n.id,
          at: n.at,
          level: n.level,
          reasons: n.reasons,
          response: n.response,
          source: 'app',
        }));
      if (rows.length) {
        const { error } = await supabase.from('nudge_events').upsert(rows, { onConflict: 'student_id,client_id' });
        if (error) throw error;
      }
      useAppStore.getState().clean({ nudges: ids });
    }

    if (dirty.usageToday) {
      const today = s.usage.find((u) => u.day === todayKey());
      if (today) {
        const { error } = await supabase.from('usage_daily').upsert(
          { student_id: userId, day: today.day, breaks: today.breaks, learning_min: today.learning, updated_at: now },
          { onConflict: 'student_id,day' },
        );
        if (error) throw error;
      }
      useAppStore.getState().clean({ usageToday: false });
    }

    if (outbox.length) {
      const batch = outbox.slice(0, 100);
      const attempts = batch.filter((o) => o.kind === 'attempt');
      if (attempts.length) {
        const { error } = await supabase.from('attempts').upsert(
          attempts.map((o) => o.row),
          { onConflict: 'student_id,client_id', ignoreDuplicates: true },
        );
        if (error) throw error;
      }
      const flags = batch.filter((o) => o.kind === 'flag');
      if (flags.length) {
        const { error } = await supabase.from('tutor_answers').insert(
          flags.map((o) => ({
            ...o.row,
            source: 'bank',
            status: 'needs_review',
          })),
        );
        if (error) throw error;
      }
      useAppStore.getState().clean({ outbox: batch });
    }
  } finally {
    flushing = false;
  }
}

export function hasPending() {
  const { dirty, outbox } = useAppStore.getState();
  return (
    dirty.progress ||
    dirty.settings ||
    dirty.usageToday ||
    dirty.mastery.length > 0 ||
    dirty.nudges.length > 0 ||
    outbox.length > 0
  );
}

// ── Lifecycle ────────────────────────────────────────────────────────────

/** Starts syncing for a signed-in student. Returns a stop function. */
export function startStudentSync(userId: string): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout> | null = null;

  const pushSoon = (ms = 1500) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      if (!stopped && hasPending()) flushStudent(userId).catch(() => {});
    }, ms);
  };

  const pull = () =>
    pullStudent(userId).catch(() => {
      // Offline: keep the local copy; the interval retries.
    });

  // Push first so a pull never overwrites unsent local changes.
  flushStudent(userId)
    .catch(() => {})
    .finally(pull);

  const unsubStore = useAppStore.subscribe((state, prev) => {
    if (state.dirty !== prev.dirty || state.outbox !== prev.outbox) pushSoon();
  });

  const interval = setInterval(() => {
    if (hasPending()) flushStudent(userId).catch(() => {});
  }, 30_000);

  const appState = AppState.addEventListener('change', (st) => {
    if (st === 'active') flushStudent(userId).catch(() => {}).finally(pull);
  });

  const channel = supabase
    .channel(`student-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guardian_controls', filter: `student_id=eq.${userId}` }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'student_settings', filter: `student_id=eq.${userId}` }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'time_requests', filter: `student_id=eq.${userId}` }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'guardian_links', filter: `student_id=eq.${userId}` }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'class_members', filter: `student_id=eq.${userId}` }, pull)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'usage_daily', filter: `student_id=eq.${userId}` }, pull)
    .subscribe();

  return () => {
    stopped = true;
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    unsubStore();
    appState.remove();
    supabase.removeChannel(channel);
  };
}

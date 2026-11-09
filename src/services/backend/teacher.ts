/**
 * Teacher data: classes, rosters, mastery (never screen time) and the tutor
 * review queue. Live: a student's answer updates the heatmap in seconds.
 */
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { create } from 'zustand';

import type { Section, Student } from '@/data/class';
import { SKILLS, type SkillId } from '@/data/skills';
import { supabase } from '@/lib/supabase';
import { PRIOR_MASTERY, todayKey } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

export type TeacherClass = { id: string; name: string; grade: number; join_code: string };
export type LiveStudent = Student & { answered: number; lastActive: string | null };
export type ReviewRow = {
  id: string;
  studentId: string;
  student: string;
  questionId: string;
  wrongIndex: number;
  confidence: number;
  lang: 'en' | 'fil';
  content: { what?: string; steps?: string[]; example?: string; problems?: string[] };
  source: 'bank' | 'generated';
  status: 'needs_review' | 'approved' | 'edited' | 'auto';
  teacherNote: string | null;
  at: string;
};

type TeacherState = {
  loading: boolean;
  error: string | null;
  classes: TeacherClass[];
  selected: string | null;
  students: Record<string, LiveStudent[]>;
  review: ReviewRow[];
  select: (id: string) => void;
};

export const useTeacher = create<TeacherState>()((set) => ({
  loading: true,
  error: null,
  classes: [],
  selected: null,
  students: {},
  review: [],
  select: (selected) => set({ selected }),
}));

const DAY_MS = 24 * 3600 * 1000;

export async function loadClasses() {
  const me = useAuth.getState().profile?.id;
  if (!me) return;
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, grade, join_code')
    .eq('teacher_id', me)
    .order('created_at');
  if (error) {
    useTeacher.setState({ loading: false, error: error.message });
    return;
  }
  const classes = (data ?? []) as TeacherClass[];
  const sel = useTeacher.getState().selected;
  useTeacher.setState({
    classes,
    selected: classes.some((c) => c.id === sel) ? sel : (classes[0]?.id ?? null),
    loading: false,
    error: null,
  });
}

export async function loadRoster(classId: string) {
  const { data: members, error } = await supabase
    .from('class_members')
    .select('student_id, profiles(display_name)')
    .eq('class_id', classId);
  if (error) {
    useTeacher.setState({ error: error.message });
    return;
  }
  const ids = (members ?? []).map((m) => m.student_id as string);
  const [mastery, daily, attempts] = ids.length
    ? await Promise.all([
        supabase.from('mastery').select('student_id, skill_id, p, updated_at').in('student_id', ids),
        supabase
          .from('mastery_daily')
          .select('student_id, day, skill_id, p')
          .in('student_id', ids)
          .gte('day', todayKey(new Date(Date.now() - 35 * DAY_MS))),
        supabase
          .from('attempts')
          .select('student_id, created_at')
          .in('student_id', ids)
          .gte('created_at', new Date(Date.now() - 30 * DAY_MS).toISOString())
          .limit(10000),
      ])
    : [{ data: [] }, { data: [] }, { data: [] }];

  const students: LiveStudent[] = (members ?? []).map((m) => {
    const id = m.student_id as string;
    const rows = (mastery.data ?? []).filter((r) => r.student_id === id);
    const map = { ...PRIOR_MASTERY };
    for (const r of rows) map[r.skill_id as SkillId] = r.p;
    // Weekly class-average points from daily snapshots, oldest first.
    const snaps = (daily.data ?? []).filter((r) => r.student_id === id);
    const history: number[] = [];
    for (let w = 4; w >= 0; w--) {
      const cutoff = todayKey(new Date(Date.now() - w * 7 * DAY_MS));
      const latest = { ...PRIOR_MASTERY };
      let any = false;
      for (const r of snaps)
        if (r.day <= cutoff) {
          latest[r.skill_id as SkillId] = r.p;
          any = true;
        }
      if (any) history.push(SKILLS.reduce((a, k) => a + latest[k.id], 0) / SKILLS.length);
    }
    const trend = history.length >= 2 ? (history[history.length - 1] - history[0]) / (history.length - 1) : 0;
    const mine = (attempts.data ?? []).filter((a) => a.student_id === id);
    const lastActive = mine.reduce<string | null>((x, a) => (!x || a.created_at > x ? a.created_at : x), null);
    return {
      id,
      name: (m.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Student',
      mastery: map,
      trend,
      history,
      answered: mine.length,
      lastActive,
    };
  });
  students.sort((a, b) => a.name.localeCompare(b.name));
  useTeacher.setState((s) => ({ students: { ...s.students, [classId]: students }, error: null }));
}

export async function loadReview() {
  const { data, error } = await supabase
    .from('tutor_answers')
    .select('id, student_id, question_id, wrong_index, confidence, lang, content, source, status, teacher_note, created_at, profiles!tutor_answers_student_id_fkey(display_name)')
    .in('status', ['needs_review', 'approved', 'edited'])
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return;
  useTeacher.setState({
    review: (data ?? []).map((r) => ({
      id: r.id,
      studentId: r.student_id,
      student: (r.profiles as unknown as { display_name: string } | null)?.display_name ?? 'Student',
      questionId: r.question_id,
      wrongIndex: r.wrong_index,
      confidence: r.confidence,
      lang: r.lang,
      content: r.content ?? {},
      source: r.source,
      status: r.status,
      teacherNote: r.teacher_note,
      at: r.created_at,
    })),
  });
}

export async function reviewAnswer(id: string, status: 'approved' | 'edited', note?: string) {
  const me = useAuth.getState().profile?.id;
  useTeacher.setState((s) => ({
    review: s.review.map((r) => (r.id === id ? { ...r, status, teacherNote: note ?? r.teacherNote } : r)),
  }));
  const { error } = await supabase
    .from('tutor_answers')
    .update({ status, teacher_note: note ?? null, reviewed_by: me, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) {
    await loadReview();
    throw new Error(error.message);
  }
}

/** As a `Section` for the existing heatmap and support-list helpers. */
export function asSection(c: TeacherClass, students: LiveStudent[]): Section {
  return { id: c.id, name: c.name, grade: c.grade, students };
}

/** Loads and keeps the teacher view live. Mount once on the teacher screens. */
export function useTeacherLive() {
  const me = useAuth((s) => s.profile?.id);
  const selected = useTeacher((s) => s.selected);

  useEffect(() => {
    if (!me) return;
    loadClasses();
    loadReview();
    const ch = supabase
      .channel(`teacher-${me}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tutor_answers' }, () => loadReview())
      .subscribe();
    const app = AppState.addEventListener('change', (st) => {
      if (st === 'active') {
        loadClasses();
        loadReview();
      }
    });
    return () => {
      supabase.removeChannel(ch);
      app.remove();
    };
  }, [me]);

  useEffect(() => {
    if (!selected) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    // Mastery events arrive per skill; batch them into one reload.
    const reload = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => loadRoster(selected), 400);
    };
    loadRoster(selected);
    const ch = supabase
      .channel(`teacher-class-${selected}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'class_members', filter: `class_id=eq.${selected}` }, reload)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mastery' }, reload)
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [selected]);
}

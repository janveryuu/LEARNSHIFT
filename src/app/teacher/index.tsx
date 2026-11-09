import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChalkboardTeacher, Copy, Plus, TrendDown, Warning } from 'phosphor-react-native';

import { ClassHeatmap, MasteryLegend, masteryColor } from '@/components/teacher/ClassHeatmap';
import {
  BottomSheet,
  Card,
  Chip,
  DevChip,
  EmptyState,
  ListGroup,
  ListRow,
  Notice,
  PillButton,
  SegmentedControl,
  Stagger,
  Text,
  TextField,
} from '@/components/ui';
import { buildSections, needsSupport, type Section, type Student } from '@/data/class';
import { QUESTION_BY_ID } from '@/data/questions';
import { SKILL_BY_ID, SKILLS, type SkillId } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { fontFor } from '@/design/typography';
import { teacherStrings as T } from '@/i18n/staff';
import { IS_PITCH } from '@/lib/config';
import { gapEngine } from '@/services/ai/gapEngine';
import * as api from '@/services/backend/api';
import {
  asSection,
  loadClasses,
  reviewAnswer,
  useTeacher,
  useTeacherLive,
  type ReviewRow,
} from '@/services/backend/teacher';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

export default function TeacherHome() {
  return IS_PITCH ? <PitchTeacher /> : <RealTeacher />;
}

function PitchTeacher() {
  const mika = useAppStore((s) => s.mastery);
  const sections = useMemo(() => buildSections(mika), [mika]);
  const [sectionId, setSectionId] = useState(sections[0].id);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  return (
    <Dashboard
      sections={sections}
      section={section}
      onSection={setSectionId}
      review={<PitchReviewQueue />}
      title="Grade 8 – Sampaguita"
      subtitle={`${T.teacher} · ${T.learningOnly}`}
    />
  );
}

function RealTeacher() {
  useTeacherLive();
  const loading = useTeacher((s) => s.loading);
  const classes = useTeacher((s) => s.classes);
  const selected = useTeacher((s) => s.selected);
  const students = useTeacher((s) => (s.selected ? s.students[s.selected] : undefined));
  const me = useAuth((s) => s.profile);
  const [creating, setCreating] = useState(false);
  const cls = classes.find((c) => c.id === selected) ?? null;
  const sections = useMemo(
    () => classes.map((c) => asSection(c, c.id === selected ? (students ?? []) : [])),
    [classes, selected, students],
  );

  if (!loading && (classes.length === 0 || creating)) {
    return (
      <Frame title={T.createTitle} subtitle={me?.display_name ?? ''}>
        <CreateClass
          first={classes.length === 0}
          onDone={() => setCreating(false)}
          onCancel={classes.length ? () => setCreating(false) : undefined}
        />
        <AccountCard />
      </Frame>
    );
  }
  if (!cls) return <Frame title={T.classes} subtitle={me?.display_name ?? ''} />;

  const section = sections.find((s) => s.id === cls.id)!;
  return (
    <Dashboard
      sections={sections}
      section={section}
      onSection={(id) => useTeacher.getState().select(id)}
      title={cls.name}
      subtitle={`${me?.display_name ?? ''} · ${T.learningOnly}`}
      joinCode={cls.join_code}
      onNewClass={() => setCreating(true)}
      empty={students !== undefined && students.length === 0}
      review={<RealReviewQueue />}
      footer={<AccountCard classId={cls.id} />}
    />
  );
}

function Frame({ title, subtitle, children }: { title: string; subtitle: string; children?: React.ReactNode }) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.body, { maxWidth: 560, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <View style={[styles.badge, { backgroundColor: c.tabInsights }]}>
            <ChalkboardTeacher size={22} weight="fill" color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text variant="largeTitle" numberOfLines={2}>
              {title}
            </Text>
            <Text variant="subhead">{subtitle}</Text>
          </View>
        </View>
        {children}
      </ScrollView>
    </View>
  );
}

function CreateClass({ first, onDone, onCancel }: { first: boolean; onDone: () => void; onCancel?: () => void }) {
  const [name, setName] = useState('');
  const [grade, setGrade] = useState('8');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const create = async () => {
    if (!name.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const c = await api.createClass(name, Number(grade));
      await loadClasses();
      useTeacher.getState().select(c.id);
      onDone();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Card style={styles.gap}>
      {!first ? <Text variant="title">{T.newClass}</Text> : null}
      <Text variant="subhead">{T.createSub}</Text>
      {error ? <Notice text={error} /> : null}
      <TextField label={T.className} placeholder={T.classNamePh} value={name} onChangeText={setName} maxLength={60} />
      <Text variant="subhead" color="text">
        {T.grade}
      </Text>
      <SegmentedControl
        options={['7', '8', '9', '10', '11', '12'].map((g) => ({ value: g, label: g }))}
        value={grade}
        onChange={setGrade}
        compact
      />
      <PillButton label={busy ? '…' : T.create} block disabled={busy || !name.trim()} onPress={create} />
      {onCancel ? <PillButton label="Cancel" kind="neutral" block onPress={onCancel} /> : null}
    </Card>
  );
}

function JoinCode({ code }: { code: string }) {
  const { c } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <Card style={styles.joinCard}>
      <View style={styles.flex}>
        <Text variant="overline">{T.joinCode}</Text>
        <Text variant="title" style={[fontFor(800), styles.codeText]} selectable>
          {code}
        </Text>
        <Text variant="caption">{T.joinCodeSub}</Text>
      </View>
      <PillButton
        label={copied ? '✓' : 'Copy'}
        kind="secondary"
        size="sm"
        icon={copied ? undefined : <Copy size={15} weight="bold" color={c.accent} />}
        onPress={() => {
          Clipboard.setStringAsync(code).then(() => setCopied(true));
        }}
      />
    </Card>
  );
}

function Dashboard({
  sections,
  section,
  onSection,
  title,
  subtitle,
  joinCode,
  onNewClass,
  empty,
  review,
  footer,
}: {
  sections: Section[];
  section: Section;
  onSection: (id: string) => void;
  title: string;
  subtitle: string;
  joinCode?: string;
  onNewClass?: () => void;
  empty?: boolean;
  review: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { c, isNight } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const [cell, setCell] = useState<{ s: Student; skill: SkillId } | null>(null);
  // Students with no answers yet don't count toward gaps or support.
  const active = useMemo(
    () => section.students.filter((s) => (s as { answered?: number }).answered !== 0),
    [section],
  );
  const support = useMemo(
    () => needsSupport({ ...section, students: active }, (m) => gapEngine.rootGap(m)),
    [section, active],
  );

  // Most common root gap across the section.
  const rootCounts = useMemo(() => {
    const counts = new Map<SkillId, number>();
    for (const st of active) {
      const r = gapEngine.rootGap(st.mastery);
      if (st.mastery[r] < 0.5) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [active]);

  const maxW = wide ? 1240 : 560;
  const contentW = Math.min(width, maxW) - space.screen * 2;
  const heatW = wide ? contentW * 0.62 - space.gap / 2 : contentW;
  const heatInner = heatW - space.card * 2;
  const openStudent = (s: Student) =>
    router.push({ pathname: '/teacher/student/[id]', params: { id: s.id, section: section.id } });

  const heat = (
    <Card style={styles.gap}>
      <View style={styles.rowBetween}>
        <View style={styles.flex}>
          <Text variant="title">{T.classTitle}</Text>
          <Text variant="subhead">{T.classSub(section.students.length)}</Text>
        </View>
        <MasteryLegend low={T.low2} high={T.high} />
      </View>
      {rootCounts ? (
        <View style={[styles.insight, { backgroundColor: c.accentTint }]}>
          <Warning size={16} weight="fill" color={c.accent} />
          <Text variant="subhead" color="text" style={styles.flex}>
            {T.classRoot(SKILL_BY_ID[rootCounts[0]].name.en, rootCounts[1])}
          </Text>
        </View>
      ) : null}
      {empty ? (
        <EmptyState title={T.noStudents} subtitle={T.noStudentsSub} expression="curious" />
      ) : (
        <ClassHeatmap
          students={section.students}
          width={heatInner}
          height={Math.min(wide ? 620 : 470, 90 + section.students.length * 40)}
          highlight={rootCounts?.[0]}
          onCell={(s, skill) => setCell({ s, skill })}
          onStudent={openStudent}
        />
      )}
    </Card>
  );

  const side = (
    <View style={styles.sideCol}>
      {joinCode ? <JoinCode code={joinCode} /> : null}
      <Card style={styles.gap}>
        <Text variant="title">{T.needs}</Text>
        {support.length === 0 ? <Text variant="subhead">{T.never}</Text> : null}
        {support.map(({ student, reasons }) => (
          <Card
            key={student.id}
            onPress={() => openStudent(student)}
            style={[styles.supportRow, { backgroundColor: c.inset }]}
            padded={false}
          >
            <View style={styles.supportInner}>
              <Text variant="headline" numberOfLines={1}>
                {student.name}
              </Text>
              <View style={styles.chips}>
                {reasons.map((r, i) => (
                  <Chip
                    key={i}
                    label={
                      r.kind === 'root'
                        ? T.rootGap(SKILL_BY_ID[r.skill].name.en)
                        : r.kind === 'dropping'
                          ? T.dropping
                          : T.low(SKILL_BY_ID[r.skill].name.en)
                    }
                    kind={r.kind === 'root' ? 'tinted' : 'neutral'}
                    icon={r.kind === 'dropping' ? <TrendDown size={13} weight="bold" color={c.text} /> : undefined}
                    style={styles.smallChip}
                  />
                ))}
              </View>
            </View>
          </Card>
        ))}
      </Card>
      {review}
      {footer}
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView contentContainerStyle={[styles.body, { maxWidth: maxW, paddingBottom: insets.bottom + 40 }]}>
        <Stagger index={0} style={styles.header}>
          <View style={[styles.badge, { backgroundColor: c.tabInsights }]}>
            <ChalkboardTeacher size={22} weight="fill" color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text variant="largeTitle" numberOfLines={1}>
              {title}
            </Text>
            <Text variant="subhead" numberOfLines={1}>
              {subtitle}
            </Text>
          </View>
          {IS_PITCH ? <DevChip onPress={() => router.push('/demo')} /> : null}
        </Stagger>
        <Stagger index={1} style={styles.segRow}>
          {sections.length > 1 ? (
            <SegmentedControl
              options={sections.map((s) => ({ value: s.id, label: s.name }))}
              value={section.id}
              onChange={onSection}
              style={styles.seg}
            />
          ) : null}
          {onNewClass ? (
            <PillButton
              label={T.newClass}
              kind="neutral"
              size="sm"
              icon={<Plus size={14} weight="bold" color={c.text} />}
              onPress={onNewClass}
            />
          ) : null}
        </Stagger>
        {wide ? (
          <View style={styles.columns}>
            <View style={styles.mainCol}>{heat}</View>
            {side}
          </View>
        ) : (
          <>
            {heat}
            {side}
          </>
        )}
      </ScrollView>

      <BottomSheet visible={!!cell} onClose={() => setCell(null)} accessibilityLabel="Cell detail">
        {cell ? (
          <View style={styles.sheet}>
            <View style={styles.rowBetween}>
              <View style={styles.flex}>
                <Text variant="overline">{SKILL_BY_ID[cell.skill].name.en}</Text>
                <Text variant="title">{cell.s.name}</Text>
              </View>
              <View style={[styles.bigCell, { backgroundColor: masteryColor(cell.s.mastery[cell.skill], c, isNight) }]}>
                <Text
                  variant="title"
                  color={cell.s.mastery[cell.skill] < 0.35 || cell.s.mastery[cell.skill] >= 0.8 ? '#FFFFFF' : 'text'}
                  style={fontFor(800)}
                >
                  {Math.round(cell.s.mastery[cell.skill] * 100)}%
                </Text>
              </View>
            </View>
            <Text variant="body">{T.rootGap(SKILL_BY_ID[gapEngine.rootGap(cell.s.mastery, cell.skill)].name.en)}</Text>
            <View style={styles.chips}>
              {SKILLS.filter((s) => SKILL_BY_ID[cell.skill].prereqs.includes(s.id)).map((s) => (
                <Chip key={s.id} label={`${s.name.en} ${Math.round(cell.s.mastery[s.id] * 100)}%`} kind="outline" />
              ))}
            </View>
            <PillButton
              label={T.open}
              block
              onPress={() => {
                const s = cell.s;
                setCell(null);
                openStudent(s);
              }}
            />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

/** Tutor answers that failed the math check (or came from the bank unsure), for review. */
function RealReviewQueue() {
  const { c } = useTheme();
  const review = useTeacher((s) => s.review);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const open = review.filter((r) => r.status === 'needs_review');
  const done = review.filter((r) => r.status === 'approved' || r.status === 'edited').slice(0, 3);

  const text = (r: ReviewRow) =>
    r.teacherNote ??
    [r.content.what, ...(r.content.steps ?? [])].filter(Boolean).join(' ') ??
    '';

  return (
    <Card style={styles.gap}>
      <View>
        <Text variant="title">{T.review}</Text>
        <Text variant="subhead">{T.reviewSub}</Text>
      </View>
      {error ? <Notice text={error} /> : null}
      {open.length === 0 ? <EmptyState title={T.empty} subtitle={T.emptySub} expression="proud" /> : null}
      {open.map((r) => {
        const q = QUESTION_BY_ID[r.questionId];
        const draft = drafts[r.id] ?? text(r);
        return (
          <View key={r.id} style={[styles.reviewItem, { backgroundColor: c.inset }]}>
            <View style={styles.rowBetween}>
              <Text variant="subhead" color="text" style={styles.flex} numberOfLines={1}>
                {r.student}
              </Text>
              <Chip label={T.confidence(Math.round(r.confidence * 100))} kind="tinted" style={styles.smallChip} />
            </View>
            {q ? <Text variant="headline">{q.prompt.en}</Text> : null}
            {q ? (
              <Text variant="subhead">
                {T.wrong}:{' '}
                <Text variant="subhead" color="danger">
                  {q.options[r.wrongIndex]}
                </Text>
                {'  ·  '}
                {q.options[q.answer]} ✓
              </Text>
            ) : null}
            <Text variant="overline">
              {T.draft} · {r.source === 'generated' ? T.generated : T.bank} · {r.lang.toUpperCase()}
            </Text>
            {editing === r.id ? (
              <TextInput
                value={draft}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [r.id]: v }))}
                multiline
                style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.hairline }]}
                accessibilityLabel={T.draft}
              />
            ) : (
              <Text variant="body">{draft}</Text>
            )}
            {r.content.problems?.length ? (
              <Text variant="caption">
                {T.problems}: {r.content.problems.join('; ')}
              </Text>
            ) : null}
            <View style={styles.actions}>
              {editing === r.id ? (
                <PillButton
                  label={T.save}
                  size="sm"
                  onPress={() => {
                    setEditing(null);
                    reviewAnswer(r.id, 'edited', draft).catch((e: Error) => setError(e.message));
                  }}
                />
              ) : (
                <>
                  <PillButton
                    label={T.approve}
                    size="sm"
                    onPress={() => reviewAnswer(r.id, 'approved').catch((e: Error) => setError(e.message))}
                  />
                  <PillButton label={T.edit} kind="secondary" size="sm" onPress={() => setEditing(r.id)} />
                </>
              )}
            </View>
          </View>
        );
      })}
      {done.map((r) => (
        <View key={r.id} style={styles.rowBetween}>
          <Text variant="subhead" style={styles.flex} numberOfLines={1}>
            {r.student} · {QUESTION_BY_ID[r.questionId]?.prompt.en ?? r.questionId}
          </Text>
          <Chip label={r.status === 'approved' ? T.approved : T.edited} kind="outline" style={styles.smallChip} />
        </View>
      ))}
    </Card>
  );
}

function PitchReviewQueue() {
  const { c } = useTheme();
  const review = useAppStore((s) => s.review);
  const reviewed = useAppStore((s) => s.reviewed);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const open = review.filter((r) => !reviewed[r.id]);
  const done = review.filter((r) => reviewed[r.id]).slice(0, 2);

  return (
    <Card style={styles.gap}>
      <View>
        <Text variant="title">{T.review}</Text>
        <Text variant="subhead">{T.reviewSub}</Text>
      </View>
      {open.length === 0 ? <EmptyState title={T.empty} subtitle={T.emptySub} expression="proud" /> : null}
      {open.map((r) => {
        const q = QUESTION_BY_ID[r.questionId];
        const draft = drafts[r.id] ?? `${q.hint.en} The right answer is ${q.options[q.answer]}.`;
        return (
          <View key={r.id} style={[styles.reviewItem, { backgroundColor: c.inset }]}>
            <View style={styles.rowBetween}>
              <Text variant="subhead" color="text" style={styles.flex} numberOfLines={1}>
                {r.student}
              </Text>
              <Chip label={T.confidence(Math.round(r.confidence * 100))} kind="tinted" style={styles.smallChip} />
            </View>
            <Text variant="headline">{q.prompt.en}</Text>
            <Text variant="subhead">
              {T.wrong}:{' '}
              <Text variant="subhead" color="danger">
                {q.options[r.wrongIndex]}
              </Text>
            </Text>
            <Text variant="overline">{T.draft}</Text>
            {editing === r.id ? (
              <TextInput
                value={draft}
                onChangeText={(v) => setDrafts((d) => ({ ...d, [r.id]: v }))}
                multiline
                style={[styles.input, { color: c.text, backgroundColor: c.card, borderColor: c.hairline }]}
                accessibilityLabel={T.draft}
              />
            ) : (
              <Text variant="body">{draft}</Text>
            )}
            <View style={styles.actions}>
              {editing === r.id ? (
                <PillButton
                  label={T.save}
                  size="sm"
                  onPress={() => {
                    setEditing(null);
                    useAppStore.getState().setReviewed(r.id, 'edited');
                  }}
                />
              ) : (
                <>
                  <PillButton
                    label={T.approve}
                    size="sm"
                    onPress={() => useAppStore.getState().setReviewed(r.id, 'approved')}
                  />
                  <PillButton label={T.edit} kind="secondary" size="sm" onPress={() => setEditing(r.id)} />
                </>
              )}
            </View>
          </View>
        );
      })}
      {done.map((r) => (
        <View key={r.id} style={styles.rowBetween}>
          <Text variant="subhead" style={styles.flex} numberOfLines={1}>
            {r.student} · {QUESTION_BY_ID[r.questionId].prompt.en}
          </Text>
          <Chip label={reviewed[r.id] === 'approved' ? T.approved : T.edited} kind="outline" style={styles.smallChip} />
        </View>
      ))}
    </Card>
  );
}

function AccountCard({ classId }: { classId?: string }) {
  const me = useAuth((s) => s.profile);
  const [confirm, setConfirm] = useState<'class' | 'account' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  return (
    <View style={styles.gap}>
      <Text variant="overline" style={styles.label}>
        {T.account} · {me.email}
      </Text>
      {error ? <Notice text={error} /> : null}
      <ListGroup>
        {classId ? (
          <ListRow
            title={confirm === 'class' ? T.deleteConfirm : T.deleteClass}
            destructive
            chevron={false}
            onPress={() => {
              if (confirm !== 'class') return setConfirm('class');
              setConfirm(null);
              api
                .deleteClass(classId)
                .then(() => loadClasses())
                .catch((e: Error) => setError(e.message));
            }}
          />
        ) : null}
        <ListRow
          title={T.signOut}
          chevron={false}
          onPress={async () => {
            await api.signOut();
            router.replace('/onboarding');
          }}
        />
        <ListRow
          title={confirm === 'account' ? T.deleteAccountConfirm : T.deleteAccount}
          destructive
          chevron={false}
          onPress={async () => {
            if (confirm !== 'account') return setConfirm('account');
            try {
              await api.deleteAccount();
              router.replace('/onboarding');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </ListGroup>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  segRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  seg: { maxWidth: 420, flexGrow: 1 },
  columns: { flexDirection: 'row', gap: space.gap, alignItems: 'flex-start' },
  mainCol: { flex: 1.62 },
  sideCol: { flex: 1, gap: space.gap },
  gap: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  insight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: radius.sm,
  },
  supportRow: { borderRadius: radius.inset },
  supportInner: { padding: 14, gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  smallChip: { height: 26, paddingHorizontal: 10 },
  reviewItem: { borderRadius: radius.inset, padding: 14, gap: 8 },
  input: { minHeight: 72, borderRadius: 12, borderWidth: 1, padding: 10, fontSize: 15, textAlignVertical: 'top' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 4 },
  sheet: { gap: 14, paddingBottom: 8 },
  bigCell: { width: 76, height: 56, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  joinCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  codeText: { letterSpacing: 4, fontSize: 30, lineHeight: 36 },
  label: { paddingHorizontal: 4, marginTop: 8 },
});

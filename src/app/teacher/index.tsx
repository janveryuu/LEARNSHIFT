import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChalkboardTeacher, TrendDown, Warning } from 'phosphor-react-native';

import { ClassHeatmap, MasteryLegend, masteryColor } from '@/components/teacher/ClassHeatmap';
import {
  BottomSheet,
  Card,
  Chip,
  DevChip,
  EmptyState,
  PillButton,
  SegmentedControl,
  Stagger,
  Text,
} from '@/components/ui';
import { buildSections, needsSupport, type Student } from '@/data/class';
import { QUESTION_BY_ID } from '@/data/questions';
import { SKILL_BY_ID, SKILLS, type SkillId } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { fontFor } from '@/design/typography';
import { teacherStrings as T } from '@/i18n/staff';
import { gapEngine } from '@/services/ai/gapEngine';
import { useAppStore } from '@/store/useAppStore';

export default function TeacherHome() {
  const { c, isNight } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const mika = useAppStore((s) => s.mastery);
  const sections = useMemo(() => buildSections(mika), [mika]);
  const [sectionId, setSectionId] = useState(sections[0].id);
  const [cell, setCell] = useState<{ s: Student; skill: SkillId } | null>(null);
  const section = sections.find((s) => s.id === sectionId) ?? sections[0];
  const support = useMemo(() => needsSupport(section, (m) => gapEngine.rootGap(m)), [section]);

  // Most common root gap across the section.
  const rootCounts = useMemo(() => {
    const counts = new Map<SkillId, number>();
    for (const st of section.students) {
      const r = gapEngine.rootGap(st.mastery);
      if (st.mastery[r] < 0.5) counts.set(r, (counts.get(r) ?? 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0];
  }, [section]);

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
      <ClassHeatmap
        students={section.students}
        width={heatInner}
        height={wide ? 620 : 470}
        highlight={rootCounts?.[0]}
        onCell={(s, skill) => setCell({ s, skill })}
        onStudent={openStudent}
      />
    </Card>
  );

  const side = (
    <View style={styles.sideCol}>
      <Card style={styles.gap}>
        <Text variant="title">{T.needs}</Text>
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
      <ReviewQueue />
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
              {T.title}
            </Text>
            <Text variant="subhead">
              {T.teacher} · {T.learningOnly}
            </Text>
          </View>
          <DevChip onPress={() => router.push('/demo')} />
        </Stagger>
        <Stagger index={1}>
          <SegmentedControl
            options={sections.map((s) => ({ value: s.id, label: s.name }))}
            value={sectionId}
            onChange={setSectionId}
            style={styles.seg}
          />
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

function ReviewQueue() {
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  badge: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  seg: { maxWidth: 420 },
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
});

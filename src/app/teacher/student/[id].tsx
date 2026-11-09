import { useMemo } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, LockKey } from 'phosphor-react-native';

import { MasteryRow } from '@/components/learn/MasteryRow';
import { BarChart, Card, Chip, EmptyState, NavBar, Ring, Text } from '@/components/ui';
import { buildSections } from '@/data/class';
import { SKILL_BY_ID, SKILLS } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { teacherStrings as T } from '@/i18n/staff';
import { gapEngine } from '@/services/ai/gapEngine';
import { useAppStore } from '@/store/useAppStore';

/** One student's learning picture. Learning data only — no screen-time data exists here. */
export default function TeacherStudent() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { id, section } = useLocalSearchParams<{ id: string; section?: string }>();
  const mika = useAppStore((s) => s.mastery);
  const student = useMemo(() => {
    const secs = buildSections(mika);
    const sec = secs.find((s) => s.id === section) ?? secs[0];
    return sec.students.find((s) => s.id === id) ?? secs.flatMap((s) => s.students).find((s) => s.id === id);
  }, [mika, id, section]);
  const wide = width >= 900;

  if (!student) {
    return (
      <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
        <NavBar onBack={() => router.back()} backIcon={<CaretLeft size={20} weight="bold" color={c.text} />} />
        <EmptyState title="Student not found" />
      </View>
    );
  }

  const avg = SKILLS.reduce((a, s) => a + student.mastery[s.id], 0) / SKILLS.length;
  const root = gapEngine.rootGap(student.mastery);
  const fc = gapEngine.forecast(student.mastery, root);
  const date = fc.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const sorted = [...SKILLS].sort((a, b) => student.mastery[a.id] - student.mastery[b.id]);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <NavBar
        onBack={() => router.back()}
        backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
        title={student.name}
      />
      <ScrollView
        contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 32, maxWidth: wide ? 1000 : 560 }]}
      >
        <View style={wide ? styles.columns : styles.stack}>
          <View style={[styles.stack, wide && styles.flex]}>
            <Card style={styles.summary}>
              <Ring progress={avg} size={96} stroke={9} accessibilityLabel={`${T.avg} ${Math.round(avg * 100)}%`}>
                <Text variant="statNumber">{Math.round(avg * 100)}</Text>
              </Ring>
              <View style={styles.flexGap}>
                <Text variant="overline">{T.avg}</Text>
                <Text variant="title">{student.name}</Text>
                <Chip label={T.rootGap(SKILL_BY_ID[root].name.en)} kind="tinted" />
                {!fc.mastered ? <Text variant="subhead">{T.forecast(SKILL_BY_ID[root].name.en, date)}</Text> : null}
              </View>
            </Card>
            <Card style={styles.gap}>
              <Text variant="headline">{T.trend}</Text>
              <BarChart
                values={student.history.map((h) => Math.round(h * 100))}
                labels={['W1', 'W2', 'W3', 'W4', 'W5']}
                highlight={4}
                highlightLabel={`${Math.round(student.history[4] * 100)}%`}
                max={100}
                height={110}
                accessibilityLabel={`${T.trend}: ${student.history.map((h) => Math.round(h * 100)).join(', ')} percent`}
              />
            </Card>
            <View style={[styles.note, { backgroundColor: c.inset }]}>
              <LockKey size={16} weight="fill" color={c.textSecondary} />
              <Text variant="subhead" style={styles.flex}>
                {T.learningOnly}
              </Text>
            </View>
          </View>
          <Card style={[styles.gapLg, wide && styles.flex]}>
            <Text variant="headline">{T.mastery}</Text>
            {sorted.map((s) => (
              <MasteryRow
                key={s.id}
                label={s.name.en}
                from={0}
                to={student.mastery[s.id]}
                color={s.id === root ? c.accent : student.mastery[s.id] >= 0.7 ? c.success : c.accentFaded}
                delay={120}
              />
            ))}
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 6, alignItems: 'flex-start' },
  body: { paddingHorizontal: space.screen, width: '100%', alignSelf: 'center' },
  columns: { flexDirection: 'row', gap: space.gap, alignItems: 'flex-start' },
  stack: { gap: space.gap },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  gap: { gap: 10 },
  gapLg: { gap: 16 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 14, borderRadius: radius.inset },
});

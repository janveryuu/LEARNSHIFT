import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
import type { Student } from '@/data/class';
import { SKILLS, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import type { Palette } from '@/design/tokens';

/** Five mastery bands: needs work (ember) → strong (green). */
export function masteryColor(m: number, c: Palette, isNight: boolean): string {
  if (m < 0.35) return c.accent;
  if (m < 0.5) return c.accentFaded;
  if (m < 0.65) return c.chartIdle;
  if (m < 0.8) return isNight ? '#3C6E54' : '#A8E2B9';
  return c.success;
}

type Props = {
  students: Student[];
  width: number;
  height: number;
  onCell: (s: Student, skill: SkillId) => void;
  onStudent: (s: Student) => void;
  highlight?: SkillId | null;
};

/**
 * Students (rows) × Grade 7 Math skills (columns). Sticky skill header,
 * cells sized to fit the card so nothing scrolls sideways at 360 dp.
 */
export function ClassHeatmap({ students, width, height, onCell, onStudent, highlight }: Props) {
  const { c, isNight } = useTheme();
  const nameW = Math.min(150, Math.max(78, width * 0.26));
  const cell = Math.max(20, Math.min(52, Math.floor((width - nameW) / SKILLS.length)));
  const [focus, setFocus] = useState<string | null>(null);

  return (
    <View style={{ height }}>
      <ScrollView stickyHeaderIndices={[0]} showsVerticalScrollIndicator={false} nestedScrollEnabled>
        <View style={[styles.header, { backgroundColor: c.card }]}>
          <View style={{ width: nameW }} />
          {SKILLS.map((s) => (
            <View key={s.id} style={[styles.headCell, { width: cell }]}>
              <Text
                variant="caption"
                color={highlight === s.id ? 'accent' : 'textSecondary'}
                style={styles.headText}
                numberOfLines={1}
                accessibilityLabel={s.name.en}
              >
                {s.abbr}
              </Text>
            </View>
          ))}
        </View>
        {students.map((st) => (
          <View key={st.id} style={[styles.row, focus === st.id && { backgroundColor: c.inset }]}>
            <Pressable
              onPress={() => {
                haptic.select();
                onStudent(st);
              }}
              style={[styles.name, { width: nameW }]}
              accessibilityRole="button"
              accessibilityLabel={st.name}
            >
              <Text variant="subhead" color="text" numberOfLines={1}>
                {width < 520 ? st.name.split(' ')[0] + ' ' + st.name.split(' ').slice(-1)[0][0] + '.' : st.name}
              </Text>
            </Pressable>
            {SKILLS.map((s) => (
              <Pressable
                key={s.id}
                onPress={() => {
                  haptic.select();
                  setFocus(st.id);
                  onCell(st, s.id);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${st.name}, ${s.name.en}, ${Math.round(st.mastery[s.id] * 100)}%`}
                style={({ pressed }) => [
                  styles.cellWrap,
                  { width: cell, height: Math.min(cell, 30) + 4, opacity: pressed ? 0.6 : 1 },
                ]}
              >
                <View
                  style={[
                    styles.cell,
                    { backgroundColor: masteryColor(st.mastery[s.id], c, isNight) },
                    highlight === s.id && styles.cellHi,
                  ]}
                />
              </Pressable>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

export function MasteryLegend({ low, high }: { low: string; high: string }) {
  const { c, isNight } = useTheme();
  return (
    <View style={styles.legend} accessible accessibilityLabel={`${low} to ${high}`}>
      <Text variant="caption">{low}</Text>
      {[0.2, 0.42, 0.58, 0.72, 0.9].map((m) => (
        <View key={m} style={[styles.legendCell, { backgroundColor: masteryColor(m, c, isNight) }]} />
      ))}
      <Text variant="caption">{high}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', paddingBottom: 6 },
  headCell: { alignItems: 'center' },
  headText: { fontSize: 10, letterSpacing: 0.3 },
  row: { flexDirection: 'row', alignItems: 'center', borderRadius: 8 },
  name: { paddingRight: 6, minHeight: 30, justifyContent: 'center' },
  cellWrap: { padding: 2 },
  cell: { flex: 1, borderRadius: 5 },
  cellHi: { borderWidth: 1.5, borderColor: 'rgba(0,0,0,0.25)' },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendCell: { width: 14, height: 14, borderRadius: 4 },
});

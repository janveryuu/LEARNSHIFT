import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CalendarCheck, Target } from 'phosphor-react-native';

import { BarChart, Card, Chip, PillButton, Ring, SheetHeader, Text } from '@/components/ui';
import { SKILL_BY_ID, type SkillId } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { useL, useLang, useT } from '@/i18n/useT';
import { gapEngine, MASTERED } from '@/services/ai/gapEngine';
import { useAppStore } from '@/store/useAppStore';

export default function SkillSheet() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: SkillId }>();
  const skill = SKILL_BY_ID[id ?? 'fractions'] ?? SKILL_BY_ID.fractions;
  const mastery = useAppStore((s) => s.mastery);
  const live = useLive();
  const m = mastery[skill.id];
  const isRoot = skill.id === live.root;
  const fc = gapEngine.forecast(mastery, skill.id);
  const date = fc.date.toLocaleDateString(lang === 'fil' ? 'fil-PH' : 'en-US', { month: 'short', day: 'numeric' });
  const allHistory = useAppStore((s) => s.history);
  const past = allHistory[skill.id] ?? [];
  const history = [...past, m].map((v) => Math.round(v * 100));
  const weeks = [
    ...past.map((_, k) => (lang === 'fil' ? `L${k + 1}` : `W${k + 1}`)),
    lang === 'fil' ? 'Ngayon' : 'Now',
  ];
  const names = (ids: SkillId[]) => ids.map((x) => L(SKILL_BY_ID[x].name)).join(', ');

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SheetHeader title={L(skill.name)} right={{ label: t.common.done, onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Card style={styles.hero}>
          <Ring
            progress={m}
            size={132}
            stroke={11}
            color={isRoot ? c.accent : m >= 0.7 ? c.success : c.warning}
            accessibilityLabel={`${t.skill.mastery} ${Math.round(m * 100)}%`}
          >
            <View style={styles.pct}>
              <Text variant="display" style={styles.num}>
                {Math.round(m * 100)}
              </Text>
              <Text variant="displayUnit">%</Text>
            </View>
          </Ring>
          <Text variant="overline">{t.skill.mastery}</Text>
          {isRoot ? (
            <Chip
              style={{ alignSelf: 'center' }}
              label={t.learn.rootGap}
              kind="accent"
              icon={<Target size={14} weight="fill" color={c.onAccent} />}
            />
          ) : null}
        </Card>

        <Card style={styles.gap}>
          {isRoot && live.blocked.length ? (
            <Text variant="headline">
              {t.skill.rootFor(names(live.blocked.slice(0, 2)))}
              {live.blocked.length > 2 ? ` +${live.blocked.length - 2}` : ''}
            </Text>
          ) : skill.prereqs.length ? (
            <Text variant="headline">{t.skill.buildsOn(names(skill.prereqs))}</Text>
          ) : (
            <Text variant="headline">{t.skill.noPrereq}</Text>
          )}
          <View style={styles.forecast}>
            <CalendarCheck size={20} weight="fill" color={c.success} />
            <Text variant="subhead" color="text" style={styles.flex}>
              {fc.mastered || m >= MASTERED ? t.skill.mastered : t.skill.forecast(date)}
            </Text>
          </View>
        </Card>

        <Card style={styles.gap}>
          <Text variant="headline">{t.skill.history}</Text>
          <BarChart
            values={history}
            labels={weeks}
            highlight={history.length - 1}
            highlightLabel={`${history[history.length - 1]}%`}
            max={100}
            height={110}
            accessibilityLabel={`${t.skill.history}: ${history.join(', ')}%`}
          />
        </Card>

        <View style={styles.row}>
          <PillButton
            label={t.skill.practice}
            size="lg"
            style={styles.flex}
            block
            onPress={() => {
              router.back();
              setTimeout(() => router.push({ pathname: '/quiz/[skillId]', params: { skillId: skill.id } }), 250);
            }}
          />
          <PillButton
            label={t.skill.startBreak}
            kind="secondary"
            size="lg"
            style={styles.flex}
            block
            onPress={() => {
              router.back();
              setTimeout(() => router.push({ pathname: '/break/[id]', params: { id: skill.id } }), 250);
            }}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 8 },
  pct: { flexDirection: 'row', alignItems: 'flex-end' },
  num: { fontSize: 44, lineHeight: 48 },
  gap: { gap: 12 },
  forecast: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  row: { flexDirection: 'row', gap: space.gap },
});

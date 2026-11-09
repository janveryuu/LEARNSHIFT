import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { Lightning, Moon, Sparkle, Timer } from 'phosphor-react-native';

import { Screen } from '@/components/student/Screen';
import {
  BarChart,
  Card,
  Chip,
  Heatmap,
  LargeTitleHeader,
  ListGroup,
  ListRow,
  Ring,
  Stagger,
  StatTile,
  Text,
} from '@/components/ui';
import { heatmapMonths, seedHeatmap } from '@/data/seed';
import { MIKA_HISTORY } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { useWeek, weeklyGrade } from '@/hooks/useWeek';
import { formatDuration, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

const WEEKS = 22;

export default function Insights() {
  const { c } = useTheme();
  const t = useT();
  const week = useWeek();
  const mastery = useAppStore((s) => s.mastery);
  const feed = useAppStore((s) => s.feed);
  const nudges = useAppStore((s) => s.nudges);
  const heat = useMemo(() => seedHeatmap(WEEKS), []);
  const months = useMemo(() => heatmapMonths(WEEKS, t.months), [t.months]);

  // Learning days this month = non-zero cells in the current month.
  const learningDays = useMemo(() => {
    const today = new Date();
    const lastIndex = WEEKS * 7 - 1 - (6 - today.getDay());
    return heat.slice(lastIndex - today.getDate() + 1, lastIndex + 1).filter((v) => v > 0).length;
  }, [heat]);

  const masteryUp = mastery.fractions - MIKA_HISTORY.fractions[0];
  const { score, grade } = weeklyGrade(week.breaks, week.breakTarget, week.lateMinutes, masteryUp);
  const todayIdx = 6;
  const labels = week.days.map((d) => t.days.long[d.weekday]);
  const feedMin = 42 + Math.round(feed.minutes);
  const calmNights = week.days.filter((d) => d.lateMinutes === 0).length;

  let i = 0;
  return (
    <Screen
      tabs
      header={
        <LargeTitleHeader
          title={t.insights.title}
          action={{ label: t.common.share, onPress: () => router.push('/share') }}
        />
      }
    >
      <Stagger index={i++}>
        <Card style={styles.gap}>
          <View style={styles.rowBetween}>
            <Text variant="headline">{t.insights.learningDays}</Text>
            <View style={styles.inline}>
              <Text variant="title">{learningDays}</Text>
              <Text variant="caption"> {t.insights.days}</Text>
            </View>
          </View>
          <Heatmap
            data={heat}
            weeks={WEEKS}
            months={months}
            accessibilityLabel={`${t.insights.learningDays}: ${learningDays} ${t.insights.days}`}
          />
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.gap}>
          <View style={styles.rowBetween}>
            <View>
              <Text variant="headline">{t.insights.screenTime}</Text>
              <Text variant="subhead">{t.insights.avg(formatDuration(week.avgMinutes))}</Text>
            </View>
            <Text variant="subhead" color="success">
              {t.insights.vsLast(formatDuration(week.dropMinutes))}
            </Text>
          </View>
          <BarChart
            values={week.days.map((d) => d.minutes)}
            labels={labels}
            highlight={todayIdx}
            highlightLabel={formatDuration(week.days[todayIdx].minutes)}
            accessibilityLabel={`${t.insights.screenTime}: ${week.days.map((d, k) => `${labels[k]} ${formatDuration(d.minutes)}`).join(', ')}`}
          />
        </Card>
      </Stagger>

      <Stagger index={i++} style={styles.row}>
        <StatTile
          label={t.insights.lateNight}
          value={week.lateMinutes}
          unit="m"
          caption={t.insights.thisWeek}
          icon={<Moon size={16} weight="fill" color={c.indigo} />}
          style={styles.flex}
        />
        <StatTile
          label={t.insights.breaks}
          value={`${week.breaks}/${week.breakTarget}`}
          caption={t.insights.taken}
          icon={<Lightning size={16} weight="fill" color={c.accent} />}
          style={styles.flex}
        />
      </Stagger>
      <Stagger index={i++} style={styles.row}>
        <StatTile
          label={t.insights.mastery}
          value={`+${Math.round(masteryUp * 100)}`}
          unit="%"
          caption={t.insights.fractionsUp}
          icon={<Sparkle size={16} weight="fill" color={c.success} />}
          style={styles.flex}
          onPress={() => router.push({ pathname: '/skill/[id]', params: { id: 'fractions' } })}
        />
        <StatTile
          label={t.insights.feed}
          value={feedMin}
          unit="m"
          caption={t.insights.underCap}
          icon={<Timer size={16} weight="fill" color={c.tabInsights} />}
          style={styles.flex}
        />
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.report}>
          <Ring progress={score} size={104} stroke={9} accessibilityLabel={`${t.insights.report}: ${grade}`}>
            <Text variant="statNumber">{grade}</Text>
          </Ring>
          <View style={styles.flexGap}>
            <Chip label={t.insights.report} kind="accent" style={styles.smallChip} />
            <Text variant="headline">{t.insights.reportTitle}</Text>
            <Text variant="subhead">{t.insights.reportSub(calmNights)}</Text>
          </View>
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <ListGroup>
          <ListRow
            title={t.insights.nudgeHistory}
            value={String(nudges.length)}
            onPress={() => router.push('/nudges')}
          />
        </ListGroup>
      </Stagger>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 4, alignItems: 'flex-start' },
  gap: { gap: 14 },
  row: { flexDirection: 'row', gap: space.gap },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  inline: { flexDirection: 'row', alignItems: 'flex-end' },
  report: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  smallChip: { height: 24, paddingHorizontal: 10, marginBottom: 4 },
});

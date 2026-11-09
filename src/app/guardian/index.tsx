import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, EyeSlash, Moon, Sparkle } from 'phosphor-react-native';

import { Tarsi } from '@/components/mascot/Tarsi';
import {
  BarChart,
  Card,
  Chip,
  DevChip,
  EmptyState,
  PillButton,
  Ring,
  SegmentedControl,
  Stagger,
  StatTile,
  Text,
  Toggle,
} from '@/components/ui';
import { MIKA_HISTORY } from '@/data/skills';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useWeek, weeklyGrade } from '@/hooks/useWeek';
import { useGuardianT } from '@/i18n/staff';
import { formatClock, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

const BEDTIMES = [21 * 60 + 30, 22 * 60, 22 * 60 + 30];

/** Guardian view: habits only — a one-minute weekly summary, controls and requests. */
export default function Guardian() {
  const { c } = useTheme();
  const g = useGuardianT();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const week = useWeek();
  const mastery = useAppStore((s) => s.mastery);
  const guardian = useAppStore((s) => s.guardian);
  const bedtime = useAppStore((s) => s.bedtime);
  const requests = useAppStore((s) => s.requests);
  const { score, grade } = weeklyGrade(
    week.breaks,
    week.breakTarget,
    week.lateMinutes,
    mastery.fractions - MIKA_HISTORY.fractions[0],
  );
  const lateNights = week.days.filter((d) => d.lateMinutes > 0).length;
  const learningMin = week.breaks * 3 + 42;

  const summary = (
    <View style={styles.col}>
      <Card style={styles.gap}>
        <View style={styles.rowTop}>
          <View style={styles.flexGap}>
            <Text variant="overline">{g.title}</Text>
            <Text variant="title">{g.summary(week.dropMinutes, Math.max(1, lateNights), 5)}</Text>
          </View>
          <Tarsi expression="proud" size={84} />
        </View>
        <View style={[styles.report, { backgroundColor: c.inset }]}>
          <Ring progress={score} size={64} stroke={7}>
            <Text variant="headline">{grade}</Text>
          </Ring>
          <View style={styles.flex}>
            <Text variant="overline">{g.report}</Text>
            <Text variant="headline">{t.insights.reportTitle}</Text>
          </View>
        </View>
      </Card>
      <Card style={styles.gap}>
        <Text variant="headline">{g.perDay}</Text>
        <BarChart
          values={week.days.map((d) => d.minutes)}
          labels={week.days.map((d) => t.days.long[d.weekday])}
          highlight={6}
          height={110}
          accessibilityLabel={g.perDay}
        />
      </Card>
      <View style={styles.row}>
        <StatTile
          label={g.lateNight}
          value={week.lateMinutes}
          unit="m"
          icon={<Moon size={16} weight="fill" color={c.indigo} />}
          style={styles.flex}
        />
        <StatTile
          label={g.learning}
          value={learningMin}
          unit="m"
          icon={<Sparkle size={16} weight="fill" color={c.success} />}
          style={styles.flex}
        />
      </View>
    </View>
  );

  const side = (
    <View style={styles.col}>
      <Card style={styles.gap}>
        <Text variant="title">{g.requests}</Text>
        {requests.length === 0 ? <EmptyState title={g.none} subtitle={g.noneSub} expression="happy" /> : null}
        {requests.slice(0, 4).map((r) => {
          const d = new Date(r.at);
          const when = `${t.days.long[d.getDay()]} · ${formatClock(d.getHours() * 60 + d.getMinutes())}`;
          return (
            <View key={r.id} style={[styles.request, { backgroundColor: c.inset }]}>
              <View style={styles.reqHead}>
                <View style={[styles.reqIcon, { backgroundColor: c.accentTint }]}>
                  <Clock size={18} weight="fill" color={c.accent} />
                </View>
                <View style={styles.flex}>
                  <Text variant="headline">{g.requestTitle(r.minutes)}</Text>
                  <Text variant="caption">{g.requestSub(when)}</Text>
                </View>
                {r.status !== 'pending' ? (
                  <Chip
                    label={r.status === 'approved' ? g.approved : g.declined}
                    kind={r.status === 'approved' ? 'accent' : 'neutral'}
                  />
                ) : null}
              </View>
              {r.status === 'pending' ? (
                <View style={styles.row}>
                  <PillButton
                    label={g.approve}
                    style={styles.flex}
                    block
                    onPress={() => useAppStore.getState().resolveRequest(r.id, 'approved')}
                  />
                  <PillButton
                    label={g.decline}
                    kind="secondary"
                    style={styles.flex}
                    block
                    onPress={() => useAppStore.getState().resolveRequest(r.id, 'declined')}
                  />
                </View>
              ) : null}
            </View>
          );
        })}
      </Card>

      <Card style={styles.gapLg}>
        <Text variant="title">{g.controls}</Text>
        <View style={styles.gap}>
          <Text variant="headline">{g.bedtime}</Text>
          <SegmentedControl
            options={BEDTIMES.map((m) => ({ value: String(m), label: formatClock(m) }))}
            value={String(BEDTIMES.includes(bedtime.start) ? bedtime.start : 22 * 60)}
            onChange={(v) => useAppStore.getState().setBedtime({ ...bedtime, start: Number(v) })}
            compact
          />
        </View>
        <View style={[styles.toggleRow, { borderColor: c.hairline }]}>
          <Text variant="headline" style={styles.flex}>
            {g.alerts}
          </Text>
          <Toggle
            value={guardian.lateNightAlerts}
            onChange={(v) => useAppStore.getState().setGuardian({ lateNightAlerts: v })}
            accessibilityLabel={g.alerts}
          />
        </View>
        <View style={[styles.toggleRow, { borderColor: c.hairline }]}>
          <View style={styles.flex}>
            <Text variant="headline">{g.lock}</Text>
            <Text variant="caption">{g.lockSub}</Text>
          </View>
          <Toggle
            value={guardian.lockEnabled}
            onChange={(v) => useAppStore.getState().setGuardian({ lockEnabled: v })}
            accessibilityLabel={g.lock}
          />
        </View>
        <View style={[styles.gap, styles.toggleRow, styles.column, { borderColor: c.hairline }]}>
          <Text variant="headline">{g.limit}</Text>
          <SegmentedControl<'adaptive' | 'fixed'>
            options={[
              { value: 'adaptive', label: g.adaptive },
              { value: 'fixed', label: g.fixed },
            ]}
            value={guardian.limitStyle}
            onChange={(v) => useAppStore.getState().setGuardian({ limitStyle: v })}
          />
        </View>
      </Card>
    </View>
  );

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.body, { maxWidth: wide ? 1100 : 560, paddingBottom: insets.bottom + 40 }]}
      >
        <Stagger index={0} style={styles.header}>
          <View style={styles.flex}>
            <Text variant="largeTitle">{g.hello(guardian.name)}</Text>
            <Text variant="subhead">Mika · Grade 8 · Sampaguita</Text>
          </View>
          <DevChip label={t.demo.title} onPress={() => router.push('/demo')} />
        </Stagger>
        <Stagger index={1}>
          <View style={[styles.note, { backgroundColor: c.card, borderColor: c.hairline }]}>
            <EyeSlash size={18} weight="fill" color={c.success} />
            <Text variant="subhead" color="text" style={styles.flex}>
              {g.note}
            </Text>
          </View>
        </Stagger>
        {wide ? (
          <View style={styles.columns}>
            <View style={styles.flex}>{summary}</View>
            <View style={styles.flex}>{side}</View>
          </View>
        ) : (
          <>
            {summary}
            {side}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 6 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 8 },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: radius.inset,
    borderWidth: 1,
  },
  columns: { flexDirection: 'row', gap: space.gap, alignItems: 'flex-start' },
  col: { gap: space.gap },
  gap: { gap: 10 },
  gapLg: { gap: 16 },
  row: { flexDirection: 'row', gap: 10 },
  rowTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  report: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 12, borderRadius: radius.inset },
  request: { borderRadius: radius.inset, padding: 14, gap: 12 },
  reqHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  reqIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  column: { flexDirection: 'column', alignItems: 'stretch' },
});

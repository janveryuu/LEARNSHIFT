import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { ArrowRight } from 'phosphor-react-native';

import { IslaScene } from '@/components/isla/IslaScene';
import { Tarsi, TarsiAvatar } from '@/components/mascot/Tarsi';
import { Screen, useTabInset } from '@/components/student/Screen';
import {
  AnimatedNumber,
  Card,
  DevChip,
  InsetCard,
  PillButton,
  RiskChip,
  Ring,
  SparkCount,
  Stagger,
  StreakRow,
  Text,
  TickGauge,
} from '@/components/ui';
import { SHORT } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { fontFor } from '@/design/typography';
import { useLive } from '@/hooks/useLive';
import { splitDuration, useWeek } from '@/hooks/useWeek';
import { formatClock, formatDuration, useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

export default function Home() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const live = useLive();
  const week = useWeek();
  const coins = useAppStore((s) => s.coins);
  const built = useAppStore((s) => s.built);
  const bedtime = useAppStore((s) => s.bedtime);
  const mastery = useAppStore((s) => s.mastery);
  const { width } = useWindowDimensions();
  const inset = useTabInset();
  const cardW = Math.min(width, 560) - space.screen * 2;
  const gaugeW = Math.min(320, cardW - space.card * 2);

  const [num, unit] = splitDuration(live.usedMinutes);
  const cap = formatDuration(live.capMinutes);
  // Algebra slips are what Mika notices first; fall back to the weakest blocked skill.
  const blocked = live.blocked.includes('algebraic') ? 'algebraic' : (live.blocked[0] ?? 'algebraic');
  const openDemo = () => router.push('/demo');
  // Guardrail: no quizzes or learning breaks inside the bedtime window.
  const night = live.risk.lateNight;

  let i = 0;
  return (
    <Screen
      tabs
      overlay={
        <View style={[styles.demo, { bottom: inset - 6 }]} pointerEvents="box-none">
          <DevChip label={t.demo.title} onPress={openDemo} />
        </View>
      }
    >
      <Stagger index={i++} style={styles.header}>
        <Pressable
          onLongPress={() => {
            haptic.medium();
            openDemo();
          }}
          delayLongPress={450}
          accessibilityRole="header"
          accessibilityLabel="LearnShift"
          accessibilityHint="Long-press for the demo panel"
          style={styles.brand}
        >
          <TarsiAvatar size={30} />
          <Text variant="title" style={styles.wordmark}>
            LearnShift
          </Text>
        </Pressable>
        <SparkCount value={week.streakCount} />
      </Stagger>

      <Stagger index={i++} style={styles.streak}>
        <StreakRow days={week.streak} />
      </Stagger>

      <Stagger index={i++}>
        <Text variant="title" style={styles.section}>
          {t.home.today}
        </Text>
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.hero}>
          <View style={styles.chipRow}>
            <RiskChip level={live.risk.level} />
          </View>
          <View style={styles.center}>
            <TickGauge
              progress={Math.min(1, live.usedMinutes / live.capMinutes)}
              width={gaugeW}
              color={live.risk.level === 'calm' ? c.accent : live.risk.level === 'winddown' ? c.indigo : c.accent}
              accessibilityLabel={t.home.gaugeLabel(formatDuration(live.usedMinutes), cap)}
            >
              <View style={styles.heroNum}>
                <AnimatedNumber value={num} variant="display" fromZero={false} />
                <Text variant="displayUnit" style={styles.unit}>
                  {unit}
                </Text>
              </View>
              <Text variant="subhead">{live.schoolDay ? t.home.ofCap(cap) : t.home.ofCapWeekend(cap)}</Text>
            </TickGauge>
          </View>
          <View style={styles.row}>
            {night ? (
              <InsetCard
                label={t.risk.winddown}
                value={t.home.windDown}
                chevron
                style={styles.flex}
                onPress={() => router.push('/winddown')}
              />
            ) : (
              <InsetCard
                label={t.home.nextBreak}
                value={L(SHORT[live.root])}
                chevron
                style={styles.flex}
                onPress={() => router.push({ pathname: '/break/[id]', params: { id: live.root } })}
              />
            )}
            <InsetCard
              label={t.home.bedtime}
              value={formatClock(bedtime.start)}
              chevron
              style={styles.flex}
              onPress={() => router.push('/bedtime')}
            />
          </View>
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.breakCard}>
          {night ? (
            <View style={styles.breakText}>
              <Text variant="headline">{t.home.nightTitle}</Text>
              <Text variant="subhead">{t.home.nightSub}</Text>
              <PillButton label={t.home.nightBtn} style={styles.mt} onPress={() => router.push('/winddown')} />
            </View>
          ) : (
            <View style={styles.breakText}>
              <Text variant="headline">{t.home.readyTitle}</Text>
              <Text variant="subhead">{t.home.readySub(L(SHORT[live.root]))}</Text>
              <PillButton
                label={t.home.startBreak}
                style={styles.mt}
                onPress={() => router.push({ pathname: '/break/[id]', params: { id: live.root } })}
              />
            </View>
          )}
          <Tarsi expression={night ? 'sleepy' : 'happy'} prop={night ? 'none' : 'pencil'} size={112} />
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card
          onPress={() => router.push({ pathname: '/learn', params: { seg: 'skills' } })}
          style={styles.gapCard}
          accessibilityLabel={t.home.gapTitle(L(SHORT[blocked]), L(SHORT[live.root]))}
        >
          <View style={styles.flexGap}>
            <Text variant="headline" numberOfLines={1}>
              {t.home.gapTitle(L(SHORT[blocked]), L(SHORT[live.root]))}
            </Text>
            <Text variant="subhead" numberOfLines={1}>
              {t.home.gapSub}
            </Text>
          </View>
          <View style={styles.mini}>
            <Ring progress={mastery[blocked]} size={40} stroke={5} color={c.textTertiary}>
              <Text variant="caption" color="text" style={styles.ringTxt}>
                {L(SHORT[blocked]).slice(0, 3)}
              </Text>
            </Ring>
            <ArrowRight size={16} weight="bold" color={c.textSecondary} />
            <Ring progress={mastery[live.root]} size={40} stroke={5} color={c.accent}>
              <Text variant="caption" color="accent" style={styles.ringTxt}>
                {L(SHORT[live.root]).slice(0, 3)}
              </Text>
            </Ring>
          </View>
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card
          style={styles.islaCard}
          padded={false}
          onPress={() => router.push('/isla')}
          accessibilityLabel={t.home.islaTitle}
        >
          <View style={styles.islaArt}>
            <IslaScene built={built} width={Math.min(cardW, 360)} />
          </View>
          <View style={styles.islaText}>
            <View style={styles.flexGap}>
              <Text variant="headline">{t.home.islaTitle}</Text>
              <Text variant="subhead" numberOfLines={1}>
                {t.home.islaSub(coins.toLocaleString('en-US'))}
              </Text>
            </View>
            <View style={[styles.softPill, { backgroundColor: c.accentFaded }]} importantForAccessibility="no">
              <Text variant="subhead" color="onAccent" style={fontFor(700)}>
                {t.home.openIsla}
              </Text>
            </View>
          </View>
        </Card>
      </Stagger>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 6 },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  wordmark: { fontSize: 24, letterSpacing: -0.8, ...fontFor(800) },
  streak: { paddingTop: 30, marginBottom: 4 },
  section: { marginTop: 14, marginLeft: 2 },
  hero: { gap: 14, paddingTop: 14 },
  chipRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: -26, zIndex: 1 },
  center: { alignItems: 'center' },
  heroNum: { flexDirection: 'row', alignItems: 'flex-end' },
  unit: { marginBottom: 8, marginLeft: 2 },
  row: { flexDirection: 'row', gap: space.gap },
  flex: { flex: 1 },
  flexGap: { flex: 1, gap: 2 },
  breakCard: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', paddingRight: 8 },
  breakText: { flex: 1, gap: 2 },
  mt: { marginTop: 12, alignSelf: 'flex-start' },
  gapCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  mini: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  ringTxt: { fontSize: 10, ...fontFor(700) },
  islaCard: { overflow: 'hidden' },
  islaArt: { alignItems: 'center', paddingTop: 8 },
  islaText: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: space.card, paddingTop: 4 },
  demo: { position: 'absolute', right: space.screen },
  softPill: { height: 32, paddingHorizontal: 14, borderRadius: 999, justifyContent: 'center' },
});

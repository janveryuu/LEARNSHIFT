import { useEffect, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, CircleHalf, Pause, Play, ShieldCheck, Wind, X } from 'phosphor-react-native';

import { Tarsi } from '@/components/mascot/Tarsi';
import {
  AnimatedNumber,
  BottomSheet,
  Card,
  Chip,
  DarkTile,
  IconButton,
  PillButton,
  ProgressBar,
  RiskChip,
  Text,
  Toggle,
} from '@/components/ui';
import { haptic } from '@/design/haptics';
import { ease, useReducedMotion } from '@/design/motion';
import { ThemeProvider, useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { formatClock, useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import { notify, respondToNudge } from '@/services/backend/api';
import { useAppStore } from '@/store/useAppStore';

type Panel = 'gray' | 'breathe' | 'story' | null;

export default function WindDownScreen() {
  return (
    <ThemeProvider mode="night">
      <WindDown />
    </ThemeProvider>
  );
}

function WindDown() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const live = useLive();
  const { alert, nudge } = useLocalSearchParams<{ alert?: string; nudge?: string }>();
  const lateAlerts = useAppStore((s) => s.guardian.lateNightAlerts);
  const guardianName = useAppStore((s) => s.guardian.name);
  const linked = useAppStore((s) => s.guardian.linked);
  const [cap, setCap] = useState(30);
  const [panel, setPanel] = useState<Panel>(null);
  const logged = useRef(false);

  useEffect(() => {
    if (!logged.current) {
      logged.current = true;
      if (nudge) {
        // Opened from the phone monitor's notification: it already logged and alerted.
        respondToNudge(nudge, 'followed');
      } else {
        useAppStore.getState().logNudge('winddown', live.risk.reasons, 'followed');
        if (!IS_PITCH && live.inBedtime && linked) {
          const late = (live.clock - useAppStore.getState().bedtime.start + 1440) % 1440;
          notify({ type: 'late_night', clock: live.clock, minutes: late });
        }
      }
    }
    // The session cap visibly shrinks from 30 to 15 minutes.
    const id = setTimeout(() => {
      haptic.light();
      setCap(15);
    }, 1100);
    return () => clearTimeout(id);
  }, [live.risk.reasons, live.inBedtime, live.clock, nudge, linked]);

  const [h, m] = formatClock(live.clock).split(' ');
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <View style={styles.top}>
        <IconButton
          icon={<X size={18} weight="bold" color={c.text} />}
          accessibilityLabel={t.common.close}
          onPress={() => router.back()}
        />
        <RiskChip level="winddown" />
      </View>
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <View style={styles.hero}>
          <Tarsi expression="sleepy" size={150} />
          <Text variant="overline">{t.winddown.sub}</Text>
          <View style={styles.time} accessible accessibilityLabel={t.winddown.its(formatClock(live.clock))}>
            <Text variant="display">{h}</Text>
            <Text variant="displayUnit" style={styles.unit}>
              {m}
            </Text>
          </View>
          <View style={styles.chips}>
            <Chip label={t.winddown.noQuiz} kind="outline" />
            {alert === '1' || (lateAlerts && linked && live.inBedtime) ? (
              <Chip
                label={t.winddown.guardianSent(guardianName)}
                kind="tinted"
                icon={<ShieldCheck size={14} weight="fill" color={c.accent} />}
              />
            ) : null}
          </View>
        </View>

        <Card style={styles.capCard}>
          <View style={styles.capHead}>
            <Text variant="headline" style={styles.flex}>
              {t.winddown.cap}
            </Text>
            <AnimatedNumber value={cap} variant="statNumber" fromZero={false} />
            <Text variant="headline" style={styles.capUnit}>
              {t.common.min}
            </Text>
          </View>
          <ProgressBar
            progress={cap / 30}
            initial={1}
            color={c.indigo}
            height={10}
            accessibilityLabel={`${t.winddown.cap} ${cap} ${t.common.min}`}
          />
        </Card>

        <View style={styles.tiles}>
          <DarkTile
            title={t.winddown.grayscale}
            status={t.winddown.grayscaleSub}
            style={styles.tile}
            onPress={() => setPanel('gray')}
            art={<CircleHalf size={64} weight="fill" color={c.textSecondary} />}
          />
          <DarkTile
            title={t.winddown.breathe}
            status={t.winddown.breatheSub}
            style={styles.tile}
            onPress={() => setPanel('breathe')}
            art={<Wind size={64} weight="fill" color={c.tabInsights} />}
          />
        </View>
        <DarkTile
          title={t.winddown.story}
          status={t.winddown.storySub}
          onPress={() => setPanel('story')}
          art={<BookOpen size={64} weight="fill" color={c.spark} />}
        />

        <PillButton
          label={t.winddown.goodnight}
          size="lg"
          block
          kind="secondary"
          onPress={() => router.dismissTo('/home')}
        />
      </ScrollView>

      <BottomSheet visible={panel === 'gray'} onClose={() => setPanel(null)} accessibilityLabel={t.winddown.grayscale}>
        <GrayscalePanel />
      </BottomSheet>
      <BottomSheet visible={panel === 'breathe'} onClose={() => setPanel(null)} accessibilityLabel={t.winddown.breathe}>
        {panel === 'breathe' ? <BreathePanel /> : null}
      </BottomSheet>
      <BottomSheet visible={panel === 'story'} onClose={() => setPanel(null)} accessibilityLabel={t.winddown.story}>
        <StoryPanel />
      </BottomSheet>
    </View>
  );
}

const PREVIEW: [string, string, string][] = [
  ['#FF7A59', '#C2185B', '#4A148C'],
  ['#43C6AC', '#1E6F5C', '#0B3D2E'],
  ['#F7B733', '#FC4A1A', '#7B1E1E'],
];

function toGray(hex: string): string {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  const y = Math.round(0.3 * r + 0.59 * g + 0.11 * b);
  const h = y.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
}

/** Live preview of the ShortVids feed with color crossfading to grayscale. */
function GrayscalePanel() {
  const t = useT();
  const [on, setOn] = useState(false);
  const g = useSharedValue(0);
  useEffect(() => {
    g.set(withTiming(on ? 1 : 0, { duration: 600, easing: ease.inOut }));
  }, [on, g]);
  const grayLayer = useAnimatedStyle(() => ({ opacity: g.get() }));
  return (
    <View style={styles.panel}>
      <Text variant="title">{t.winddown.grayscale}</Text>
      <View style={styles.previewRow}>
        {PREVIEW.map((cols, i) => (
          <View key={i} style={styles.phone}>
            <LinearGradient colors={cols} style={StyleSheet.absoluteFill} />
            <Animated.View style={[StyleSheet.absoluteFill, grayLayer]}>
              <LinearGradient colors={cols.map(toGray) as [string, string, string]} style={StyleSheet.absoluteFill} />
            </Animated.View>
            <View style={styles.phoneBar} />
            <View style={[styles.phoneBar, styles.phoneBar2]} />
          </View>
        ))}
      </View>
      <View style={styles.toggleRow}>
        <Text variant="headline" style={styles.flex}>
          {on ? t.winddown.grayOn : t.winddown.grayOff}
        </Text>
        <Toggle value={on} onChange={setOn} accessibilityLabel={t.winddown.grayscale} />
      </View>
    </View>
  );
}

/** 60-second breathing circle: 4 s in, 4 s out, a soft haptic at each turn. */
function BreathePanel() {
  const { c } = useTheme();
  const t = useT();
  const reduced = useReducedMotion();
  const [left, setLeft] = useState(60);
  const [inhale, setInhale] = useState(true);
  const s = useSharedValue(0);

  useEffect(() => {
    s.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: ease.inOut }),
          withTiming(0, { duration: 4000, easing: ease.inOut }),
        ),
        8,
      ),
    );
    const tick = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    const phase = setInterval(() => {
      haptic.light();
      setInhale((v) => !v);
    }, 4000);
    return () => {
      clearInterval(tick);
      clearInterval(phase);
    };
  }, [s]);

  const circle = useAnimatedStyle(() => ({
    transform: [{ scale: reduced ? 1 : interpolate(s.get(), [0, 1], [0.55, 1]) }],
    opacity: reduced ? interpolate(s.get(), [0, 1], [0.5, 1]) : 1,
  }));
  return (
    <View style={[styles.panel, styles.center]}>
      <View style={styles.breathBox}>
        <Animated.View style={[styles.breath, { backgroundColor: c.indigo + '55', borderColor: c.indigo }, circle]} />
        <View style={styles.breathLabel}>
          <Text variant="title">{inhale ? t.winddown.inhale : t.winddown.exhale}</Text>
          <Text variant="subhead" tabular>
            0:{String(left).padStart(2, '0')}
          </Text>
        </View>
      </View>
    </View>
  );
}

function StoryPanel() {
  const { c } = useTheme();
  const t = useT();
  const [playing, setPlaying] = useState(false);
  const [p, setP] = useState(0.08);
  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => setP((v) => Math.min(1, v + 0.004)), 500);
    return () => clearInterval(id);
  }, [playing]);
  return (
    <View style={styles.panel}>
      <View style={[styles.cover, { backgroundColor: c.tileDark }]}>
        <Tarsi expression="sleepy" size={96} alive={false} />
      </View>
      <Text variant="title" align="center">
        {t.winddown.storyTitle}
      </Text>
      <Text variant="subhead" align="center">
        {t.winddown.storyBy}
      </Text>
      <ProgressBar progress={p} color={c.spark} />
      <View style={styles.center}>
        <PillButton
          label={playing ? t.winddown.pause : t.winddown.play}
          icon={
            playing ? (
              <Pause size={18} weight="fill" color={c.onAccent} />
            ) : (
              <Play size={18} weight="fill" color={c.onAccent} />
            )
          }
          onPress={() => setPlaying((v) => !v)}
          size="lg"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space.screen,
    paddingVertical: 6,
  },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  hero: { alignItems: 'center', gap: 4, paddingBottom: 8 },
  time: { flexDirection: 'row', alignItems: 'flex-end' },
  unit: { marginBottom: 8, marginLeft: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, marginTop: 8 },
  capCard: { gap: 12 },
  capHead: { flexDirection: 'row', alignItems: 'flex-end' },
  capUnit: { marginLeft: 4, marginBottom: 3 },
  tiles: { flexDirection: 'row', gap: space.gap },
  tile: { flex: 1 },
  panel: { gap: 14, paddingBottom: 12 },
  previewRow: { flexDirection: 'row', gap: 10, justifyContent: 'center' },
  phone: { width: 84, height: 150, borderRadius: 16, overflow: 'hidden' },
  phoneBar: {
    position: 'absolute',
    left: 10,
    bottom: 22,
    width: 50,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.8)',
  },
  phoneBar2: { bottom: 12, width: 34, opacity: 0.6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  breathBox: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center', marginVertical: 12 },
  breath: { position: 'absolute', width: 240, height: 240, borderRadius: 120, borderWidth: 2 },
  breathLabel: { alignItems: 'center', gap: 2 },
  cover: { height: 140, borderRadius: radius.tile, alignItems: 'center', justifyContent: 'center' },
});

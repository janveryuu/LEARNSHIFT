import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatCircle, FastForward, Heart, MusicNotes, ShareFat, X } from 'phosphor-react-native';

import { Tarsi } from '@/components/mascot/Tarsi';
import { Card, Chip, IconButton, PillButton, Text } from '@/components/ui';
import { haptic } from '@/design/haptics';
import { ease, nativeOnly, spring, useReducedMotion } from '@/design/motion';
import { ThemeProvider } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { reasonText, useLive } from '@/hooks/useLive';
import { formatClock, useT } from '@/i18n/useT';
import { interventionPolicy } from '@/services/ai/interventionPolicy';
import { useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

/** Placeholder "videos": gradients and soft shapes, no real content or brands. */
const CLIPS: { colors: [string, string, string]; user: string }[] = [
  { colors: ['#FF7A59', '#C2185B', '#4A148C'], user: 'kusina.ni.lola' },
  { colors: ['#43C6AC', '#1E6F5C', '#0B3D2E'], user: 'catto.ph' },
  { colors: ['#F7B733', '#FC4A1A', '#7B1E1E'], user: 'dance.daily' },
  { colors: ['#4B6CB7', '#182848', '#0B0F24'], user: 'rainsounds' },
  { colors: ['#B06AB3', '#4568DC', '#1B1F4B'], user: 'speedfails' },
  { colors: ['#FFB75E', '#ED8F03', '#5A2A00'], user: 'batangas.sky' },
];

const TARGET = 45;

export default function Simulate() {
  const t = useT();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const sim = useSession((s) => s.simMinutes);
  const setSim = useSession((s) => s.setSimMinutes);
  const live = useLive();
  const [phase, setPhase] = useState<'watching' | 'nudge' | 'snoozed' | 'done'>('watching');
  const [ff, setFf] = useState(true);
  const reduced = useReducedMotion();

  // Fast-forward the session clock to 45 minutes so the demo doesn't wait.
  useEffect(() => {
    const start = Date.now();
    const from = useSession.getState().simMinutes;
    const dur = reduced ? 300 : 2600;
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - k, 3);
      setSim(from + (TARGET - from) * eased);
      if (k >= 1) {
        clearInterval(id);
        setFf(false);
        // Privacy "Pause" and Focus sessions both mean: stay quiet.
        const quiet = useAppStore.getState().paused || useSession.getState().focusUntil != null;
        if (!quiet) setPhase('nudge');
      }
    }, 50);
    return () => clearInterval(id);
  }, [setSim, reduced]);

  return (
    <ThemeProvider mode="day">
      <View style={styles.root}>
        <ScrollView pagingEnabled showsVerticalScrollIndicator={false} decelerationRate="fast">
          {CLIPS.map((clip, i) => (
            <Clip
              key={i}
              index={i}
              height={height}
              width={width}
              colors={clip.colors}
              user={clip.user}
              title={t.sim.clips[i]}
            />
          ))}
        </ScrollView>

        <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <IconButton
            tone="glass"
            icon={<X size={18} weight="bold" color="#FFFFFF" />}
            accessibilityLabel={t.sim.back}
            onPress={() => router.back()}
          />
          <View style={styles.tabs}>
            <Text variant="headline" color="rgba(255,255,255,0.6)">
              {t.sim.following}
            </Text>
            <Text variant="headline" color="#FFFFFF">
              {t.sim.forYou}
            </Text>
          </View>
          <View style={styles.timer}>
            {ff ? <FastForward size={14} weight="fill" color="#FFFFFF" /> : null}
            <Text variant="subhead" color="#FFFFFF" tabular>
              {t.sim.fastForward(Math.round(sim))}
            </Text>
          </View>
        </View>
        <View style={[styles.note, { top: insets.top + 56 }]} pointerEvents="none">
          <Text variant="caption" color="rgba(255,255,255,0.75)">
            {t.sim.app} · {t.sim.demoNote}
          </Text>
        </View>

        {phase === 'nudge' ? (
          <CheckIn
            auto={auto === '1'}
            minutes={Math.round(sim)}
            clock={live.clock}
            onTake={() => {
              const s = useAppStore.getState();
              s.logNudge('checkin', live.risk.reasons, 'took');
              s.reward('checkin', true);
              setPhase('done');
              setSim(0);
              router.push({ pathname: '/break/[id]', params: { id: live.root, from: 'sim' } });
            }}
            onSnooze={() => {
              const s = useAppStore.getState();
              s.logNudge('checkin', live.risk.reasons, 'snoozed');
              s.reward('checkin', false);
              setPhase('snoozed');
            }}
          />
        ) : null}
        {phase === 'snoozed' ? <Toast text={t.nudge.snoozed} bottom={insets.bottom + 24} /> : null}
      </View>
    </ThemeProvider>
  );
}

function Clip({
  index,
  height,
  width,
  colors,
  user,
  title,
}: {
  index: number;
  height: number;
  width: number;
  colors: [string, string, string];
  user: string;
  title: string;
}) {
  const reduced = useReducedMotion();
  const drift = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    drift.set(
      withRepeat(
        withSequence(
          withTiming(1, { duration: 3200, easing: ease.inOut }),
          withTiming(0, { duration: 3200, easing: ease.inOut }),
        ),
        -1,
      ),
    );
  }, [reduced, drift]);
  const a = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift.get() * 40 - 20 },
      { translateY: drift.get() * -30 },
      { scale: 1 + drift.get() * 0.12 },
    ],
  }));
  const b = useAnimatedStyle(() => ({
    transform: [{ translateX: drift.get() * -50 + 10 }, { translateY: drift.get() * 40 }],
  }));
  const insets = useSafeAreaInsets();
  return (
    <View style={{ height, width }} accessibilityLabel={title}>
      <LinearGradient colors={colors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
      <Animated.View
        style={[styles.blob, { top: height * 0.22, left: width * 0.1, backgroundColor: 'rgba(255,255,255,0.18)' }, a]}
      />
      <Animated.View
        style={[
          styles.blob2,
          { top: height * 0.45, right: width * 0.05, backgroundColor: 'rgba(255,255,255,0.12)' },
          b,
        ]}
      />
      <View style={[styles.caption, { bottom: insets.bottom + 40 }]}>
        <Text variant="headline" color="#FFFFFF">
          @{user}
        </Text>
        <Text variant="body" color="rgba(255,255,255,0.9)" numberOfLines={2}>
          {title}
        </Text>
        <View style={styles.music}>
          <MusicNotes size={14} weight="fill" color="#FFFFFF" />
          <Text variant="caption" color="rgba(255,255,255,0.85)">
            original sound · {user}
          </Text>
        </View>
      </View>
      <View style={[styles.actions, { bottom: insets.bottom + 48 }]}>
        {[Heart, ChatCircle, ShareFat].map((Icon, k) => (
          <View key={k} style={styles.action}>
            <Icon size={32} weight="fill" color="#FFFFFF" />
            <Text variant="caption" color="#FFFFFF">
              {[`${(12 + index * 7) % 90}.${index}K`, `${120 + index * 31}`, `${40 + index * 9}`][k]}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function CheckIn({
  minutes,
  clock,
  auto,
  onTake,
  onSnooze,
}: {
  minutes: number;
  clock: number;
  auto: boolean;
  onTake: () => void;
  onSnooze: () => void;
}) {
  const t = useT();
  const live = useLive();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  const [why, setWhy] = useState(false);
  const y = useSharedValue(reduced ? 0 : 340);
  const pulse = useSharedValue(1);
  const fired = useRef(false);

  useEffect(() => {
    haptic.light();
    y.set(withSpring(0, spring.smooth));
  }, [y]);

  // In scenario mode, gently take the break after a beat unless the presenter interacts.
  const autoTake = useEffectEvent(() => {
    if (fired.current) return;
    fired.current = true;
    onTake();
  });
  useEffect(() => {
    if (!auto || why) return;
    if (!reduced)
      pulse.set(withRepeat(withSequence(withTiming(1.05, { duration: 500 }), withTiming(1, { duration: 500 })), 4));
    const id = setTimeout(autoTake, 4200);
    return () => clearTimeout(id);
  }, [auto, why, reduced, pulse]);

  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const p = useAnimatedStyle(() => ({ transform: [{ scale: pulse.get() }] }));

  // Check-in vs learning break: the policy decides; the card is the doorway either way.
  const stats = useAppStore((st) => st.stats);
  const guardian = useAppStore((st) => st.guardian);
  const decision = interventionPolicy.next({
    risk: live.risk,
    rootGap: live.root,
    gapDue: true,
    stats,
    guardian,
    paused: false,
    focusing: false,
    seed: 42,
  });

  return (
    <Animated.View style={[styles.checkWrap, { bottom: insets.bottom + 16 }, s]}>
      <View style={styles.peek} pointerEvents="none">
        <Tarsi expression="curious" size={86} />
      </View>
      <Card style={styles.check}>
        <Text variant="title">{t.nudge.checkinTitle(minutes)}</Text>
        <View style={styles.subRow}>
          <Text variant="subhead">{t.nudge.checkinSub}</Text>
          <Chip
            label={t.nudge.why}
            kind="tinted"
            selected={why}
            onPress={() => setWhy((w) => !w)}
            style={styles.whyChip}
          />
        </View>
        {why ? (
          <Animated.View entering={nativeOnly(FadeIn.duration(200))} style={styles.why}>
            <Text variant="body">{t.reasons.explain(minutes, formatClock(clock))}</Text>
            <View style={styles.reasons}>
              {live.risk.reasons.map((r, i) => (
                <Chip key={i} label={reasonText(t, r)} kind="outline" />
              ))}
            </View>
            <Text variant="caption">
              {t.reasons.model} · {t.nudge.levels[decision.action === 'break' ? 'break' : 'checkin']}
            </Text>
          </Animated.View>
        ) : null}
        <View style={styles.buttons}>
          <Animated.View style={[styles.flex, p]}>
            <PillButton
              label={t.nudge.takeBreak}
              block
              onPress={() => {
                fired.current = true;
                onTake();
              }}
            />
          </Animated.View>
          <PillButton
            label={t.nudge.fiveMore}
            kind="secondary"
            style={styles.flex}
            block
            onPress={() => {
              fired.current = true;
              onSnooze();
            }}
          />
        </View>
      </Card>
    </Animated.View>
  );
}

function Toast({ text, bottom }: { text: string; bottom: number }) {
  const o = useSharedValue(0);
  useEffect(() => {
    o.set(
      withSequence(withSpring(1, spring.smooth), withTiming(1, { duration: 1800 }), withTiming(0, { duration: 400 })),
    );
  }, [o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateY: (1 - o.get()) * 20 }] }));
  return (
    <Animated.View style={[styles.toast, { bottom }, s]} pointerEvents="none">
      <Text variant="subhead" color="#FFFFFF">
        {text}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  top: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    gap: 12,
  },
  tabs: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 18 },
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.35)',
    paddingHorizontal: 10,
    height: 30,
    borderRadius: radius.pill,
  },
  note: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.pill,
  },
  blob: { position: 'absolute', width: 220, height: 220, borderRadius: 110 },
  blob2: { position: 'absolute', width: 160, height: 160, borderRadius: 80 },
  caption: { position: 'absolute', left: space.screen, right: 90, gap: 4 },
  music: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 },
  actions: { position: 'absolute', right: 14, gap: 20, alignItems: 'center' },
  action: { alignItems: 'center', gap: 2 },
  checkWrap: { position: 'absolute', left: 12, right: 12, maxWidth: 520, alignSelf: 'center' },
  peek: { position: 'absolute', top: -58, left: 18, zIndex: 0 },
  check: { gap: 8, paddingTop: 22 },
  subRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  whyChip: { height: 28 },
  why: { gap: 10, paddingVertical: 4 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  buttons: { flexDirection: 'row', gap: 10, marginTop: 6 },
  flex: { flex: 1 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
});

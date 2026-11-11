import { useEffect, useEffectEvent, useRef, useState, type ComponentRef } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  BookmarkSimple,
  CaretUp,
  ChatCircle,
  ChatTeardropText,
  FastForward,
  Heart,
  MusicNotes,
  ShareFat,
  Sparkle,
  X,
} from 'phosphor-react-native';

import { Diagram } from '@/components/learn/Diagram';
import { Paty, PatyAvatar } from '@/components/mascot/Paty';
import { Chip, IconButton, PillButton, PressableScale, Text } from '@/components/ui';
import { FEED, type FeedCard } from '@/data/lessons';
import { SHORT, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { ease, nativeOnly, spring, useReducedMotion } from '@/design/motion';
import { ThemeProvider } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useLive } from '@/hooks/useLive';
import { useLang, useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
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

/** Calm, warm lesson-clip backdrops: same full-screen format, different mood. */
const LEARN_BG: [string, string, string][] = [
  ['#2B1A12', '#5A2A14', '#C8400F'],
  ['#10213F', '#1D3787', '#2E55B8'],
  ['#1E1530', '#3A2560', '#8E5BEF'],
];

const TARGET = 45;
const LESSONS = 3;

type Item = { kind: 'clip'; i: number } | { kind: 'learn'; card: FeedCard; n: number } | { kind: 'exit' };

const START: Item[] = CLIPS.map((_, i) => ({ kind: 'clip' as const, i }));

/** The AI's pick: lessons for the root gap first, then the next skills in the feed. */
function pickLessons(root: SkillId): FeedCard[] {
  const first = FEED.filter((c) => c.skill === root);
  const rest = FEED.filter((c) => c.skill !== root);
  return [...first, ...rest].slice(0, LESSONS);
}

export default function Simulate() {
  if (!IS_PITCH) return <Redirect href="/home" />;
  return <SimulateDemo />;
}

/**
 * Feed Shift demo. At 45 minutes the AI does not raise an alarm: the clips
 * after the current one are swapped for lesson clips in the same format, so
 * the next swipe lands on learning. After three lessons the feed ends on an
 * easy exit.
 */
function SimulateDemo() {
  const t = useT();
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const { auto } = useLocalSearchParams<{ auto?: string }>();
  const sim = useSession((s) => s.simMinutes);
  const setSim = useSession((s) => s.setSimMinutes);
  const live = useLive();
  const reduced = useReducedMotion();
  const scroller = useRef<ComponentRef<typeof ScrollView>>(null);

  const [phase, setPhase] = useState<'watching' | 'shifting' | 'shifted'>('watching');
  const [ff, setFf] = useState(true);
  const [items, setItems] = useState<Item[]>(START);
  const [page, setPage] = useState(0);
  const [firstLesson, setFirstLesson] = useState<number | null>(null);
  const [wipe, setWipe] = useState(0);

  // The AI decides at 45 min: the clips after this one become lessons.
  const shift = useEffectEvent(() => {
    // Privacy "Pause" and Focus sessions both mean: stay quiet.
    const quiet = useAppStore.getState().paused || useSession.getState().focusUntil != null;
    if (quiet) return;
    const at = page + 1;
    setItems([
      ...START.slice(0, at),
      ...pickLessons(live.root).map((card, n) => ({ kind: 'learn' as const, card, n })),
      { kind: 'exit' as const },
    ]);
    setFirstLesson(at);
    setPhase('shifting');
    haptic.light();
  });

  // Fast-forward the session clock to 45 minutes so the demo doesn't wait.
  useEffect(() => {
    const start = Date.now();
    const from = useSession.getState().simMinutes;
    // ~12 s so the audience can watch a few clips before Paty steps in.
    const dur = reduced ? 300 : 12000;
    const id = setInterval(() => {
      const k = Math.min(1, (Date.now() - start) / dur);
      const eased = 1 - Math.pow(1 - k, 2);
      setSim(from + (TARGET - from) * eased);
      if (k >= 1) {
        clearInterval(id);
        setFf(false);
        shift();
      }
    }, 50);
    return () => clearInterval(id);
  }, [setSim, reduced]);

  // Scenario mode: swipe for the presenter after a beat.
  const autoSwipe = useEffectEvent(() => {
    if (firstLesson == null) return;
    scroller.current?.scrollTo({ y: firstLesson * height, animated: true });
  });
  useEffect(() => {
    if (phase !== 'shifting' || auto !== '1') return;
    const id = setTimeout(autoSwipe, 1800);
    return () => clearTimeout(id);
  }, [phase, auto]);

  const onScroll = (y: number) => {
    const p = Math.round(y / Math.max(1, height));
    if (p === page) return;
    setPage(p);
    // Landing on the first lesson clip: play the shift wipe once and log it.
    if (phase === 'shifting' && firstLesson != null && p >= firstLesson) {
      setPhase('shifted');
      setWipe((w) => w + 1);
      haptic.success();
      const s = useAppStore.getState();
      s.logNudge('break', live.risk.reasons, 'took');
      s.reward('break', true);
    }
  };

  const leave = () => {
    setSim(0);
    router.back();
  };

  return (
    <ThemeProvider mode="day">
      <View style={styles.root}>
        <ScrollView
          ref={scroller}
          pagingEnabled
          showsVerticalScrollIndicator={false}
          decelerationRate="fast"
          scrollEventThrottle={32}
          onScroll={(e) => onScroll(e.nativeEvent.contentOffset.y)}
        >
          {items.map((it) =>
            it.kind === 'clip' ? (
              <Clip
                key={`c${it.i}`}
                index={it.i}
                height={height}
                width={width}
                colors={CLIPS[it.i].colors}
                user={CLIPS[it.i].user}
                title={t.sim.clips[it.i]}
              />
            ) : it.kind === 'learn' ? (
              <LearnClip key={`l${it.card.id}`} card={it.card} n={it.n} height={height} width={width} minutes={TARGET} />
            ) : (
              <ExitPage
                key="exit"
                height={height}
                onBreak={() => {
                  setSim(0);
                  router.push({ pathname: '/break/[id]', params: { id: live.root, from: 'sim' } });
                }}
                onLearn={() => {
                  setSim(0);
                  router.push('/feed');
                }}
                onClose={leave}
              />
            ),
          )}
        </ScrollView>

        <View style={[styles.top, { paddingTop: insets.top + 6 }]} pointerEvents="box-none">
          <IconButton
            tone="glass"
            icon={<X size={18} weight="bold" color="#FFFFFF" />}
            accessibilityLabel={t.sim.back}
            onPress={leave}
          />
          <View style={styles.tabs}>
            <Text variant="headline" color="rgba(255,255,255,0.6)">
              {t.sim.following}
            </Text>
            <Text variant="headline" color="#FFFFFF">
              {t.sim.forYou}
            </Text>
          </View>
          {phase === 'shifted' ? (
            <View style={[styles.timer, styles.shiftedPill]}>
              <Sparkle size={13} weight="fill" color="#FFFFFF" />
              <Text variant="caption" color="#FFFFFF" numberOfLines={1}>
                {t.sim.pill}
              </Text>
            </View>
          ) : (
            <View style={styles.timer}>
              {ff ? <FastForward size={14} weight="fill" color="#FFFFFF" /> : null}
              <Text variant="subhead" color="#FFFFFF" tabular>
                {t.sim.fastForward(Math.round(sim))}
              </Text>
            </View>
          )}
        </View>
        <View style={[styles.note, { top: insets.top + 56 }]} pointerEvents="none">
          <Text variant="caption" color="rgba(255,255,255,0.75)">
            {t.sim.app} · {t.sim.demoNote}
          </Text>
        </View>

        {phase === 'shifting' ? <ShiftingPill top={insets.top + 92} /> : null}
        {wipe > 0 ? <ShiftWipe key={wipe} width={width} height={height} /> : null}
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

/** A lesson in the same full-screen clip format, so the swipe feels continuous. */
function LearnClip({
  card,
  n,
  height,
  width,
  minutes,
}: {
  card: FeedCard;
  n: number;
  height: number;
  width: number;
  minutes: number;
}) {
  const t = useT();
  const lang = useLang();
  const insets = useSafeAreaInsets();
  const [pick, setPick] = useState<number | null>(null);
  const [why, setWhy] = useState(false);
  const [liked, setLiked] = useState(false);
  const saved = useAppStore((s) => s.feed.saved.includes(card.id));
  const w = Math.min(width, 520) - space.screen * 2 - 96;

  return (
    <View style={{ height, width }} accessibilityLabel={card.title[lang]}>
      <LinearGradient
        colors={LEARN_BG[n % LEARN_BG.length]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
      <View style={[styles.learnInner, { paddingTop: insets.top + 96, paddingBottom: insets.bottom + 170 }]}>
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Sparkle size={12} weight="fill" color="#FFB21E" />
            <Text variant="caption" color="#FFFFFF">
              {t.sim.badge}
            </Text>
          </View>
          <Text variant="caption" color="rgba(255,255,255,0.75)">
            {t.sim.clipOf(n + 1, LESSONS)}
          </Text>
        </View>
        <View style={styles.art}>
          <Diagram spec={card.diagram} width={w} onDark accessibilityLabel={card.title[lang]} />
        </View>
        <Text variant="title" color="#FFFFFF" numberOfLines={2}>
          {card.title[lang]}
        </Text>
        <Text variant="overline" color="rgba(255,255,255,0.65)">
          {t.feed.tryIt} · {card.tryIt.prompt}
        </Text>
        <View style={styles.tryRow}>
          {card.tryIt.options.map((o, i) => {
            const chosen = pick === i;
            const right = i === card.tryIt.answer;
            return (
              <PressableScale
                key={o}
                onPress={() => {
                  if (pick != null) return;
                  setPick(i);
                  if (right) haptic.success();
                  else haptic.warning();
                }}
                accessibilityLabel={o}
                style={[
                  styles.opt,
                  { backgroundColor: chosen ? (right ? '#5CC98A' : '#E88A86') : 'rgba(255,255,255,0.14)' },
                  pick != null && !chosen && right && styles.optReveal,
                ]}
              >
                <Text variant="headline" color={chosen ? '#10131F' : '#FFFFFF'}>
                  {o}
                </Text>
              </PressableScale>
            );
          })}
        </View>
        {pick != null ? (
          <Text variant="subhead" color={pick === card.tryIt.answer ? '#5CC98A' : '#FFFFFF'}>
            {pick === card.tryIt.answer ? t.feed.right : t.feed.wrong}
          </Text>
        ) : null}
      </View>

      <View style={[styles.caption, { bottom: insets.bottom + 36 }]}>
        <Text variant="headline" color="#FFFFFF">
          @{t.sim.learnUser}
        </Text>
        <Text variant="subhead" color="rgba(255,255,255,0.85)">
          {t.sim.pickedFor(SHORT[card.skill][lang])}
        </Text>
        <Chip
          label={t.sim.whyThis}
          kind="outline"
          selected={why}
          tint={{ bg: 'rgba(255,255,255,0.14)', fg: '#FFFFFF' }}
          onPress={() => setWhy((v) => !v)}
          style={styles.whyChip}
        />
        {why ? (
          <Animated.View entering={nativeOnly(FadeIn.duration(200))} style={styles.whyBox}>
            <Text variant="subhead" color="#FFFFFF">
              {t.sim.whyBody(minutes)}
            </Text>
          </Animated.View>
        ) : null}
      </View>
      <View style={[styles.actions, { bottom: insets.bottom + 48 }]}>
        <PatyAvatar size={46} background="#FFF3E6" />
        <PressableScale onPress={() => setLiked((v) => !v)} accessibilityLabel="Like" style={styles.action}>
          <Heart size={32} weight="fill" color={liked ? '#FF4D6D' : '#FFFFFF'} />
        </PressableScale>
        <PressableScale
          onPress={() => useAppStore.getState().toggleSaved(card.id)}
          accessibilityLabel={saved ? t.feed.saved : t.feed.save}
          style={styles.action}
        >
          <BookmarkSimple size={30} weight="fill" color={saved ? '#F5C46B' : '#FFFFFF'} />
          <Text variant="caption" color="#FFFFFF">
            {saved ? t.feed.saved : t.feed.save}
          </Text>
        </PressableScale>
        <PressableScale onPress={() => router.push('/tutor')} accessibilityLabel={t.feed.explain} style={styles.action}>
          <ChatTeardropText size={30} weight="fill" color="#FFFFFF" />
          <Text variant="caption" color="#FFFFFF">
            {t.feed.explain}
          </Text>
        </PressableScale>
      </View>
    </View>
  );
}

/** After three lessons the feed ends on an easy, guilt-free exit. */
function ExitPage({
  height,
  onBreak,
  onLearn,
  onClose,
}: {
  height: number;
  onBreak: () => void;
  onLearn: () => void;
  onClose: () => void;
}) {
  const t = useT();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.exit, { height, paddingBottom: insets.bottom + 24 }]}>
      <LinearGradient colors={['#1C120D', '#3A1C10', '#7A3014']} style={StyleSheet.absoluteFill} />
      <Paty expression="cheering" size={170} />
      <Text variant="largeTitle" color="#FFFFFF" align="center">
        {t.sim.exitTitle}
      </Text>
      <Text variant="body" color="rgba(255,255,255,0.75)" align="center">
        {t.sim.exitSub}
      </Text>
      <View style={styles.exitButtons}>
        <PillButton label={t.sim.exitBreak} size="lg" block onPress={onBreak} />
        <PillButton label={t.sim.exitLearn} kind="secondary" size="lg" block onPress={onLearn} />
        <PillButton label={t.sim.exitClose} kind="neutral" size="md" block onPress={onClose} />
      </View>
    </View>
  );
}

/** Small heads-up while the next clips are being swapped. Not a wall, not an alarm. */
function ShiftingPill({ top }: { top: number }) {
  const t = useT();
  const reduced = useReducedMotion();
  const y = useSharedValue(reduced ? 0 : -80);
  const nudge = useSharedValue(0);
  useEffect(() => {
    y.set(withSpring(0, spring.smooth));
    if (!reduced)
      nudge.set(
        withDelay(600, withRepeat(withSequence(withTiming(-5, { duration: 450 }), withTiming(0, { duration: 450 })), -1)),
      );
  }, [y, nudge, reduced]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateY: y.get() }] }));
  const a = useAnimatedStyle(() => ({ transform: [{ translateY: nudge.get() }] }));
  return (
    <Animated.View style={[styles.shifting, { top }, s]} pointerEvents="none" accessibilityLiveRegion="polite">
      <PatyAvatar size={36} background="#FFF3E6" />
      <View style={styles.flex}>
        <Text variant="headline" color="#111111">
          {t.sim.shifting}
        </Text>
        <Text variant="caption" color="#6B6B70">
          {t.sim.shiftingSub}
        </Text>
      </View>
      <Animated.View style={[styles.swipe, a]} accessibilityLabel={t.sim.swipeHint}>
        <CaretUp size={16} weight="bold" color="#C8400F" />
      </Animated.View>
    </Animated.View>
  );
}

const BANDS = 12;

/** A quick pixel-band wipe in brand colors that sells the feed swap. */
function ShiftWipe({ width, height }: { width: number; height: number }) {
  const t = useT();
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  useEffect(() => {
    o.set(withDelay(900, withTiming(0, { duration: 350 })));
  }, [o]);
  const label = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ scale: 0.9 + o.get() * 0.1 }] }));
  if (reduced) return null;
  const bh = height / BANDS;
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {Array.from({ length: BANDS }, (_, i) => (
        <Band key={i} i={i} top={i * bh} h={bh + 1} width={width} />
      ))}
      <Animated.View style={[styles.wipeLabel, label]}>
        <Paty expression="cheering" size={120} interactive={false} />
        <Text variant="title" color="#FFFFFF">
          {t.sim.shifted}
        </Text>
      </Animated.View>
    </View>
  );
}

function Band({ i, top, h, width }: { i: number; top: number; h: number; width: number }) {
  const x = useSharedValue(-width);
  useEffect(() => {
    x.set(
      withDelay(
        i * 28,
        withSequence(
          withTiming(0, { duration: 260, easing: ease.out }),
          withDelay(420, withTiming(width, { duration: 300, easing: ease.inOut })),
        ),
      ),
    );
  }, [x, i, width]);
  const s = useAnimatedStyle(() => ({ transform: [{ translateX: x.get() }] }));
  return (
    <Animated.View
      style={[
        styles.band,
        { top, width, height: h, backgroundColor: i % 3 === 1 ? '#E2582B' : '#C8400F' },
        s,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
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
  shiftedPill: { backgroundColor: 'rgba(200,64,15,0.85)' },
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
  actions: { position: 'absolute', right: 14, gap: 18, alignItems: 'center' },
  action: { alignItems: 'center', gap: 2, minWidth: 48, minHeight: 44, justifyContent: 'center' },
  learnInner: {
    flex: 1,
    justifyContent: 'center',
    gap: 12,
    paddingHorizontal: space.screen,
    paddingRight: 84,
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  badgeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    height: 26,
    borderRadius: radius.pill,
  },
  art: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderRadius: radius.card,
  },
  tryRow: { flexDirection: 'row', gap: 10 },
  opt: { flex: 1, height: 50, borderRadius: radius.inset, alignItems: 'center', justifyContent: 'center' },
  optReveal: { borderWidth: 2, borderColor: '#5CC98A' },
  whyChip: { alignSelf: 'flex-start', height: 30, marginTop: 4 },
  whyBox: { backgroundColor: 'rgba(0,0,0,0.35)', borderRadius: radius.sm, padding: 12, marginTop: 4 },
  exit: { alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: space.screen },
  exitButtons: { gap: 10, width: '100%', maxWidth: 420, marginTop: 18 },
  shifting: {
    position: 'absolute',
    left: 16,
    right: 16,
    maxWidth: 440,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.96)',
    borderRadius: radius.pill,
    paddingVertical: 8,
    paddingLeft: 8,
    paddingRight: 14,
  },
  swipe: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F7DED3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  band: { position: 'absolute', left: 0 },
  wipeLabel: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center', gap: 8 },
});

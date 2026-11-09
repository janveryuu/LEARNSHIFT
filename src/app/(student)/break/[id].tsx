import { useEffect, useRef, useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
  type LayoutRectangle,
  type ScrollViewInstance,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'phosphor-react-native';

import { Diagram } from '@/components/learn/Diagram';
import { CoinFly, SparkBurst } from '@/components/learn/Effects';
import { MasteryRow } from '@/components/learn/MasteryRow';
import { QuizOption, type OptionState } from '@/components/learn/QuizOption';
import { Tarsi } from '@/components/mascot/Tarsi';
import { Card, CoinCounter, IconButton, PillButton, Ring, Text } from '@/components/ui';
import { lessonFor } from '@/data/lessons';
import { QUESTION_BY_ID } from '@/data/questions';
import { SHORT, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useNightGuard } from '@/hooks/useNightGuard';
import { useLive } from '@/hooks/useLive';
import { useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

const SECONDS = 45;

/** Seconds elapsed since an epoch-ms timestamp (kept out of render code). */
const secondsSince = (t: number) => (Date.now() - t) / 1000;
const REWARD = 20;

type Phase = { kind: 'concept'; i: number } | { kind: 'q'; i: number } | { kind: 'result' };

export default function BreakPlayer() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: SkillId; from?: string }>();
  const skill = (id ?? 'fractions') as SkillId;
  const lesson = lessonFor(skill);
  useNightGuard();
  const live = useLive();
  const [before] = useState(() => useAppStore.getState().mastery[lesson.id]);
  const [phase, setPhase] = useState<Phase>({ kind: 'concept', i: 0 });
  const [left, setLeft] = useState(SECONDS);

  useEffect(() => {
    if (phase.kind === 'result') return;
    const tm = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(tm);
  }, [phase.kind]);

  const steps = lesson.concepts.length + lesson.questions.length;
  const stepIndex = phase.kind === 'concept' ? phase.i : phase.kind === 'q' ? lesson.concepts.length + phase.i : steps;

  const finish = () => {
    const s = useAppStore.getState();
    s.recordBreak();
    s.logNudge('break', live.risk.reasons, 'took');
    s.reward('break', true);
    setPhase({ kind: 'result' });
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.top}>
        <IconButton
          tone="inset"
          icon={<X size={18} weight="bold" color={c.text} />}
          accessibilityLabel={t.common.close}
          onPress={() => router.back()}
        />
        <View style={styles.segments} accessibilityLabel={`${stepIndex} / ${steps}`}>
          {Array.from({ length: steps }, (_, k) => (
            <Segment
              key={k}
              on={k < stepIndex || (k === stepIndex && phase.kind !== 'result')}
              current={k === stepIndex}
            />
          ))}
        </View>
        {phase.kind !== 'result' ? (
          <Ring progress={left / SECONDS} size={44} stroke={4} accessibilityLabel={t.brk.secondsLeft(left)}>
            <Text variant="subhead" color="text" tabular>
              {left}
            </Text>
          </Ring>
        ) : (
          <View style={styles.ringSpace} />
        )}
      </View>

      {phase.kind === 'concept' ? (
        <Concepts
          lessonId={lesson.id}
          index={phase.i}
          onIndex={(i) => setPhase({ kind: 'concept', i })}
          onDone={() => setPhase({ kind: 'q', i: 0 })}
        />
      ) : null}

      {phase.kind === 'q' ? (
        <QuestionStep
          key={phase.i}
          qid={lesson.questions[phase.i]}
          label={t.brk.question(phase.i + 1, lesson.questions.length)}
          last={phase.i === lesson.questions.length - 1}
          onNext={() => (phase.i < lesson.questions.length - 1 ? setPhase({ kind: 'q', i: phase.i + 1 }) : finish())}
        />
      ) : null}

      {phase.kind === 'result' ? (
        <Result skillLabel={L(SHORT[lesson.id])} from={before} to={useAppStore.getState().mastery[lesson.id]} />
      ) : null}
    </View>
  );
}

function Segment({ on, current }: { on: boolean; current: boolean }) {
  const { c } = useTheme();
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(withSpring(on ? 1 : 0, spring.smooth));
  }, [on, v]);
  const s = useAnimatedStyle(() => ({ width: `${v.get() * 100}%` }));
  return (
    <View style={[styles.seg, { backgroundColor: c.chartIdle }]}>
      <Animated.View style={[styles.segFill, { backgroundColor: current ? c.accent : c.accentFaded }, s]} />
    </View>
  );
}

function Concepts({
  lessonId,
  index,
  onIndex,
  onDone,
}: {
  lessonId: SkillId;
  index: number;
  onIndex: (i: number) => void;
  onDone: () => void;
}) {
  const t = useT();
  const L = useL();
  const { width } = useWindowDimensions();
  const lesson = lessonFor(lessonId);
  const pageW = Math.min(width, 560);
  const ref = useRef<ScrollViewInstance>(null);
  const [pageH, setPageH] = useState(0);
  const last = index === lesson.concepts.length - 1;
  // The index is the source of truth; the pager follows it.
  const target = useRef<number | null>(null);
  useEffect(() => {
    target.current = index;
    ref.current?.scrollTo({ x: index * pageW, animated: true });
    // Native platforms don't always report the end of a programmatic scroll.
    const id = setTimeout(() => (target.current = null), 700);
    return () => clearTimeout(id);
  }, [index, pageW]);
  return (
    <View style={styles.flex}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        style={[styles.flex, { maxWidth: pageW, alignSelf: 'center' }]}
        onLayout={(e) => setPageH(e.nativeEvent.layout.height)}
        onMomentumScrollEnd={(e) => {
          const i = Math.round(e.nativeEvent.contentOffset.x / pageW);
          // Ignore scroll-end events fired while a button-driven scroll is still travelling.
          if (target.current != null) {
            if (i === target.current) target.current = null;
            return;
          }
          if (i !== index) {
            haptic.select();
            onIndex(i);
          }
        }}
      >
        {lesson.concepts.map((cpt, i) => (
          <View key={i} style={[styles.page, { width: pageW, height: pageH || undefined }]}>
            <Card style={styles.concept}>
              <Text variant="overline">{t.brk.concept(i + 1, lesson.concepts.length)}</Text>
              <View style={styles.diagram}>
                <Diagram
                  spec={cpt.diagram}
                  width={pageW - space.screen * 2 - space.card * 2}
                  accessibilityLabel={L(cpt.text)}
                />
              </View>
              <Text variant="title">{L(cpt.text)}</Text>
            </Card>
          </View>
        ))}
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.dots}>
          {lesson.concepts.map((_, i) => (
            <Dot key={i} on={i === index} />
          ))}
        </View>
        {last ? (
          <PillButton label={t.brk.toQuestions} size="lg" block onPress={onDone} />
        ) : (
          <PillButton
            label={t.common.next}
            size="lg"
            kind="secondary"
            block
            onPress={() => onIndex(Math.min(lesson.concepts.length - 1, index + 1))}
          />
        )}
      </View>
    </View>
  );
}

function Dot({ on }: { on: boolean }) {
  const { c } = useTheme();
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(withSpring(on ? 1 : 0, spring.snappy));
  }, [on, v]);
  const s = useAnimatedStyle(() => ({ width: 8 + v.get() * 14, opacity: 0.35 + v.get() * 0.65 }));
  return <Animated.View style={[styles.dot, { backgroundColor: c.accent }, s]} />;
}

function QuestionStep({ qid, label, last, onNext }: { qid: string; label: string; last: boolean; onNext: () => void }) {
  const t = useT();
  const L = useL();
  const q = QUESTION_BY_ID[qid];
  const [picked, setPicked] = useState<number | null>(null);
  const [burst, setBurst] = useState(0);
  const started = useRef(0);
  const reduced = useReducedMotion();
  const pill = useSharedValue(0);
  useEffect(() => {
    started.current = Date.now();
  }, []);

  const pick = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    const correct = i === q.answer;
    const s = useAppStore.getState();
    s.answer({ skill: q.skill, correct, seconds: secondsSince(started.current), hints: 0 });
    if (correct) {
      haptic.success();
      setBurst((b) => b + 1);
    } else {
      haptic.warning();
      s.setLastMiss({ q: q.id, a: i });
      pill.set(reduced ? 1 : withSpring(1, spring.smooth));
    }
  };

  const stateFor = (i: number): OptionState => {
    if (picked == null) return 'idle';
    if (i === picked) return i === q.answer ? 'correct' : 'wrong';
    if (i === q.answer) return 'reveal';
    return 'dim';
  };

  const pillStyle = useAnimatedStyle(() => ({
    opacity: pill.get(),
    transform: [{ translateY: (1 - pill.get()) * 24 }],
  }));
  const correct = picked === q.answer;

  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.qBody}>
        <Text variant="overline">{label}</Text>
        <Text variant="title" style={styles.prompt}>
          {L(q.prompt)}
        </Text>
        <View style={styles.options}>
          {q.options.map((o, i) => (
            <QuizOption
              key={i}
              index={i}
              label={o}
              state={stateFor(i)}
              onPress={() => pick(i)}
              disabled={picked != null}
            />
          ))}
          <SparkBurst play={burst} size={160} />
        </View>
      </ScrollView>
      <View style={styles.footer}>
        {picked != null ? (
          <View style={styles.feedback}>
            <Text variant="headline" color={correct ? 'success' : 'danger'} style={styles.flex}>
              {correct ? t.brk.nice : t.brk.notQuite}
            </Text>
            {!correct ? (
              <Animated.View style={pillStyle}>
                <PillButton
                  label={t.brk.seeWhy}
                  kind="secondary"
                  size="sm"
                  onPress={() => router.push({ pathname: '/tutor', params: { q: q.id, a: String(picked) } })}
                />
              </Animated.View>
            ) : null}
          </View>
        ) : null}
        <PillButton
          label={last ? t.common.done : t.brk.nextQ}
          size="lg"
          block
          disabled={picked == null}
          onPress={onNext}
        />
      </View>
    </View>
  );
}

function Result({ skillLabel, from, to }: { skillLabel: string; from: number; to: number }) {
  const t = useT();
  const { c } = useTheme();
  const [start] = useState(() => useAppStore.getState().coins);
  const [shown, setShown] = useState(start);
  const [box, setBox] = useState<{ w: number; label: LayoutRectangle | null }>({ w: 0, label: null });
  const [play, setPlay] = useState(0);
  const committed = useRef(false);

  useEffect(() => {
    const id = setTimeout(() => setPlay(1), 450);
    return () => clearTimeout(id);
  }, []);

  const arrive = (i: number) => {
    haptic.light();
    setShown(start + Math.round(((i + 1) / 6) * REWARD));
    if (i === 5 && !committed.current) {
      committed.current = true;
      useAppStore.getState().addCoins(REWARD);
    }
  };

  const fromPt = box.label ? { x: box.label.x + box.label.width / 2, y: box.label.y + box.label.height / 2 } : null;
  const toPt = box.w ? { x: box.w - 46, y: 18 } : null;

  return (
    <View style={styles.flex}>
      <View style={styles.result} onLayout={(e) => setBox((b) => ({ ...b, w: e.nativeEvent.layout.width }))}>
        <View style={styles.counter}>
          <CoinCounter value={shown} />
        </View>
        <Tarsi expression="cheering" size={150} />
        <Text variant="largeTitle" align="center">
          {t.brk.doneTitle}
        </Text>
        <Text variant="subhead" align="center">
          {t.brk.doneSub}
        </Text>
        <View
          onLayout={(e) => setBox((b) => ({ ...b, label: e.nativeEvent.layout }))}
          style={[styles.earn, { backgroundColor: c.accentTint }]}
        >
          <Text variant="title" color="accent">
            {t.brk.earned(REWARD)}
          </Text>
        </View>
        <Card style={styles.masteryCard}>
          <MasteryRow label={t.brk.mastery(skillLabel)} from={from} to={to} delay={700} />
        </Card>
        <CoinFly play={play} from={fromPt} to={toPt} onArrive={arrive} />
      </View>
      <View style={styles.footer}>
        <PillButton label={t.brk.backToFree} size="lg" block onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: space.screen,
    paddingTop: 14,
    paddingBottom: 8,
  },
  segments: { flex: 1, flexDirection: 'row', gap: 4 },
  seg: { flex: 1, height: 5, borderRadius: 3, overflow: 'hidden' },
  segFill: { height: '100%', borderRadius: 3 },
  ringSpace: { width: 44 },
  page: { paddingHorizontal: space.screen, paddingVertical: 8, justifyContent: 'center' },
  concept: { gap: 18, paddingVertical: 28 },
  diagram: { alignItems: 'center', paddingVertical: 8 },
  footer: {
    paddingHorizontal: space.screen,
    gap: 12,
    paddingTop: 12,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 4 },
  dot: { height: 8, borderRadius: 4 },
  qBody: { paddingHorizontal: space.screen, paddingTop: 12, gap: 8, width: '100%', maxWidth: 560, alignSelf: 'center' },
  prompt: { marginBottom: 12 },
  options: { gap: 10 },
  feedback: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  result: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: space.screen,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  counter: { position: 'absolute', top: 4, right: space.screen },
  earn: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill, marginTop: 10 },
  masteryCard: { alignSelf: 'stretch', marginTop: 14 },
});

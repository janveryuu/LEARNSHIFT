import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Lightbulb, X } from 'phosphor-react-native';

import { CoinFly, SparkBurst } from '@/components/learn/Effects';
import { MasteryRow } from '@/components/learn/MasteryRow';
import { QuizOption, type OptionState } from '@/components/learn/QuizOption';
import { Tarsi } from '@/components/mascot/Tarsi';
import { Card, Chip, CoinCounter, IconButton, InsetCard, PillButton, Text } from '@/components/ui';
import { QUESTION_BY_ID, questionsFor, type Question } from '@/data/questions';
import { SHORT, SKILL_BY_ID, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useNightGuard } from '@/hooks/useNightGuard';
import { useL, useT } from '@/i18n/useT';
import { gapEngine } from '@/services/ai/gapEngine';
import { useAppStore } from '@/store/useAppStore';

const COUNT = 5;

/** Next question: same skill, closest to the current level, not yet asked; then the root skill. */
function pickNext(skill: SkillId, level: number, asked: string[]): Question {
  const mastery = useAppStore.getState().mastery;
  const root = gapEngine.rootGap(mastery, skill);
  const pool = [
    ...questionsFor(skill),
    ...(root !== skill ? questionsFor(root) : []),
    ...SKILL_BY_ID[skill].prereqs.flatMap(questionsFor),
  ];
  const fresh = pool.filter((q) => !asked.includes(q.id));
  const list = fresh.length ? fresh : pool;
  return [...list].sort(
    (a, b) => Math.abs(a.level - level) - Math.abs(b.level - level) || (a.skill === skill ? -1 : 1),
  )[0];
}

export default function Quiz() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const insets = useSafeAreaInsets();
  const reduced = useReducedMotion();
  useNightGuard();
  const { skillId, preset } = useLocalSearchParams<{ skillId: SkillId; preset?: string }>();
  const skill = (skillId ?? 'fractions') as SkillId;
  const [startMastery] = useState(() => useAppStore.getState().mastery);
  const [startRoot] = useState(() => gapEngine.rootGap(startMastery, skill));

  const [level, setLevel] = useState(() =>
    preset === 'wrong' ? 1 : Math.max(1, Math.min(5, Math.round(startMastery[skill] * 5))),
  );
  const [asked, setAsked] = useState<string[]>([]);
  const [q, setQ] = useState<Question>(() =>
    preset === 'wrong' ? QUESTION_BY_ID['fra-1'] : pickNext(skill, level, []),
  );
  const [picked, setPicked] = useState<number | null>(null);
  const [hints, setHints] = useState(0);
  const [showHint, setShowHint] = useState(false);
  const [levelMsg, setLevelMsg] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [burst, setBurst] = useState(0);
  const [secs, setSecs] = useState(0);
  const started = useRef(0);
  const pill = useSharedValue(0);

  useEffect(() => {
    if (picked != null || done) return;
    started.current = Date.now();
    const id = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [q.id, picked, done]);

  const answer = (i: number) => {
    if (picked != null) return;
    setPicked(i);
    const correct = i === q.answer;
    const s = useAppStore.getState();
    s.answer({ skill: q.skill, correct, seconds: (Date.now() - started.current) / 1000, hints: showHint ? 1 : 0 });
    const nextLevel = Math.max(1, Math.min(5, level + (correct ? 1 : -1)));
    if (nextLevel !== level) setLevelMsg(t.quiz.levelChange(level, nextLevel));
    setLevel(nextLevel);
    if (correct) {
      setScore((x) => x + 1);
      haptic.success();
      setBurst((b) => b + 1);
    } else {
      haptic.warning();
      s.setLastMiss({ q: q.id, a: i });
      pill.set(reduced ? 1 : withSpring(1, spring.smooth));
    }
  };

  // Scenario 4: a preset wrong answer, then the tutor opens on that exact mistake.
  const presetPick = useEffectEvent(() => answer(0));
  const presetTutor = useEffectEvent(() => router.push({ pathname: '/tutor', params: { q: 'fra-1', a: '0' } }));
  useEffect(() => {
    if (preset !== 'wrong') return;
    const a = setTimeout(presetPick, 1100);
    const b = setTimeout(presetTutor, 2900);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [preset]);

  const next = () => {
    const nextAsked = [...asked, q.id];
    setAsked(nextAsked);
    if (nextAsked.length >= COUNT) {
      setDone(true);
      return;
    }
    setQ(pickNext(skill, level, nextAsked));
    setSecs(0);
    setPicked(null);
    setShowHint(false);
    setLevelMsg(null);
    pill.set(0);
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

  if (done) {
    return <Results skill={skill} score={score} startMastery={startMastery} startRoot={startRoot} />;
  }

  const correct = picked === q.answer;
  return (
    <View
      style={[
        styles.root,
        { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
    >
      <View style={styles.top}>
        <IconButton
          icon={<X size={18} weight="bold" color={c.text} />}
          accessibilityLabel={t.common.close}
          onPress={() => router.back()}
        />
        <View style={styles.flex}>
          <Text variant="headline" align="center">
            {L(SHORT[skill])}
          </Text>
          <Text variant="caption" align="center" tabular>
            {t.quiz.progress(asked.length + 1, COUNT)} · 0:{String(secs).padStart(2, '0')}
          </Text>
        </View>
        <PillButton
          label={hints ? `${t.quiz.hint} · ${hints}` : t.quiz.hint}
          kind="neutral"
          size="sm"
          icon={<Lightbulb size={16} weight="fill" color={c.spark} />}
          disabled={picked != null || showHint}
          onPress={() => {
            setShowHint(true);
            setHints((h) => h + 1);
          }}
        />
      </View>

      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.levelRow}>
          <LevelDots level={level} />
          <Text variant="subhead" color="text">
            {t.quiz.level(level)}
          </Text>
          {levelMsg ? <Chip label={levelMsg} kind={correct ? 'accent' : 'neutral'} style={styles.levelChip} /> : null}
        </View>
        <Card style={styles.qCard}>
          <Text variant="title">{L(q.prompt)}</Text>
          {showHint ? (
            <InsetCard label={t.quiz.hint}>
              <Text variant="body">{L(q.hint)}</Text>
            </InsetCard>
          ) : null}
        </Card>
        <View style={styles.options}>
          {q.options.map((o, i) => (
            <QuizOption
              key={`${q.id}-${i}`}
              index={i}
              label={o}
              state={stateFor(i)}
              onPress={() => answer(i)}
              disabled={picked != null}
            />
          ))}
          <SparkBurst play={burst} size={170} />
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
                  label={t.quiz.seeWhy}
                  kind="secondary"
                  size="sm"
                  onPress={() => router.push({ pathname: '/tutor', params: { q: q.id, a: String(picked) } })}
                />
              </Animated.View>
            ) : null}
          </View>
        ) : null}
        <PillButton
          label={asked.length + 1 >= COUNT ? t.quiz.finish : t.quiz.next}
          size="lg"
          block
          disabled={picked == null}
          onPress={next}
        />
      </View>
    </View>
  );
}

function LevelDots({ level }: { level: number }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Level ${level} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <LevelDot key={n} on={n <= level} />
      ))}
    </View>
  );
}

function LevelDot({ on }: { on: boolean }) {
  const { c } = useTheme();
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(withSpring(on ? 1 : 0, spring.bouncy));
  }, [on, v]);
  const s = useAnimatedStyle(() => ({ opacity: 0.25 + v.get() * 0.75, transform: [{ scale: 0.8 + v.get() * 0.2 }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: c.accent }, s]} />;
}

function Results({
  skill,
  score,
  startMastery,
  startRoot,
}: {
  skill: SkillId;
  score: number;
  startMastery: Record<SkillId, number>;
  startRoot: SkillId;
}) {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const insets = useSafeAreaInsets();
  const mastery = useAppStore((s) => s.mastery);
  const root = gapEngine.rootGap(mastery, skill);
  const reward = score * 10;
  const [start] = useState(() => useAppStore.getState().coins);
  const [shown, setShown] = useState(start);
  const [w, setW] = useState(0);
  const [topH, setTopH] = useState(0);
  const [earnAt, setEarnAt] = useState<{ x: number; y: number } | null>(null);
  const [play, setPlay] = useState(0);
  const committed = useRef(false);
  const skills = Array.from(new Set<SkillId>([skill, startRoot, root]));

  useEffect(() => {
    if (!reward) return;
    const id = setTimeout(() => setPlay(1), 600);
    return () => clearTimeout(id);
  }, [reward]);

  const arrive = (i: number) => {
    haptic.light();
    setShown(start + Math.round(((i + 1) / 6) * reward));
    if (i === 5 && !committed.current) {
      committed.current = true;
      useAppStore.getState().addCoins(reward);
    }
  };

  return (
    <View
      style={[
        styles.root,
        { backgroundColor: c.bg, paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, 16) },
      ]}
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
    >
      <View style={styles.top} onLayout={(e) => setTopH(e.nativeEvent.layout.height)}>
        <View style={styles.flex} />
        <CoinCounter value={shown} />
      </View>
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.center}>
          <Tarsi expression={score >= 3 ? 'proud' : 'happy'} size={130} />
          <Text variant="overline">{t.quiz.results}</Text>
          <Text variant="display" tabular>
            {t.quiz.score(score, COUNT)}
          </Text>
          <Chip label={root !== startRoot ? t.quiz.rootUpdated : t.quiz.rootStill(L(SHORT[root]))} kind="accent" />
        </View>
        <Card style={styles.masteryCard}>
          {skills.map((s, i) => (
            <MasteryRow
              key={s}
              label={L(SKILL_BY_ID[s].name)}
              from={startMastery[s]}
              to={mastery[s]}
              delay={400 + i * 120}
              color={s === root ? c.accent : undefined}
            />
          ))}
        </Card>
        {reward ? (
          <View
            style={[styles.earn, { backgroundColor: c.accentTint }]}
            onLayout={(e) => {
              const l = e.nativeEvent.layout;
              setEarnAt({ x: l.x + l.width / 2, y: l.y + l.height / 2 });
            }}
          >
            <Text variant="title" color="accent">
              {t.brk.earned(reward)}
            </Text>
          </View>
        ) : null}
      </ScrollView>
      <View style={styles.footer}>
        <PillButton label={t.quiz.done} size="lg" block onPress={() => router.back()} />
      </View>
      <CoinFly
        play={earnAt && topH ? play : 0}
        from={earnAt ? { x: earnAt.x + (w - Math.min(w, 560)) / 2, y: earnAt.y + insets.top + topH } : null}
        to={w ? { x: w - 60, y: insets.top + topH / 2 } : null}
        onArrive={arrive}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: space.screen, paddingVertical: 8 },
  body: {
    paddingHorizontal: space.screen,
    gap: space.gap,
    paddingBottom: 16,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  levelRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  levelChip: { height: 26 },
  dots: { flexDirection: 'row', gap: 4 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  qCard: { gap: 12 },
  options: { gap: 10 },
  footer: {
    paddingHorizontal: space.screen,
    gap: 12,
    paddingTop: 8,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
  feedback: { flexDirection: 'row', alignItems: 'center', minHeight: 40 },
  center: { alignItems: 'center', gap: 6, paddingTop: 4 },
  masteryCard: { gap: 16 },
  earn: { alignSelf: 'center', paddingHorizontal: 18, paddingVertical: 8, borderRadius: radius.pill },
});

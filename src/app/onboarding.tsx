import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import {
  AppWindow,
  CaretLeft,
  ChalkboardTeacher,
  ChatsCircle,
  Clock,
  Globe,
  HouseLine,
  Keyboard,
  LockOpen,
  Monitor,
  Student,
  Timer,
} from 'phosphor-react-native';

import { QuizOption, type OptionState } from '@/components/learn/QuizOption';
import { SkillGraph } from '@/components/learn/SkillGraph';
import { Tarsi } from '@/components/mascot/Tarsi';
import { Card, IconButton, PillButton, PressableScale, Text, Toggle, WheelGroup, WheelPicker } from '@/components/ui';
import { PRETEST_IDS, QUESTION_BY_ID } from '@/data/questions';
import { SKILL_BY_ID } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { pressScale, spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useL, useT } from '@/i18n/useT';
import { mulberry32 } from '@/services/ai/interventionPolicy';
import { gapEngine } from '@/services/ai/gapEngine';
import { useAppStore, type Lang, type Role } from '@/store/useAppStore';

const STEPS = ['welcome', 'role', 'grade', 'language', 'consent', 'usage', 'bedtime', 'pretest', 'gap'] as const;
type Step = (typeof STEPS)[number];

export default function Onboarding() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const step = STEPS[i];
  const next = () => {
    haptic.light();
    setDir(1);
    setI((k) => Math.min(STEPS.length - 1, k + 1));
  };
  const back = () => {
    setDir(-1);
    setI((k) => Math.max(0, k - 1));
  };

  const finish = (role: Role) => {
    const s = useAppStore.getState();
    s.setRole(role);
    s.setOnboarded(true);
    router.replace(role === 'student' ? '/home' : role === 'guardian' ? '/guardian' : '/teacher');
  };

  return (
    <View
      style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
    >
      <View style={styles.top}>
        {i > 0 ? (
          <IconButton
            icon={<CaretLeft size={20} weight="bold" color={c.text} />}
            accessibilityLabel={t.common.back}
            onPress={back}
          />
        ) : (
          <View style={styles.backSpace} />
        )}
        <View style={styles.dots} accessibilityLabel={`${i + 1} / ${STEPS.length}`}>
          {STEPS.map((s, k) => (
            <ProgressDot key={s} on={k === i} done={k < i} />
          ))}
        </View>
        <View style={styles.backSpace} />
      </View>
      <Page key={step} dir={dir}>
        <StepBody step={step} next={next} finish={finish} />
      </Page>
    </View>
  );
}

function ProgressDot({ on, done }: { on: boolean; done: boolean }) {
  const { c } = useTheme();
  const v = useSharedValue(on ? 1 : 0);
  useEffect(() => {
    v.set(withSpring(on ? 1 : 0, spring.snappy));
  }, [on, v]);
  const s = useAnimatedStyle(() => ({ width: 7 + v.get() * 15 }));
  return <Animated.View style={[styles.dot, { backgroundColor: on || done ? c.accent : c.chartIdle }, s]} />;
}

/** One idea per screen; each page springs in from the side it came from. */
function Page({ dir, children }: { dir: number; children: ReactNode }) {
  const reduced = useReducedMotion();
  const x = useSharedValue(reduced ? 0 : 40 * dir);
  const o = useSharedValue(0);
  useEffect(() => {
    x.set(withSpring(0, spring.smooth));
    o.set(withSpring(1, spring.smooth));
  }, [x, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get(), transform: [{ translateX: x.get() }] }));
  return <Animated.View style={[styles.page, s]}>{children}</Animated.View>;
}

function StepBody({ step, next, finish }: { step: Step; next: () => void; finish: (r: Role) => void }) {
  switch (step) {
    case 'welcome':
      return <Welcome next={next} />;
    case 'role':
      return <RoleStep next={next} finish={finish} />;
    case 'grade':
      return <GradeStep next={next} />;
    case 'language':
      return <LanguageStep next={next} />;
    case 'consent':
      return <ConsentStep next={next} />;
    case 'usage':
      return <UsageStep next={next} />;
    case 'bedtime':
      return <BedtimeStep next={next} />;
    case 'pretest':
      return <Pretest next={next} />;
    case 'gap':
      return <FirstGap finish={() => finish('student')} />;
  }
}

function Shell({
  title,
  sub,
  children,
  footer,
}: {
  title: string;
  sub?: string;
  children?: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <View style={styles.flex}>
      <ScrollView contentContainerStyle={styles.shell} showsVerticalScrollIndicator={false}>
        <Text variant="largeTitle">{title}</Text>
        {sub ? (
          <Text variant="body" color="textSecondary">
            {sub}
          </Text>
        ) : null}
        <View style={styles.content}>{children}</View>
      </ScrollView>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );
}

function Welcome({ next }: { next: () => void }) {
  const t = useT();
  return (
    <View style={styles.flex}>
      <View style={styles.welcome}>
        <Tarsi expression="waving" size={210} />
        <Text variant="largeTitle" align="center">
          {t.onb.welcome}
        </Text>
        <Text variant="body" color="textSecondary" align="center" style={styles.welcomeSub}>
          {t.onb.welcomeSub}
        </Text>
      </View>
      <View style={styles.footer}>
        <PillButton label={t.onb.getStarted} size="lg" block onPress={next} />
      </View>
    </View>
  );
}

function BigOption({
  title,
  sub,
  icon,
  selected,
  onPress,
}: {
  title: string;
  sub?: string;
  icon?: ReactNode;
  selected?: boolean;
  onPress: () => void;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      scaleTo={pressScale.card}
      onPress={onPress}
      accessibilityState={{ selected }}
      accessibilityLabel={sub ? `${title}, ${sub}` : title}
      style={[styles.option, { backgroundColor: c.card, borderColor: selected ? c.accent : 'transparent' }]}
    >
      {icon ? (
        <View style={[styles.optionIcon, { backgroundColor: selected ? c.accentTint : c.inset }]}>{icon}</View>
      ) : null}
      <View style={styles.flex}>
        <Text variant="headline">{title}</Text>
        {sub ? <Text variant="subhead">{sub}</Text> : null}
      </View>
    </PressableScale>
  );
}

function RoleStep({ next, finish }: { next: () => void; finish: (r: Role) => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Shell title={t.onb.role}>
      <BigOption
        title={t.onb.student}
        sub={t.onb.studentSub}
        icon={<Student size={26} weight="fill" color={c.accent} />}
        onPress={next}
      />
      <BigOption
        title={t.onb.guardian}
        sub={t.onb.guardianSub}
        icon={<HouseLine size={26} weight="fill" color={c.success} />}
        onPress={() => finish('guardian')}
      />
      <BigOption
        title={t.onb.teacher}
        sub={t.onb.teacherSub}
        icon={<ChalkboardTeacher size={26} weight="fill" color={c.tabInsights} />}
        onPress={() => finish('teacher')}
      />
    </Shell>
  );
}

function GradeStep({ next }: { next: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const [grade, setGrade] = useState(8);
  return (
    <Shell title={t.onb.grade} footer={<PillButton label={t.common.continue} size="lg" block onPress={next} />}>
      <View style={styles.grades}>
        {[7, 8, 9, 10, 11, 12].map((g) => (
          <PressableScale
            key={g}
            onPress={() => setGrade(g)}
            accessibilityLabel={`Grade ${g}`}
            accessibilityState={{ selected: grade === g }}
            style={[styles.grade, { backgroundColor: grade === g ? c.accent : c.card }]}
          >
            <Text variant="statNumber" color={grade === g ? 'onAccent' : 'text'}>
              {g}
            </Text>
          </PressableScale>
        ))}
      </View>
    </Shell>
  );
}

function LanguageStep({ next }: { next: () => void }) {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const set = (l: Lang) => useAppStore.getState().setLang(l);
  return (
    <Shell
      title={t.onb.language}
      sub={t.onb.languageSub}
      footer={<PillButton label={t.common.continue} size="lg" block onPress={next} />}
    >
      <BigOption title="English" sub="Hi, I’m Tarsi." selected={lang === 'en'} onPress={() => set('en')} />
      <BigOption title="Filipino" sub="Kumusta, ako si Tarsi." selected={lang === 'fil'} onPress={() => set('fil')} />
    </Shell>
  );
}

function QrPlaceholder({ size = 132 }: { size?: number }) {
  const { c } = useTheme();
  const n = 21;
  const cell = size / n;
  const rand = mulberry32(482913);
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const rects: ReactNode[] = [];
  for (let y = 0; y < n; y++)
    for (let x = 0; x < n; x++) {
      if (finder(x, y)) continue;
      if (rand() > 0.55)
        rects.push(<Rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={c.text} />);
    }
  const box = (x: number, y: number) => (
    <>
      <Rect x={x * cell} y={y * cell} width={7 * cell} height={7 * cell} fill={c.text} rx={cell} />
      <Rect x={(x + 1) * cell} y={(y + 1) * cell} width={5 * cell} height={5 * cell} fill={c.card} rx={cell * 0.6} />
      <Rect x={(x + 2) * cell} y={(y + 2) * cell} width={3 * cell} height={3 * cell} fill={c.text} rx={cell * 0.4} />
    </>
  );
  return (
    <Svg width={size} height={size} accessibilityLabel="QR code placeholder">
      {rects}
      {box(0, 0)}
      {box(n - 7, 0)}
      {box(0, n - 7)}
    </Svg>
  );
}

function ConsentStep({ next }: { next: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const code = '482913';
  return (
    <Shell
      title={t.onb.consent}
      sub={t.onb.consentSub}
      footer={<PillButton label={t.common.continue} size="lg" block onPress={next} />}
    >
      <Card style={styles.consent}>
        <View style={styles.code} accessible accessibilityLabel={code.split('').join(' ')}>
          {code.split('').map((d, k) => (
            <View key={k} style={[styles.codeBox, { backgroundColor: c.inset }, k === 3 && styles.codeGap]}>
              <Text variant="title" tabular>
                {d}
              </Text>
            </View>
          ))}
        </View>
        <QrPlaceholder />
      </Card>
      <Text variant="caption" align="center">
        {t.onb.ra}
      </Text>
    </Shell>
  );
}

function UsageStep({ next }: { next: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const [on, setOn] = useState(false);
  const reads = [Clock, Timer, AppWindow, LockOpen];
  const never = [ChatsCircle, Monitor, Globe, Keyboard];
  return (
    <Shell
      title={t.onb.usage}
      sub={t.onb.usageSub}
      footer={
        on ? (
          <PillButton label={t.common.continue} size="lg" block onPress={next} />
        ) : (
          <PillButton
            label={t.onb.allow}
            size="lg"
            block
            onPress={() => {
              haptic.success();
              setOn(true);
            }}
          />
        )
      }
    >
      <View style={styles.twoCol}>
        <Card style={[styles.flex, styles.gapSm]}>
          <Text variant="overline" color="success">
            {t.onb.reads}
          </Text>
          {t.privacy.seesList.map((s, k) => {
            const Icon = reads[k];
            return (
              <View key={s} style={styles.readRow}>
                <Icon size={16} weight="bold" color={c.text} />
                <Text variant="subhead" color="text" numberOfLines={1} style={styles.flex}>
                  {s}
                </Text>
              </View>
            );
          })}
        </Card>
        <Card style={[styles.flex, styles.gapSm]}>
          <Text variant="overline" color="danger">
            {t.onb.neverReads}
          </Text>
          {t.privacy.neverList.map((s, k) => {
            const Icon = never[k];
            return (
              <View key={s} style={styles.readRow}>
                <Icon size={16} weight="bold" color={c.textTertiary} />
                <Text variant="subhead" numberOfLines={1} style={[styles.flex, styles.strike]}>
                  {s}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>
      {/* Android settings illustration: what the permission screen will look like. */}
      <View style={[styles.perm, { backgroundColor: c.tileDark }]}>
        <Text variant="caption" color={c.tileDarkSecondary}>
          {t.onb.permTitle}
        </Text>
        <View style={styles.permRow}>
          <Tarsi expression="happy" size={36} alive={false} interactive={false} />
          <Text variant="headline" color={c.tileDarkText} style={styles.flex}>
            {t.onb.permApp}
          </Text>
          <Toggle value={on} onChange={setOn} accessibilityLabel={t.onb.permTitle} />
        </View>
      </View>
    </Shell>
  );
}

function BedtimeStep({ next }: { next: () => void }) {
  const t = useT();
  const bedtime = useAppStore((s) => s.bedtime);
  const h24 = Math.floor(bedtime.start / 60);
  const [h, setH] = useState((h24 % 12 || 12) - 1);
  const [m, setM] = useState(Math.round((bedtime.start % 60) / 15));
  const [pm, setPm] = useState(h24 >= 12 ? 1 : 0);
  const save = () => {
    const start = (((h + 1) % 12) + pm * 12) * 60 + m * 15;
    useAppStore.getState().setBedtime({ ...bedtime, start });
    next();
  };
  return (
    <Shell
      title={t.onb.bedtime}
      sub={t.onb.bedtimeSub}
      footer={<PillButton label={t.common.continue} size="lg" block onPress={save} />}
    >
      <View style={styles.center}>
        <Tarsi expression="sleepy" size={120} />
      </View>
      <Card>
        <WheelGroup>
          <WheelPicker
            items={Array.from({ length: 12 }, (_, k) => String(k + 1))}
            index={h}
            onChange={setH}
            accessibilityLabel="Hour"
          />
          <WheelPicker items={['00', '15', '30', '45']} index={m} onChange={setM} accessibilityLabel="Minute" />
          <WheelPicker items={['AM', 'PM']} index={pm} onChange={setPm} accessibilityLabel="AM or PM" />
        </WheelGroup>
      </Card>
    </Shell>
  );
}

function Pretest({ next }: { next: () => void }) {
  const t = useT();
  const L = useL();
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const q = QUESTION_BY_ID[PRETEST_IDS[k]];
  const done = useEffectEvent(next);

  useEffect(() => {
    if (picked == null) return;
    const id = setTimeout(() => {
      if (k === PRETEST_IDS.length - 1) done();
      else {
        setK(k + 1);
        setPicked(null);
      }
    }, 900);
    return () => clearTimeout(id);
  }, [picked, k]);

  const stateFor = (i: number): OptionState => {
    if (picked == null) return 'idle';
    if (i === picked) return i === q.answer ? 'correct' : 'wrong';
    if (i === q.answer) return 'reveal';
    return 'dim';
  };

  return (
    <Shell title={t.onb.pretest} sub={t.onb.pretestSub}>
      <Text variant="overline">{t.quiz.progress(k + 1, PRETEST_IDS.length)}</Text>
      <Card>
        <Text variant="title">{L(q.prompt)}</Text>
      </Card>
      {q.options.map((o, i) => (
        <QuizOption
          key={`${q.id}-${i}`}
          index={i}
          label={o}
          state={stateFor(i)}
          disabled={picked != null}
          onPress={() => {
            setPicked(i);
            const correct = i === q.answer;
            if (correct) haptic.success();
            else haptic.warning();
            useAppStore.getState().answer({ skill: q.skill, correct, seconds: 10, hints: 0 });
          }}
        />
      ))}
    </Shell>
  );
}

function FirstGap({ finish }: { finish: () => void }) {
  const t = useT();
  const L = useL();
  const { width } = useWindowDimensions();
  const mastery = useAppStore((s) => s.mastery);
  const root = gapEngine.rootGap(mastery);
  const blocked = gapEngine.blocked(mastery, root);
  const w = Math.min(width, 520) - space.screen * 2 - space.card * 2;
  return (
    <Shell
      title={t.onb.firstGap}
      sub={t.onb.firstGapSub(L(SKILL_BY_ID[root].name))}
      footer={<PillButton label={t.onb.go} size="lg" block onPress={finish} />}
    >
      <Card>
        <SkillGraph mastery={mastery} root={root} blocked={blocked} width={w} reveal />
      </Card>
    </Shell>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, minHeight: 44 },
  backSpace: { width: 40 },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 7, borderRadius: 4 },
  page: { flex: 1 },
  shell: { paddingHorizontal: space.screen, paddingTop: 20, gap: 8, width: '100%', maxWidth: 520, alignSelf: 'center' },
  content: { gap: space.gap, marginTop: 16 },
  footer: { paddingHorizontal: space.screen, paddingTop: 12, width: '100%', maxWidth: 520, alignSelf: 'center' },
  welcome: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingHorizontal: space.screen },
  welcomeSub: { maxWidth: 320 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: radius.card,
    borderWidth: 2,
    minHeight: 76,
  },
  optionIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  grades: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'center' },
  grade: { width: 92, height: 92, borderRadius: 46, alignItems: 'center', justifyContent: 'center' },
  consent: { alignItems: 'center', gap: 20 },
  code: { flexDirection: 'row', gap: 6 },
  codeBox: { width: 40, height: 52, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  codeGap: { marginLeft: 10 },
  twoCol: { flexDirection: 'row', gap: space.gap },
  gapSm: { gap: 10 },
  readRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 24 },
  strike: { textDecorationLine: 'line-through' },
  perm: { borderRadius: radius.tile, padding: 16, gap: 10 },
  permRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});

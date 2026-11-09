import { useEffect, useEffectEvent, useState, type ReactNode } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Redirect, router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Rect } from 'react-native-svg';
import {
  AppWindow,
  BellRinging,
  CaretLeft,
  ChalkboardTeacher,
  ChatsCircle,
  CheckCircle,
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
import { MonitorSetup } from '@/components/student/MonitorSetup';
import {
  Card,
  IconButton,
  Notice,
  PillButton,
  PressableScale,
  Text,
  TextField,
  Toggle,
  WheelGroup,
  WheelPicker,
} from '@/components/ui';
import { PRETEST_IDS, QUESTION_BY_ID } from '@/data/questions';
import { SKILL_BY_ID } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { pressScale, spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useL, useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import { supabase } from '@/lib/supabase';
import { mulberry32 } from '@/services/ai/interventionPolicy';
import { gapEngine } from '@/services/ai/gapEngine';
import * as api from '@/services/backend/api';
import { flushStudent } from '@/services/backend/sync';
import { askNotifications, registerForPush } from '@/services/notifications';
import { useAppStore, type Lang, type Role } from '@/store/useAppStore';
import { useAuth, waitForProfile } from '@/store/useAuth';

type Step =
  | 'welcome'
  | 'role'
  | 'grade'
  | 'language'
  | 'account'
  | 'signin'
  | 'link'
  | 'class'
  | 'usage'
  | 'notify'
  | 'bedtime'
  | 'pretest'
  | 'gap'
  | 'consent'
  | 'pitchUsage';

const PITCH_FLOW: Step[] = ['welcome', 'role', 'grade', 'language', 'consent', 'pitchUsage', 'bedtime', 'pretest', 'gap'];
const START: Step[] = ['welcome', 'role'];
const STUDENT_AFTER_ACCOUNT: Step[] = ['link', 'class', 'usage', 'notify', 'bedtime', 'pretest', 'gap'];
const FLOWS: Record<Role, Step[]> = {
  student: [...START, 'grade', 'language', 'account', ...STUDENT_AFTER_ACCOUNT],
  guardian: [...START, 'account', 'notify'],
  teacher: [...START, 'account'],
};
/** Steps you can't go back past (the account already exists). */
const NO_BACK_FROM: Step[] = ['link'];

type Draft = { role: Role; grade: number };

export default function Onboarding() {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const t = useT();
  const status = useAuth((s) => s.status);
  const profile = useAuth((s) => s.profile);
  const onboarded = useAppStore((s) => s.onboarded);

  // A signed-in student who hasn't finished setup resumes after the account step.
  const [flow, setFlow] = useState<Step[]>(() =>
    IS_PITCH ? PITCH_FLOW : status === 'signedIn' ? STUDENT_AFTER_ACCOUNT : START,
  );
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const [draft, setDraft] = useState<Draft>({ role: 'student', grade: 8 });
  const step = flow[i];

  if (!IS_PITCH && status === 'signedIn' && profile) {
    // Guardians see the notification step right after creating their account.
    if (profile.role !== 'student' && step !== 'notify') return <Redirect href="/" />;
    if (onboarded) return <Redirect href="/home" />;
  }

  const next = () => {
    haptic.light();
    setDir(1);
    setI((k) => Math.min(flow.length - 1, k + 1));
  };
  const back = () => {
    setDir(-1);
    setI((k) => Math.max(0, k - 1));
  };
  const chooseRole = (role: Role) => {
    setDraft((d) => ({ ...d, role }));
    if (IS_PITCH) {
      if (role === 'student') next();
      else finishPitch(role);
      return;
    }
    setFlow(FLOWS[role]);
    setDir(1);
    setI(2);
  };
  const toSignIn = () => {
    setFlow(['welcome', 'signin']);
    setDir(1);
    setI(1);
  };

  const finishPitch = (role: Role) => {
    const s = useAppStore.getState();
    s.setRole(role);
    s.setOnboarded(true);
    router.replace(role === 'student' ? '/home' : role === 'guardian' ? '/guardian' : '/teacher');
  };

  const finish = async () => {
    if (IS_PITCH) return finishPitch('student');
    const s = useAppStore.getState();
    s.setOnboarded(true);
    const id = useAuth.getState().profile?.id;
    if (id) await flushStudent(id).catch(() => {});
    router.replace('/home');
  };

  const canBack = i > 0 && !(status === 'signedIn' && NO_BACK_FROM.includes(step)) && flow[0] !== 'link';

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }]}
    >
      <View style={styles.top}>
        {canBack ? (
          <IconButton
            icon={<CaretLeft size={20} weight="bold" color={c.text} />}
            accessibilityLabel={t.common.back}
            onPress={back}
          />
        ) : (
          <View style={styles.backSpace} />
        )}
        <View style={styles.dots} accessibilityLabel={`${i + 1} / ${flow.length}`}>
          {flow.length > 2
            ? flow.map((s, k) => <ProgressDot key={`${s}-${k}`} on={k === i} done={k < i} />)
            : null}
        </View>
        <View style={styles.backSpace} />
      </View>
      <Page key={step} dir={dir}>
        <StepBody
          step={step}
          draft={draft}
          setDraft={setDraft}
          next={next}
          chooseRole={chooseRole}
          toSignIn={toSignIn}
          finish={finish}
        />
      </Page>
    </KeyboardAvoidingView>
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

type BodyProps = {
  step: Step;
  draft: Draft;
  setDraft: (fn: (d: Draft) => Draft) => void;
  next: () => void;
  chooseRole: (r: Role) => void;
  toSignIn: () => void;
  finish: () => void;
};

function StepBody({ step, draft, setDraft, next, chooseRole, toSignIn, finish }: BodyProps) {
  switch (step) {
    case 'welcome':
      return <Welcome next={next} toSignIn={toSignIn} />;
    case 'role':
      return <RoleStep choose={chooseRole} />;
    case 'grade':
      return <GradeStep grade={draft.grade} setGrade={(g) => setDraft((d) => ({ ...d, grade: g }))} next={next} />;
    case 'language':
      return <LanguageStep next={next} />;
    case 'account':
      return <AccountStep draft={draft} next={next} toSignIn={toSignIn} />;
    case 'signin':
      return <SignInStep />;
    case 'link':
      return <LinkStep next={next} />;
    case 'class':
      return <ClassStep next={next} />;
    case 'usage':
      return <UsageStep next={next} />;
    case 'notify':
      return <NotifyStep next={next} role={draft.role} />;
    case 'bedtime':
      return <BedtimeStep next={next} />;
    case 'pretest':
      return <Pretest next={next} />;
    case 'gap':
      return <FirstGap finish={finish} />;
    case 'consent':
      return <PitchConsent next={next} />;
    case 'pitchUsage':
      return <PitchUsage next={next} />;
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
      <ScrollView
        contentContainerStyle={styles.shell}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
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

function Welcome({ next, toSignIn }: { next: () => void; toSignIn: () => void }) {
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
      <View style={[styles.footer, styles.gapSm]}>
        <PillButton label={t.onb.getStarted} size="lg" block onPress={next} />
        {!IS_PITCH ? <PillButton label={t.acct.haveAccount} kind="neutral" size="lg" block onPress={toSignIn} /> : null}
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

function RoleStep({ choose }: { choose: (r: Role) => void }) {
  const { c } = useTheme();
  const t = useT();
  return (
    <Shell title={t.onb.role}>
      <BigOption
        title={t.onb.student}
        sub={t.onb.studentSub}
        icon={<Student size={26} weight="fill" color={c.accent} />}
        onPress={() => choose('student')}
      />
      <BigOption
        title={t.onb.guardian}
        sub={t.onb.guardianSub}
        icon={<HouseLine size={26} weight="fill" color={c.success} />}
        onPress={() => choose('guardian')}
      />
      <BigOption
        title={t.onb.teacher}
        sub={t.onb.teacherSub}
        icon={<ChalkboardTeacher size={26} weight="fill" color={c.tabInsights} />}
        onPress={() => choose('teacher')}
      />
    </Shell>
  );
}

function GradeStep({ grade, setGrade, next }: { grade: number; setGrade: (g: number) => void; next: () => void }) {
  const { c } = useTheme();
  const t = useT();
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

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function AccountStep({ draft, next, toSignIn }: { draft: Draft; next: () => void; toSignIn: () => void }) {
  const t = useT();
  const lang = useAppStore((s) => s.lang);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const errs = {
    name: name.trim().length < 1 ? t.acct.needName : null,
    email: EMAIL.test(email.trim()) ? null : t.acct.needEmail,
    password: password.length >= 8 ? null : t.acct.needPassword,
  };

  const submit = async () => {
    setTouched(true);
    setError(null);
    if (errs.name || errs.email || errs.password) return;
    setBusy(true);
    try {
      await api.signUp({ email, password, name, role: draft.role, grade: draft.role === 'student' ? draft.grade : null, lang });
      const p = await waitForProfile();
      if (!p) throw new Error(t.acct.offline);
      haptic.success();
      if (draft.role === 'student') next();
      else if (draft.role === 'guardian') next();
      else router.replace('/teacher');
    } catch (e) {
      setError((e as Error).message);
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={t.acct.createTitle}
      sub={t.acct.createSub}
      footer={
        <View style={styles.gapSm}>
          <PillButton label={busy ? `${t.common.loading}…` : t.acct.create} size="lg" block disabled={busy} onPress={submit} />
          <PillButton label={t.acct.haveAccount} kind="neutral" size="md" block onPress={toSignIn} />
        </View>
      }
    >
      {error ? <Notice text={error} /> : null}
      <TextField
        label={t.acct.name}
        placeholder={t.acct.namePh}
        value={name}
        onChangeText={setName}
        autoCapitalize="words"
        autoComplete="name"
        textContentType="name"
        error={touched ? errs.name : null}
        maxLength={60}
      />
      <TextField
        label={t.acct.email}
        placeholder={t.acct.emailPh}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
        error={touched ? errs.email : null}
      />
      <TextField
        label={t.acct.password}
        placeholder={t.acct.passwordPh}
        value={password}
        onChangeText={setPassword}
        secret
        autoComplete="new-password"
        textContentType="newPassword"
        error={touched ? errs.password : null}
        onSubmitEditing={submit}
      />
      <Text variant="caption" align="center">
        {t.acct.agree}
      </Text>
    </Shell>
  );
}

function SignInStep() {
  const t = useT();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setInfo(null);
    if (!EMAIL.test(email.trim()) || !password) {
      setError(t.acct.needEmail);
      return;
    }
    setBusy(true);
    try {
      const session = await api.signIn(email, password);
      const p = await waitForProfile();
      if (!p) throw new Error(t.acct.offline);
      if (p.role === 'student' && session) {
        // Resume where this account left off on another phone.
        const { data } = await supabase.from('progress').select('onboarded').eq('student_id', p.id).maybeSingle();
        useAppStore.getState().hydrate({ onboarded: !!data?.onboarded });
      }
      haptic.success();
      router.replace('/');
    } catch (e) {
      setError((e as Error).message);
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  const forgot = async () => {
    setError(null);
    if (!EMAIL.test(email.trim())) {
      setError(t.acct.needEmail);
      return;
    }
    try {
      await api.resetPassword(email);
      setInfo(t.acct.resetSent);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <Shell
      title={t.acct.signInTitle}
      footer={<PillButton label={busy ? `${t.common.loading}…` : t.acct.signIn} size="lg" block disabled={busy} onPress={submit} />}
    >
      {error ? <Notice text={error} /> : null}
      {info ? <Notice text={info} tone="success" /> : null}
      <TextField
        label={t.acct.email}
        placeholder={t.acct.emailPh}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        autoCapitalize="none"
      />
      <TextField
        label={t.acct.password}
        value={password}
        onChangeText={setPassword}
        secret
        autoComplete="current-password"
        textContentType="password"
        onSubmitEditing={submit}
      />
      <Pressable onPress={forgot} accessibilityRole="button" style={styles.link} hitSlop={8}>
        <Text variant="subhead" color="accent">
          {t.acct.forgot}
        </Text>
      </Pressable>
    </Shell>
  );
}

function CodeBoxes({ code }: { code: string }) {
  const { c } = useTheme();
  return (
    <View style={styles.code} accessible accessibilityLabel={code.split('').join(' ')}>
      {code.split('').map((d, k) => (
        <View key={k} style={[styles.codeBox, { backgroundColor: c.inset }, k === 3 && styles.codeGap]}>
          <Text variant="title" tabular>
            {d}
          </Text>
        </View>
      ))}
    </View>
  );
}

function LinkStep({ next }: { next: () => void }) {
  const t = useT();
  const { c } = useTheme();
  const guardians = useAppStore((s) => s.guardians);
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    api
      .myLinkCode(false)
      .then((x) => live && setCode(x))
      .catch((e: Error) => live && setError(e.message));
    return () => {
      live = false;
    };
  }, []);
  const regenerate = () => {
    setError(null);
    api
      .myLinkCode(true)
      .then(setCode)
      .catch((e: Error) => setError(e.message));
  };

  const linked = guardians[0];
  return (
    <Shell
      title={t.acct.linkTitle}
      sub={t.acct.linkSub}
      footer={
        <PillButton label={linked ? t.common.continue : t.acct.later} kind={linked ? 'primary' : 'neutral'} size="lg" block onPress={next} />
      }
    >
      {error ? <Notice text={error} /> : null}
      <Card style={styles.consent}>
        {code ? <CodeBoxes code={code} /> : <Text variant="subhead">{t.common.loading}…</Text>}
        {linked ? (
          <View style={styles.row}>
            <CheckCircle size={22} weight="fill" color={c.success} />
            <Text variant="headline">{t.acct.linked(linked.name)}</Text>
          </View>
        ) : (
          <View style={styles.row}>
            <Tarsi expression="curious" size={40} alive={false} interactive={false} />
            <Text variant="subhead">{t.acct.linkWaiting}</Text>
          </View>
        )}
        {!linked && code ? (
          <PillButton label={t.acct.newCode} kind="neutral" size="sm" onPress={regenerate} />
        ) : null}
      </Card>
      <Text variant="caption" align="center">
        {t.onb.ra}
      </Text>
    </Shell>
  );
}

function ClassStep({ next }: { next: () => void }) {
  const t = useT();
  const { c } = useTheme();
  const classes = useAppStore((s) => s.classes);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [joined, setJoined] = useState<string | null>(classes[0]?.name ?? null);

  const join = async () => {
    setError(null);
    if (code.trim().length < 6) return;
    setBusy(true);
    try {
      const r = await api.joinClass(code);
      setJoined(r.name);
      haptic.success();
    } catch (e) {
      setError((e as Error).message);
      haptic.warning();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell
      title={t.acct.classTitle}
      sub={t.acct.classSub}
      footer={
        joined ? (
          <PillButton label={t.common.continue} size="lg" block onPress={next} />
        ) : (
          <View style={styles.gapSm}>
            <PillButton label={busy ? `${t.common.loading}…` : t.acct.join} size="lg" block disabled={busy || code.trim().length < 6} onPress={join} />
            <PillButton label={t.acct.later} kind="neutral" size="md" block onPress={next} />
          </View>
        )
      }
    >
      {error ? <Notice text={error} /> : null}
      {joined ? (
        <Card style={styles.rowCard}>
          <CheckCircle size={24} weight="fill" color={c.success} />
          <Text variant="headline">{t.acct.joined(joined)}</Text>
        </Card>
      ) : (
        <TextField
          label={t.acct.classCode}
          placeholder="ABC234"
          value={code}
          onChangeText={(v) => setCode(v.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
          code
          autoCapitalize="characters"
          onSubmitEditing={join}
        />
      )}
    </Shell>
  );
}

function UsageStep({ next }: { next: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const reads = [Clock, Timer, AppWindow, LockOpen];
  const never = [ChatsCircle, Monitor, Globe, Keyboard];
  return (
    <Shell
      title={t.onb.usage}
      sub={t.onb.usageSub}
      footer={<PillButton label={t.common.continue} size="lg" block onPress={next} />}
    >
      <MonitorSetup />
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
                <Text variant="subhead" color="text" numberOfLines={2} style={styles.flex}>
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
                <Text variant="subhead" numberOfLines={2} style={[styles.flex, styles.strike]}>
                  {s}
                </Text>
              </View>
            );
          })}
        </Card>
      </View>
    </Shell>
  );
}

function NotifyStep({ next, role }: { next: () => void; role: Role }) {
  const t = useT();
  const { c } = useTheme();
  const [on, setOn] = useState(false);
  const done = () => {
    if (role === 'guardian') router.replace('/guardian');
    else next();
  };
  const ask = async () => {
    const ok = await askNotifications();
    setOn(ok);
    if (ok) {
      haptic.success();
      registerForPush();
    }
  };
  if (Platform.OS === 'web') {
    return (
      <Shell title={t.acct.notifyTitle} sub={t.acct.notifySub} footer={<PillButton label={t.common.continue} size="lg" block onPress={done} />}>
        <Card>
          <Text variant="body" color="textSecondary">
            {t.acct.monitorWeb}
          </Text>
        </Card>
      </Shell>
    );
  }
  return (
    <Shell
      title={t.acct.notifyTitle}
      sub={t.acct.notifySub}
      footer={
        on ? (
          <PillButton label={t.common.continue} size="lg" block onPress={done} />
        ) : (
          <View style={styles.gapSm}>
            <PillButton label={t.acct.allowNotify} size="lg" block onPress={ask} />
            <PillButton label={t.common.skip} kind="neutral" size="md" block onPress={done} />
          </View>
        )
      }
    >
      <View style={styles.center}>
        <Tarsi expression={on ? 'happy' : 'curious'} size={140} />
      </View>
      {on ? (
        <Card style={styles.rowCard}>
          <BellRinging size={22} weight="fill" color={c.success} />
          <Text variant="headline">{t.acct.notifyOn}</Text>
        </Card>
      ) : null}
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
            useAppStore
              .getState()
              .answer({ skill: q.skill, correct, seconds: 10, hints: 0 }, { questionId: q.id, chosen: i, context: 'pretest' });
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

// ── Pitch build only: the original illustrated consent and usage steps ─────

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

function PitchConsent({ next }: { next: () => void }) {
  const t = useT();
  return (
    <Shell
      title={t.onb.consent}
      sub={t.onb.consentSub}
      footer={<PillButton label={t.common.continue} size="lg" block onPress={next} />}
    >
      <Card style={styles.consent}>
        <CodeBoxes code="482913" />
        <QrPlaceholder />
      </Card>
      <Text variant="caption" align="center">
        {t.onb.ra}
      </Text>
    </Shell>
  );
}

function PitchUsage({ next }: { next: () => void }) {
  const { c } = useTheme();
  const t = useT();
  const [on, setOn] = useState(false);
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

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  center: { alignItems: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  link: { alignSelf: 'center', paddingVertical: 6 },
  top: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, minHeight: 44 },
  backSpace: { width: 40 },
  dots: { flex: 1, flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 7, borderRadius: 4 },
  page: { flex: 1 },
  shell: { paddingHorizontal: space.screen, paddingTop: 20, gap: 8, width: '100%', maxWidth: 520, alignSelf: 'center' },
  content: { gap: space.gap, marginTop: 16, paddingBottom: 16 },
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

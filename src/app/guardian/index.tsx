import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Clock, EyeSlash, Moon, Sparkle } from 'phosphor-react-native';

import { AppsCard, NowCard } from '@/components/guardian/AppUsage';
import { Tarsi } from '@/components/mascot/Tarsi';
import {
  BarChart,
  Card,
  Chip,
  DevChip,
  EmptyState,
  ListGroup,
  ListRow,
  Notice,
  PillButton,
  Ring,
  SegmentedControl,
  Stagger,
  StatTile,
  Text,
  TextField,
  Toggle,
} from '@/components/ui';
import type { NudgeEntry } from '@/data/seed';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useNow } from '@/hooks/useNow';
import { habitGrade, realWeek, useWeek } from '@/hooks/useWeek';
import { useGuardianT } from '@/i18n/staff';
import { formatClock, useT } from '@/i18n/useT';
import { IS_PITCH, PITCH_NAMES } from '@/lib/config';
import type { DaySummary } from '@/services/types';
import * as api from '@/services/backend/api';
import {
  loadChild,
  patchChild,
  useGuardian,
  useGuardianLive,
  type AppDay,
  type LiveNow,
} from '@/services/backend/guardian';
import { todayKey, useAppStore, type TimeRequest } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

const BEDTIMES = [21 * 60, 21 * 60 + 30, 22 * 60, 22 * 60 + 30, 23 * 60];
const LIMITS = [0, 10, 15, 20, 30, 45, 60];

/** Sample per-app day for the pitch build. */
const PITCH_APPS: AppDay[] = [
  ['com.zhiliaoapp.musically', 'TikTok', 'video', 62],
  ['com.google.android.youtube', 'YouTube', 'video', 41],
  ['com.facebook.katana', 'Facebook', 'social', 18],
  ['com.mobile.legends', 'Mobile Legends', 'games', 9],
  ['com.google.android.apps.classroom', 'Classroom', 'study', 4],
].map(([p, label, category, minutes]) => ({
  day: todayKey(),
  package: p as string,
  label: label as string,
  category: category as AppDay['category'],
  minutes: minutes as number,
}));

/** Everything the guardian screen shows, from the demo store or the server. */
type GView = {
  childName: string;
  childSub: string;
  days: DaySummary[];
  breaks: number;
  breakTarget: number;
  lateMinutes: number;
  dropMinutes: number;
  learningMin: number;
  requests: TimeRequest[];
  nudges: NudgeEntry[];
  bedtimeStart: number;
  lockEnabled: boolean;
  lateAlerts: boolean;
  limitStyle: 'adaptive' | 'fixed';
  unlockUntil: string | null;
  scrollLimit: number | null;
  gamesLimit: number | null;
  apps: AppDay[];
  live: LiveNow | null;
  hasData: boolean;
  approve: (id: string) => void;
  decline: (id: string) => void;
  setBedtime: (m: number) => void;
  setAlerts: (v: boolean) => void;
  setLock: (v: boolean) => void;
  setLimit: (v: 'adaptive' | 'fixed') => void;
  setScrollLimit: (m: number | null) => void;
  setGamesLimit: (m: number | null) => void;
};

function usePitchView(): GView {
  const week = useWeek();
  const guardian = useAppStore((s) => s.guardian);
  const bedtime = useAppStore((s) => s.bedtime);
  const requests = useAppStore((s) => s.requests);
  const nudges = useAppStore((s) => s.nudges);
  const limits = useAppStore((s) => s.limits);
  const s = useAppStore.getState;
  return {
    childName: PITCH_NAMES.student,
    childSub: `Grade 8 · ${PITCH_NAMES.section}`,
    days: week.days,
    breaks: week.breaks,
    breakTarget: week.breakTarget,
    lateMinutes: week.lateMinutes,
    dropMinutes: week.dropMinutes,
    learningMin: week.breaks * 3 + 42,
    requests,
    nudges,
    bedtimeStart: bedtime.start,
    lockEnabled: guardian.lockEnabled,
    lateAlerts: guardian.lateNightAlerts,
    limitStyle: guardian.limitStyle,
    unlockUntil: null,
    scrollLimit: limits.scroll,
    gamesLimit: limits.games,
    apps: PITCH_APPS,
    live: null,
    hasData: true,
    approve: (id) => s().resolveRequest(id, 'approved'),
    decline: (id) => s().resolveRequest(id, 'declined'),
    setBedtime: (m) => s().setBedtime({ ...s().bedtime, start: m }),
    setAlerts: (v) => s().setGuardian({ lateNightAlerts: v }),
    setLock: (v) => s().setGuardian({ lockEnabled: v }),
    setLimit: (v) => s().setGuardian({ limitStyle: v }),
    setScrollLimit: (m) => s().hydrate({ limits: { ...s().limits, scroll: m } }),
    setGamesLimit: (m) => s().hydrate({ limits: { ...s().limits, games: m } }),
  };
}

function useRealView(onError: (m: string) => void): GView | null {
  const selected = useGuardian((s) => s.selected);
  const child = useGuardian((s) => s.children.find((c) => c.id === s.selected) ?? null);
  const d = useGuardian((s) => (s.selected ? s.data[s.selected] : undefined));
  if (!selected || !child || !d) return null;
  const now = new Date();
  const days = realWeek(d.usage, now, 0);
  const weekStart = todayKey(new Date(now.getTime() - 6 * 24 * 3600 * 1000));
  const prev = d.usage.filter((u) => u.day < weekStart && u.total > 0);
  const avg = Math.round(days.reduce((a, x) => a + x.minutes, 0) / 7);
  const prevAvg = prev.length >= 3 ? Math.round(prev.reduce((a, u) => a + u.total, 0) / prev.length) : null;
  const guard = (p: Promise<unknown>) =>
    p.catch((e: Error) => {
      onError(e.message);
      loadChild(selected);
    });
  return {
    childName: child.name.split(' ')[0],
    childSub: child.grade ? `Grade ${child.grade}` : '',
    days,
    breaks: days.reduce((a, x) => a + x.breaks, 0),
    breakTarget: 12,
    lateMinutes: days.reduce((a, x) => a + x.lateMinutes, 0),
    dropMinutes: prevAvg == null ? 0 : Math.max(0, prevAvg - avg),
    learningMin: d.usage.slice(-7).reduce((a, u) => a + u.learning, 0),
    requests: d.requests,
    nudges: d.nudges,
    bedtimeStart: d.settings.bedtimeStart,
    lockEnabled: d.controls.lockEnabled,
    lateAlerts: d.controls.lateAlerts,
    limitStyle: d.settings.limitStyle,
    unlockUntil: d.controls.unlockUntil,
    scrollLimit: d.controls.scrollLimit,
    gamesLimit: d.controls.gamesLimit,
    apps: d.apps,
    live: d.live,
    hasData: d.usage.some((u) => u.total > 0) || d.nudges.length > 0,
    approve: (id) => {
      patchChild(selected, (x) => ({ ...x, requests: x.requests.map((r) => (r.id === id ? { ...r, status: 'approved' } : r)) }));
      guard(api.decideRequest(id, true));
    },
    decline: (id) => {
      patchChild(selected, (x) => ({ ...x, requests: x.requests.map((r) => (r.id === id ? { ...r, status: 'declined' } : r)) }));
      guard(api.decideRequest(id, false));
    },
    setBedtime: (m) => {
      patchChild(selected, (x) => ({ ...x, settings: { ...x.settings, bedtimeStart: m }, controls: { ...x.controls, lockStart: m } }));
      guard(Promise.all([api.setStudentSettings(selected, { bedtime_start: m }), api.setControls(selected, { lock_start: m })]));
    },
    setAlerts: (v) => {
      patchChild(selected, (x) => ({ ...x, controls: { ...x.controls, lateAlerts: v } }));
      guard(api.setControls(selected, { late_alerts: v }));
    },
    setLock: (v) => {
      patchChild(selected, (x) => ({ ...x, controls: { ...x.controls, lockEnabled: v } }));
      guard(
        api.setControls(selected, {
          lock_enabled: v,
          lock_start: d.settings.bedtimeStart,
          lock_end: d.settings.bedtimeEnd,
        }),
      );
    },
    setLimit: (v) => {
      patchChild(selected, (x) => ({ ...x, settings: { ...x.settings, limitStyle: v } }));
      guard(api.setStudentSettings(selected, { limit_style: v }));
    },
    setScrollLimit: (m) => {
      patchChild(selected, (x) => ({ ...x, controls: { ...x.controls, scrollLimit: m } }));
      guard(api.setControls(selected, { scroll_limit: m }));
    },
    setGamesLimit: (m) => {
      patchChild(selected, (x) => ({ ...x, controls: { ...x.controls, gamesLimit: m } }));
      guard(api.setControls(selected, { games_limit: m }));
    },
  };
}

/** Guardian view: habits only — a one-minute weekly summary, controls and requests. */
export default function Guardian() {
  return IS_PITCH ? <GuardianPitch /> : <GuardianReal />;
}

function GuardianPitch() {
  const v = usePitchView();
  return <Layout v={v} />;
}

function GuardianReal() {
  useGuardianLive();
  const [error, setError] = useState<string | null>(null);
  const v = useRealView(setError);
  const loading = useGuardian((s) => s.loading);
  const children = useGuardian((s) => s.children);
  if (!loading && children.length === 0) return <Layout v={null} error={error} />;
  return <Layout v={v} error={error} />;
}

function Layout({ v, error }: { v: GView | null; error?: string | null }) {
  const { c } = useTheme();
  const g = useGuardianT();
  const t = useT();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const children = useGuardian((s) => s.children);
  const selected = useGuardian((s) => s.selected);
  const me = useAuth((s) => s.profile);

  const header = (
    <Stagger index={0} style={styles.header}>
      <View style={styles.flex}>
        <Text variant="largeTitle" numberOfLines={1}>
          {v ? g.hello(v.childName) : g.linkTitle}
        </Text>
        <Text variant="subhead">{v ? v.childSub || ' ' : me?.display_name}</Text>
      </View>
      {IS_PITCH ? <DevChip label={t.demo.title} onPress={() => router.push('/demo')} /> : null}
    </Stagger>
  );

  const body = !v ? (
    <View style={styles.col}>
      <LinkChild first />
      <AccountCard />
    </View>
  ) : (
    <Content v={v} wide={wide} />
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <ScrollView
        contentContainerStyle={[styles.body, { maxWidth: wide ? 1100 : 560, paddingBottom: insets.bottom + 40 }]}
        keyboardShouldPersistTaps="handled"
      >
        {header}
        {!IS_PITCH && children.length > 1 ? (
          <SegmentedControl
            options={children.map((k) => ({ value: k.id, label: k.name.split(' ')[0] }))}
            value={selected ?? children[0].id}
            onChange={(id) => useGuardian.getState().select(id)}
          />
        ) : null}
        <Stagger index={1}>
          <View style={[styles.note, { backgroundColor: c.card, borderColor: c.hairline }]}>
            <EyeSlash size={18} weight="fill" color={c.success} />
            <Text variant="subhead" color="text" style={styles.flex}>
              {g.note}
            </Text>
          </View>
        </Stagger>
        {error ? <Notice text={error} /> : null}
        {body}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Content({ v, wide }: { v: GView; wide: boolean }) {
  const { c } = useTheme();
  const g = useGuardianT();
  const t = useT();
  const { score, grade } = habitGrade(v.breaks, v.breakTarget, v.lateMinutes);
  const lateNights = v.days.filter((d) => d.lateMinutes > 0).length;
  const now = useNow();
  const unlocked = v.unlockUntil && Date.parse(v.unlockUntil) > now ? new Date(v.unlockUntil) : null;

  const summary = (
    <View style={styles.col}>
      {!IS_PITCH ? (
        <NowCard live={v.live} childName={v.childName} scrollLimit={v.scrollLimit} gamesLimit={v.gamesLimit} />
      ) : null}
      <Card style={styles.gap}>
        <View style={styles.rowTop}>
          <View style={styles.flexGap}>
            <Text variant="overline">{g.title}</Text>
            <Text variant="title">{g.summary(v.dropMinutes, lateNights, v.breaks)}</Text>
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
        {v.hasData ? (
          <BarChart
            values={v.days.map((d) => d.minutes)}
            labels={v.days.map((d) => t.days.long[d.weekday])}
            highlight={6}
            height={110}
            accessibilityLabel={g.perDay}
          />
        ) : (
          <EmptyState title={g.noData} subtitle={g.noDataSub(v.childName)} expression="curious" />
        )}
      </Card>
      <AppsCard apps={v.apps} childName={v.childName} />
      <View style={styles.row}>
        <StatTile
          label={g.lateNight}
          value={v.lateMinutes}
          unit="m"
          icon={<Moon size={16} weight="fill" color={c.indigo} />}
          style={styles.flex}
        />
        <StatTile
          label={g.learning}
          value={v.learningMin}
          unit="m"
          icon={<Sparkle size={16} weight="fill" color={c.success} />}
          style={styles.flex}
        />
      </View>
      <Card style={styles.gap}>
        <Text variant="headline">{g.recent}</Text>
        {v.nudges.length === 0 ? (
          <Text variant="subhead">{g.noNudges}</Text>
        ) : (
          v.nudges.slice(0, 6).map((n) => {
            const d = new Date(n.at);
            return (
              <View key={n.id} style={styles.nudgeRow}>
                <Text variant="subhead" color="text" style={styles.flex} numberOfLines={1}>
                  {g.nudgeLevel[n.level] ?? n.level} · {g.nudgeResponse[n.response] ?? n.response}
                </Text>
                <Text variant="caption">
                  {t.days.long[d.getDay()]} {formatClock(d.getHours() * 60 + d.getMinutes())}
                </Text>
              </View>
            );
          })
        )}
      </Card>
    </View>
  );

  const side = (
    <View style={styles.col}>
      <Card style={styles.gap}>
        <Text variant="title">{g.requests}</Text>
        {v.requests.length === 0 ? (
          <EmptyState title={g.none} subtitle={g.noneSub(v.childName)} expression="happy" />
        ) : null}
        {v.requests.slice(0, 4).map((r) => {
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
                  <Text variant="caption">{g.requestSub(v.childName, when)}</Text>
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
                  <PillButton label={g.approve} style={styles.flex} block onPress={() => v.approve(r.id)} />
                  <PillButton label={g.decline} kind="secondary" style={styles.flex} block onPress={() => v.decline(r.id)} />
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
            options={BEDTIMES.map((m) => ({ value: String(m), label: formatClock(m).replace(':00', '') }))}
            value={String(BEDTIMES.includes(v.bedtimeStart) ? v.bedtimeStart : 22 * 60)}
            onChange={(x) => v.setBedtime(Number(x))}
            compact
          />
        </View>
        <View style={[styles.gap, styles.toggleRow, styles.column, { borderColor: c.hairline }]}>
          <Text variant="headline">{g.limitsTitle}</Text>
          <Text variant="caption">{g.limitsSub}</Text>
          <Text variant="subhead" color="text">
            {g.scrollLimit}
          </Text>
          <SegmentedControl
            options={LIMITS.map((m) => ({ value: String(m), label: m ? `${m}m` : g.off }))}
            value={String(v.scrollLimit ?? 0)}
            onChange={(x) => v.setScrollLimit(Number(x) || null)}
            compact
          />
          <Text variant="subhead" color="text">
            {g.gamesLimit}
          </Text>
          <SegmentedControl
            options={LIMITS.map((m) => ({ value: String(m), label: m ? `${m}m` : g.off }))}
            value={String(v.gamesLimit ?? 0)}
            onChange={(x) => v.setGamesLimit(Number(x) || null)}
            compact
          />
        </View>
        <View style={[styles.toggleRow, { borderColor: c.hairline }]}>
          <Text variant="headline" style={styles.flex}>
            {g.alerts}
          </Text>
          <Toggle value={v.lateAlerts} onChange={v.setAlerts} accessibilityLabel={g.alerts} />
        </View>
        <View style={[styles.toggleRow, { borderColor: c.hairline }]}>
          <View style={styles.flex}>
            <Text variant="headline">{g.lock}</Text>
            <Text variant="caption">
              {unlocked ? g.unlockedUntil(formatClock(unlocked.getHours() * 60 + unlocked.getMinutes())) : g.lockSub}
            </Text>
          </View>
          <Toggle value={v.lockEnabled} onChange={v.setLock} accessibilityLabel={g.lock} />
        </View>
        <View style={[styles.gap, styles.toggleRow, styles.column, { borderColor: c.hairline }]}>
          <Text variant="headline">{g.limit}</Text>
          <SegmentedControl<'adaptive' | 'fixed'>
            options={[
              { value: 'adaptive', label: g.adaptive },
              { value: 'fixed', label: g.fixed },
            ]}
            value={v.limitStyle}
            onChange={v.setLimit}
          />
        </View>
      </Card>
      {!IS_PITCH ? (
        <>
          <LinkChild />
          <AccountCard />
        </>
      ) : null}
    </View>
  );

  return wide ? (
    <View style={styles.columns}>
      <View style={styles.flex}>{summary}</View>
      <View style={styles.flex}>{side}</View>
    </View>
  ) : (
    <>
      {summary}
      {side}
    </>
  );
}

/** Enter the child's 6-digit code and give consent. */
function LinkChild({ first }: { first?: boolean }) {
  const g = useGuardianT();
  const [open, setOpen] = useState(!!first);
  const [code, setCode] = useState('');
  const [consent, setConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open)
    return <PillButton label={g.addChild} kind="neutral" block onPress={() => setOpen(true)} />;

  const link = async () => {
    setError(null);
    if (!consent) return setError(g.needConsent);
    setBusy(true);
    try {
      const r = await api.linkStudent(code);
      useGuardian.getState().select(r.student_id);
      setCode('');
      setConsent(false);
      if (!first) setOpen(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={styles.gap}>
      {first ? <Tarsi expression="waving" size={110} /> : <Text variant="title">{g.linkTitle}</Text>}
      <Text variant="subhead">{g.linkSub}</Text>
      {error ? <Notice text={error} /> : null}
      <TextField
        label={g.codeLabel}
        placeholder="123456"
        value={code}
        onChangeText={(x) => setCode(x.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        code
      />
      <View style={styles.consentRow}>
        <Toggle value={consent} onChange={setConsent} accessibilityLabel={g.consent} />
        <Text variant="caption" style={styles.flex}>
          {g.consent}
        </Text>
      </View>
      <PillButton label={busy ? '…' : g.link} block disabled={busy || code.length < 6} onPress={link} />
    </Card>
  );
}

function AccountCard() {
  const T = useGuardianT();
  const t = useT();
  const me = useAuth((s) => s.profile);
  const selected = useGuardian((s) => s.selected);
  const child = useGuardian((s) => s.children.find((c) => c.id === s.selected));
  const [confirm, setConfirm] = useState<'delete' | 'unlink' | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!me) return null;
  return (
    <View style={styles.gap}>
      <Text variant="overline" style={styles.label}>
        {T.account} · {me.email}
      </Text>
      {error ? <Notice text={error} /> : null}
      <ListGroup>
        {child && selected ? (
          <ListRow
            title={confirm === 'unlink' ? T.unlinkConfirm : `${T.unlink} (${child.name.split(' ')[0]})`}
            destructive
            chevron={false}
            onPress={() => {
              if (confirm !== 'unlink') return setConfirm('unlink');
              setConfirm(null);
              api.unlink(me.id, selected).catch((e: Error) => setError(e.message));
            }}
          />
        ) : null}
        <ListRow
          title={t.acct.signOut}
          chevron={false}
          onPress={async () => {
            await api.signOut();
            router.replace('/onboarding');
          }}
        />
        <ListRow
          title={confirm === 'delete' ? t.profile.delConfirm : t.profile.del}
          destructive
          chevron={false}
          onPress={async () => {
            if (confirm !== 'delete') return setConfirm('delete');
            try {
              await api.deleteAccount();
              router.replace('/onboarding');
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        />
      </ListGroup>
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
  nudgeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { paddingHorizontal: 4, marginTop: 8 },
});

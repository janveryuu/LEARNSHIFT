import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { DeviceMobile, GameController, GraduationCap, Play, Sparkle, UsersThree } from 'phosphor-react-native';

import { Card, Chip, EmptyState, SegmentedControl, Text } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useNow } from '@/hooks/useNow';
import { useGuardianT } from '@/i18n/staff';
import { formatClock, formatDuration } from '@/i18n/useT';
import type { AppCategory, AppDay, LiveNow } from '@/services/backend/guardian';
import { todayKey } from '@/store/useAppStore';

const DAY_MS = 24 * 3600 * 1000;

function useCatColor() {
  const { c } = useTheme();
  return (cat: AppCategory | null): string =>
    cat === 'video'
      ? c.accent
      : cat === 'social'
        ? c.indigo
        : cat === 'games'
          ? c.tabInsights
          : cat === 'study'
            ? c.success
            : c.textTertiary;
}

function CatIcon({ cat, size = 18, color }: { cat: AppCategory | null; size?: number; color: string }) {
  const p = { size, weight: 'fill' as const, color };
  if (cat === 'video') return <Play {...p} />;
  if (cat === 'social') return <UsersThree {...p} />;
  if (cat === 'games') return <GameController {...p} />;
  if (cat === 'study') return <GraduationCap {...p} />;
  if (cat === 'other') return <Sparkle {...p} />;
  return <DeviceMobile {...p} />;
}

/** What the child has open right now, how long, and when the next break is due. */
export function NowCard({
  live,
  childName,
  scrollLimit,
  gamesLimit,
}: {
  live: LiveNow | null;
  childName: string;
  scrollLimit: number | null;
  gamesLimit: number | null;
}) {
  const { c } = useTheme();
  const g = useGuardianT();
  const color = useCatColor();
  const now = useNow(20_000);
  const updated = live ? Date.parse(live.updatedAt) : 0;
  // The phone reports a new app within seconds and long sessions every 2 minutes.
  const fresh = !!live && live.screenOn && !!live.label && now - updated < 4 * 60_000;
  const minutes = fresh ? live!.sessionMin + Math.max(0, Math.floor((now - updated) / 60_000)) : 0;
  const limit =
    fresh && (live!.category === 'video' || live!.category === 'social')
      ? scrollLimit
      : fresh && live!.category === 'games'
        ? gamesLimit
        : null;
  const d = new Date(updated);

  return (
    <Card style={styles.gap}>
      <View style={styles.rowBetween}>
        <Text variant="overline">{g.nowTitle}</Text>
        {fresh ? (
          <View style={styles.liveDot}>
            <View style={[styles.dot, { backgroundColor: c.success }]} />
            <Text variant="caption" color="success">
              LIVE
            </Text>
          </View>
        ) : null}
      </View>
      {fresh ? (
        <View style={styles.nowRow}>
          <View style={[styles.appIcon, { backgroundColor: color(live!.category) }]}>
            <CatIcon cat={live!.category} size={24} color="#FFFFFF" />
          </View>
          <View style={styles.flex}>
            <Text variant="title" numberOfLines={1}>
              {live!.label}
            </Text>
            <Text variant="subhead">
              {g.cats[live!.category ?? 'other']}
              {minutes > 0 ? ` · ${g.straight(minutes)}` : ''}
            </Text>
          </View>
          {limit ? <Chip label={g.breakIn(limit - minutes)} kind={limit - minutes <= 2 ? 'accent' : 'tinted'} /> : null}
        </View>
      ) : (
        <View style={styles.nowRow}>
          <View style={[styles.appIcon, { backgroundColor: c.inset }]}>
            <DeviceMobile size={24} weight="fill" color={c.textTertiary} />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">{g.nowIdle}</Text>
            <Text variant="subhead">
              {live ? g.lastSeen(formatClock(d.getHours() * 60 + d.getMinutes())) : childName}
            </Text>
          </View>
        </View>
      )}
    </Card>
  );
}

type Range = 'today' | 'yesterday' | 'week';
type Row = { key: string; label: string; category: AppCategory; minutes: number };

/** Minutes per app as horizontal bars, colored by kind of app. */
export function AppsCard({ apps, childName }: { apps: AppDay[]; childName: string }) {
  const { c } = useTheme();
  const g = useGuardianT();
  const color = useCatColor();
  const [range, setRange] = useState<Range>('today');
  const now = useNow(60_000);

  const rows = useMemo(() => {
    const today = todayKey(new Date(now));
    const yesterday = todayKey(new Date(now - DAY_MS));
    const pick = apps.filter((a) => (range === 'today' ? a.day === today : range === 'yesterday' ? a.day === yesterday : true));
    const byApp = new Map<string, Row>();
    for (const a of pick) {
      const r = byApp.get(a.package) ?? { key: a.package, label: a.label, category: a.category, minutes: 0 };
      r.minutes += a.minutes;
      byApp.set(a.package, r);
    }
    const sorted = [...byApp.values()].sort((a, b) => b.minutes - a.minutes);
    const top = sorted.slice(0, 7);
    const rest = sorted.slice(7).reduce((s, r) => s + r.minutes, 0);
    if (rest > 0) top.push({ key: 'other', label: g.otherApps, category: 'other', minutes: rest });
    return top;
  }, [apps, range, now, g.otherApps]);

  const total = rows.reduce((s, r) => s + r.minutes, 0);
  const max = Math.max(1, ...rows.map((r) => r.minutes));
  const byCat = (['video', 'social', 'games', 'study', 'other'] as AppCategory[])
    .map((cat) => ({ cat, minutes: rows.filter((r) => r.category === cat).reduce((s, r) => s + r.minutes, 0) }))
    .filter((x) => x.minutes > 0);

  return (
    <Card style={styles.gap}>
      <View style={styles.rowBetween}>
        <Text variant="headline">{g.appsTitle}</Text>
        {total > 0 ? <Text variant="headline">{formatDuration(total)}</Text> : null}
      </View>
      <SegmentedControl<Range>
        options={[
          { value: 'today', label: g.today },
          { value: 'yesterday', label: g.yesterday },
          { value: 'week', label: g.week },
        ]}
        value={range}
        onChange={setRange}
        compact
      />
      {rows.length === 0 ? (
        <EmptyState title={g.noApps} subtitle={g.noAppsSub(childName)} expression="curious" />
      ) : (
        <>
          {/* Share of time by kind of app. */}
          <View style={[styles.stack, { backgroundColor: c.inset }]} accessibilityLabel={g.appsTitle}>
            {byCat.map((x) => (
              <View key={x.cat} style={{ flex: x.minutes, backgroundColor: color(x.cat) }} />
            ))}
          </View>
          <View style={styles.legend}>
            {byCat.map((x) => (
              <View key={x.cat} style={styles.legendItem}>
                <View style={[styles.dot, { backgroundColor: color(x.cat) }]} />
                <Text variant="caption">
                  {g.cats[x.cat]} {formatDuration(x.minutes)}
                </Text>
              </View>
            ))}
          </View>
          {rows.map((r) => (
            <View
              key={r.key}
              style={styles.appRow}
              accessible
              accessibilityLabel={`${r.label}, ${formatDuration(r.minutes)}`}
            >
              <View style={[styles.smallIcon, { backgroundColor: color(r.category) }]}>
                <CatIcon cat={r.category} size={14} color="#FFFFFF" />
              </View>
              <View style={styles.flex}>
                <View style={styles.rowBetween}>
                  <Text variant="subhead" color="text" numberOfLines={1} style={styles.flex}>
                    {r.label}
                  </Text>
                  <Text variant="subhead" color="text">
                    {formatDuration(r.minutes)}
                  </Text>
                </View>
                <View style={[styles.track, { backgroundColor: c.inset }]}>
                  <View
                    style={[styles.bar, { width: `${Math.max(3, (r.minutes / max) * 100)}%`, backgroundColor: color(r.category) }]}
                  />
                </View>
              </View>
            </View>
          ))}
        </>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  gap: { gap: 12 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  liveDot: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  nowRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  appIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  smallIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  stack: { flexDirection: 'row', height: 12, borderRadius: radius.sm, overflow: 'hidden' },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  appRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  track: { height: 8, borderRadius: 4, marginTop: 6, overflow: 'hidden' },
  bar: { height: 8, borderRadius: 4 },
});

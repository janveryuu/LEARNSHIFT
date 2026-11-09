import { useEffect, useState } from 'react';
import { Pressable, Share, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import {
  AppWindow,
  CaretDown,
  CaretLeft,
  ChatsCircle,
  Clock,
  DeviceMobile,
  Eye,
  EyeSlash,
  Globe,
  Keyboard,
  LockOpen,
  Monitor,
  Timer,
} from 'phosphor-react-native';

import { Screen } from '@/components/student/Screen';
import { Card, LargeTitleHeader, ListGroup, NavBar, PillButton, Stagger, Text, Toggle } from '@/components/ui';
import { haptic } from '@/design/haptics';
import { spring } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useT } from '@/i18n/useT';
import { IS_PITCH } from '@/lib/config';
import { exportMyData } from '@/services/backend/api';
import { useAuth } from '@/store/useAuth';
import { useAppStore } from '@/store/useAppStore';

export default function Privacy() {
  const { c } = useTheme();
  const t = useT();
  const paused = useAppStore((s) => s.paused);
  const [open, setOpen] = useState(false);
  const [exported, setExported] = useState(false);
  const seesIcons = [Clock, Timer, AppWindow, LockOpen];
  const neverIcons = [ChatsCircle, Monitor, Globe, Keyboard];

  const name = useAppStore((s) => s.studentName);
  const answers = useAppStore((s) => s.answers);
  const grade = useAuth((s) => s.profile?.grade ?? (IS_PITCH ? 8 : null));

  const exportData = async () => {
    const s = useAppStore.getState();
    const data = IS_PITCH
      ? {
          profile: { name: 'Mika', grade: 8, section: 'Sampaguita' },
          mastery: s.mastery,
          nudges: s.nudges.map((n) => ({ at: n.at, level: n.level, response: n.response })),
          coins: s.coins,
          note: 'Usage metadata stays on this phone. No messages, screens or browsing are ever collected.',
        }
      : await exportMyData();
    setExported(true);
    Share.share({ message: JSON.stringify(data, null, 2) }).catch(() => {});
  };
  const holdItems = t.privacy.holdItems.map(([k, v], idx) =>
    idx === 0 ? [k, [name, grade ? `Grade ${grade}` : ''].filter(Boolean).join(' · ')] : idx === 2 ? [k, `${answers}`] : [k, v],
  );

  let i = 0;
  return (
    <Screen
      header={
        <NavBar
          onBack={() => router.back()}
          backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
          backLabel={t.common.back}
        />
      }
    >
      <LargeTitleHeader title={t.privacy.title} style={styles.title} />

      <Stagger index={i++} style={styles.row}>
        <Card style={[styles.flex, styles.gap]}>
          <View style={styles.colHead}>
            <Eye size={18} weight="fill" color={c.success} />
            <Text variant="headline" numberOfLines={2} style={styles.flex}>
              {t.privacy.sees}
            </Text>
          </View>
          {t.privacy.seesList.map((s, k) => {
            const Icon = seesIcons[k];
            return (
              <View key={s} style={[styles.item, { backgroundColor: c.inset }]}>
                <Icon size={16} weight="bold" color={c.text} />
                <Text variant="subhead" color="text" style={styles.flex} numberOfLines={1}>
                  {s}
                </Text>
              </View>
            );
          })}
        </Card>
        <Card style={[styles.flex, styles.gap]}>
          <View style={styles.colHead}>
            <EyeSlash size={18} weight="fill" color={c.danger} />
            <Text variant="headline" numberOfLines={2} style={styles.flex}>
              {t.privacy.never}
            </Text>
          </View>
          {t.privacy.neverList.map((s, k) => {
            const Icon = neverIcons[k];
            return (
              <View key={s} style={[styles.item, styles.never, { borderColor: c.hairline }]}>
                <Icon size={16} weight="bold" color={c.textTertiary} />
                <Text variant="subhead" style={[styles.flex, styles.strike]} numberOfLines={1}>
                  {s}
                </Text>
              </View>
            );
          })}
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.badge}>
          <View style={[styles.phone, { backgroundColor: c.accentTint }]}>
            <DeviceMobile size={26} weight="fill" color={c.accent} />
          </View>
          <View style={styles.flex}>
            <Text variant="headline">{t.privacy.onPhone}</Text>
            <Text variant="subhead">{t.privacy.onPhoneSub}</Text>
          </View>
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card padded={false}>
          <Pressable
            onPress={() => {
              haptic.select();
              setOpen((o) => !o);
            }}
            accessibilityRole="button"
            accessibilityState={{ expanded: open }}
            style={styles.expandHead}
          >
            <Text variant="headline" style={styles.flex}>
              {t.privacy.hold}
            </Text>
            <Caret open={open} />
          </Pressable>
          {open ? (
            <View style={styles.holdList}>
              {holdItems.map(([k, v]) => (
                <View key={k} style={[styles.holdRow, { borderColor: c.hairline }]}>
                  <Text variant="body" style={styles.flex}>
                    {k}
                  </Text>
                  <Text variant="subhead">{v}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <Card style={styles.gap}>
          <Text variant="headline">{t.privacy.who}</Text>
          {[
            [t.privacy.youSee, t.privacy.youWhat, c.tabProfile],
            [t.privacy.guardianSees, t.privacy.guardianWhat, c.success],
            [t.privacy.teacherSees, t.privacy.teacherWhat, c.tabInsights],
          ].map(([who, what, col]) => (
            <View key={who} style={styles.who}>
              <View style={[styles.dot, { backgroundColor: col }]} />
              <Text variant="body" style={styles.flex}>
                {who}
              </Text>
              <Text variant="subhead" color="text">
                {what}
              </Text>
            </View>
          ))}
        </Card>
      </Stagger>

      <Stagger index={i++}>
        <ListGroup>
          <View style={styles.pauseRow}>
            <View style={styles.flex}>
              <Text variant="body">{t.privacy.pause}</Text>
              {paused ? <Text variant="caption">{t.privacy.paused}</Text> : null}
            </View>
            <Toggle
              value={paused}
              onChange={(v) => useAppStore.getState().setPaused(v)}
              accessibilityLabel={t.privacy.pause}
            />
          </View>
        </ListGroup>
      </Stagger>

      <Stagger index={i++}>
        <PillButton
          label={exported ? t.privacy.exported : t.privacy.export}
          kind="secondary"
          size="lg"
          block
          onPress={exportData}
        />
      </Stagger>
    </Screen>
  );
}

function Caret({ open }: { open: boolean }) {
  const { c } = useTheme();
  const r = useSharedValue(open ? 1 : 0);
  useEffect(() => {
    r.set(withSpring(open ? 1 : 0, spring.snappy));
  }, [open, r]);
  const s = useAnimatedStyle(() => ({ transform: [{ rotate: `${r.get() * 180}deg` }] }));
  return (
    <Animated.View style={s}>
      <CaretDown size={18} weight="bold" color={c.textSecondary} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  title: { paddingHorizontal: 0, marginBottom: 8 },
  row: { flexDirection: 'row', gap: space.gap },
  gap: { gap: 10 },
  colHead: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 38,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
  },
  never: { borderWidth: 1 },
  strike: { textDecorationLine: 'line-through' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  phone: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  expandHead: { flexDirection: 'row', alignItems: 'center', padding: space.card, minHeight: 60 },
  holdList: { paddingHorizontal: space.card, paddingBottom: 8 },
  holdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  who: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 32 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pauseRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
});

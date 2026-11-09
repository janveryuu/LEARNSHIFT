import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { FlashList } from '@shopify/flash-list';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, ChatCircleDots, Lightning, LockKey, MoonStars } from 'phosphor-react-native';

import { Card, Chip, EmptyState, LargeTitleHeader, NavBar, Text } from '@/components/ui';
import type { NudgeEntry } from '@/data/seed';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { reasonText } from '@/hooks/useLive';
import { formatClock, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

/** Every nudge, the reason it fired, and what the learner chose. */
export default function Nudges() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const nudges = useAppStore((s) => s.nudges);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <NavBar
        onBack={() => router.back()}
        backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
        backLabel={t.common.back}
      />
      <FlashList
        data={nudges}
        keyExtractor={(n) => n.id}
        contentContainerStyle={{ paddingHorizontal: space.screen, paddingBottom: insets.bottom + 32 }}
        ListHeaderComponent={<LargeTitleHeader title={t.nudges.title} style={styles.title} />}
        ListEmptyComponent={<EmptyState title={t.nudges.empty} subtitle={t.nudges.emptySub} expression="happy" />}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
        renderItem={({ item }) => <Row n={item} />}
      />
    </View>
  );
}

function Row({ n }: { n: NudgeEntry }) {
  const { c } = useTheme();
  const t = useT();
  const d = new Date(n.at);
  const day = t.days.long[d.getDay()];
  const time = formatClock(d.getHours() * 60 + d.getMinutes());
  const meta = {
    checkin: { Icon: ChatCircleDots, color: c.warning },
    break: { Icon: Lightning, color: c.accent },
    winddown: { Icon: MoonStars, color: c.indigo },
    lock: { Icon: LockKey, color: c.tabProfile },
  }[n.level];
  const good = n.response === 'took' || n.response === 'followed';
  return (
    <Card
      style={styles.row}
      accessibilityLabel={`${t.nudge.levels[n.level]}, ${day} ${time}, ${t.nudges.resp[n.response]}`}
    >
      <View style={[styles.icon, { backgroundColor: meta.color + '22' }]}>
        <meta.Icon size={20} weight="fill" color={meta.color} />
      </View>
      <View style={styles.flex}>
        <View style={styles.head}>
          <Text variant="headline" style={styles.flex} numberOfLines={1}>
            {t.nudge.levels[n.level]}
          </Text>
          <Text variant="caption" tabular>
            {day} · {time}
          </Text>
        </View>
        <View style={styles.chips}>
          {n.reasons.slice(0, 3).map((r, i) => (
            <Chip key={i} label={reasonText(t, r)} kind="outline" style={styles.chip} />
          ))}
        </View>
        <Text variant="subhead" color={good ? 'success' : 'textSecondary'}>
          {t.nudges.resp[n.response]}
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  title: { paddingHorizontal: 0, marginBottom: 16 },
  sep: { height: space.gap },
  row: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 8 },
  chip: { height: 26, paddingHorizontal: 10 },
});

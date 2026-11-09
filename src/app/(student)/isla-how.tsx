import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Eye, Lightning, Plant } from 'phosphor-react-native';

import { Card, Coin, ProgressBar, SheetHeader, Text } from '@/components/ui';
import { BUILDINGS } from '@/data/seed';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

export default function IslaHow() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const insets = useSafeAreaInsets();
  const coins = useAppStore((s) => s.coins);
  const items = t.how.items;
  const total = items.reduce((a, [, n]) => a + n, 0);
  const colors = [c.accent, c.spark, c.indigo, c.success];
  const next = BUILDINGS.find((b) => b.unlockAt > coins);
  const prevAt = [...BUILDINGS].reverse().find((b) => b.unlockAt <= coins)?.unlockAt ?? 0;
  const icons = [Eye, Lightning, Plant];

  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <SheetHeader title={t.how.title} right={{ label: t.common.done, onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={[styles.body, { paddingBottom: insets.bottom + 24 }]}>
        <Card style={styles.gap}>
          <Text variant="headline">{t.how.greatDay}</Text>
          {items.map(([label, n], i) => (
            <View key={label} style={styles.item}>
              <View style={[styles.swatch, { backgroundColor: colors[i] }]} />
              <Text variant="body" style={styles.flex}>
                {label}
              </Text>
              <Coin size={16} />
              <Text variant="headline" tabular>
                +{n}
              </Text>
            </View>
          ))}
          <ProgressBar
            segments={items.map(([, n], i) => ({ value: n / (total * 1.1), color: colors[i] }))}
            height={12}
            accessibilityLabel={`${t.how.total} ${total}`}
          />
          <View style={[styles.item, styles.total, { borderColor: c.hairline }]}>
            <Text variant="headline" style={styles.flex}>
              {t.how.total}
            </Text>
            <Coin size={18} />
            <Text variant="title" tabular>
              +{total}
            </Text>
          </View>
        </Card>

        {next ? (
          <Card style={styles.gap}>
            <View style={styles.item}>
              <Text variant="headline" style={styles.flex}>
                {t.how.next(L(next.name))}
              </Text>
              <Text variant="subhead" tabular>
                {next.unlockAt - coins} {t.common.coins}
              </Text>
            </View>
            <ProgressBar progress={(coins - prevAt) / (next.unlockAt - prevAt)} color={c.spark} height={10} />
          </Card>
        ) : null}

        <Card style={styles.gap}>
          <Text variant="headline">{t.how.loop}</Text>
          {t.how.loopRows.map(([k, v], i) => {
            const Icon = icons[i];
            return (
              <View key={k} style={styles.loop}>
                <View style={[styles.loopIcon, { backgroundColor: c.accentTint }]}>
                  <Icon size={20} weight="fill" color={c.accent} />
                </View>
                <View style={styles.flex}>
                  <Text variant="headline">{k}</Text>
                  <Text variant="subhead">{v}</Text>
                </View>
              </View>
            );
          })}
        </Card>
        <Text variant="caption" align="center">
          {t.how.never}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  gap: { gap: 12 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  swatch: { width: 10, height: 10, borderRadius: 3 },
  total: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12 },
  loop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  loopIcon: { width: 40, height: 40, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
});

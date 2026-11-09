import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CaretLeft, CheckCircle, Hammer, LockSimple, Question } from 'phosphor-react-native';

import { IslaScene } from '@/components/isla/IslaScene';
import { BottomSheet, Card, CoinCounter, IconButton, NavBar, PillButton, ProgressBar, Text } from '@/components/ui';
import { BUILDINGS, type BuildingId } from '@/data/seed';
import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { useL, useT } from '@/i18n/useT';
import { useAppStore } from '@/store/useAppStore';

export default function Isla() {
  const { c } = useTheme();
  const t = useT();
  const L = useL();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const coins = useAppStore((s) => s.coins);
  const built = useAppStore((s) => s.built);
  const [sheet, setSheet] = useState(false);
  const [info, setInfo] = useState<BuildingId | null>(null);
  const [fresh, setFresh] = useState<BuildingId | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const sceneW = Math.min(width, 640);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(id);
  }, [toast]);

  const next = BUILDINGS.find((b) => b.unlockAt > coins);
  const prevAt = [...BUILDINGS].reverse().find((b) => b.unlockAt <= coins)?.unlockAt ?? 0;
  const infoB = BUILDINGS.find((b) => b.id === info);

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: insets.top }]}>
      <NavBar
        onBack={() => router.back()}
        backIcon={<CaretLeft size={20} weight="bold" color={c.text} />}
        backLabel={t.common.back}
        right={
          <>
            <CoinCounter value={coins} />
            <IconButton
              icon={<Question size={20} weight="bold" color={c.text} />}
              accessibilityLabel={t.isla.how}
              onPress={() => router.push('/isla-how')}
            />
          </>
        }
      />
      <Text variant="largeTitle" style={styles.title}>
        {t.isla.title}
      </Text>
      <View style={styles.scene}>
        <IslaScene
          built={built}
          width={sceneW}
          interactive
          fresh={fresh}
          onBuildingPress={(id) => {
            haptic.select();
            setInfo(id);
          }}
        />
        <Text variant="caption" align="center">
          {t.isla.hint}
        </Text>
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
        {next ? (
          <Card style={styles.gap}>
            <View style={styles.rowBetween}>
              <Text variant="headline">{t.how.next(L(next.name))}</Text>
              <Text variant="subhead" tabular>
                {coins.toLocaleString('en-US')} / {next.unlockAt.toLocaleString('en-US')}
              </Text>
            </View>
            <ProgressBar progress={(coins - prevAt) / (next.unlockAt - prevAt)} color={c.spark} />
          </Card>
        ) : null}
        <View style={styles.row}>
          <PillButton label={`+ ${t.isla.build}`} size="lg" style={styles.flex} block onPress={() => setSheet(true)} />
          <PillButton
            label={t.isla.how}
            kind="secondary"
            size="lg"
            style={styles.flex}
            block
            onPress={() => router.push('/isla-how')}
          />
        </View>
      </View>

      {toast ? (
        <View style={[styles.toast, { backgroundColor: c.tileDark, top: insets.top + 64 }]} pointerEvents="none">
          <Text variant="subhead" color={c.tileDarkText}>
            {toast}
          </Text>
        </View>
      ) : null}

      <BottomSheet visible={sheet} onClose={() => setSheet(false)} accessibilityLabel={t.isla.sheet}>
        <View style={styles.sheetHead}>
          <Text variant="title">{t.isla.sheet}</Text>
          <Text variant="subhead">{t.isla.sheetSub}</Text>
        </View>
        <ScrollView style={styles.list} contentContainerStyle={styles.gap}>
          {BUILDINGS.map((b) => {
            const isBuilt = built.includes(b.id);
            const unlocked = coins >= b.unlockAt;
            return (
              <View key={b.id} style={[styles.buildRow, { backgroundColor: c.inset }]}>
                <View style={styles.flex}>
                  <Text variant="headline">{L(b.name)}</Text>
                  <Text variant="caption">
                    {t.isla.earnedBy}: {L(b.earnedBy)}
                  </Text>
                </View>
                {isBuilt ? (
                  <View style={styles.status}>
                    <CheckCircle size={18} weight="fill" color={c.success} />
                    <Text variant="subhead" color="success">
                      {t.isla.built}
                    </Text>
                  </View>
                ) : unlocked ? (
                  <PillButton
                    label={t.isla.buildIt}
                    size="sm"
                    icon={<Hammer size={14} weight="fill" color={c.onAccent} />}
                    onPress={() => {
                      haptic.success();
                      useAppStore.getState().build(b.id);
                      setSheet(false);
                      setFresh(b.id);
                      setToast(t.isla.newBuilt(L(b.name)));
                    }}
                  />
                ) : (
                  <View style={styles.status}>
                    <LockSimple size={16} weight="fill" color={c.textTertiary} />
                    <Text variant="subhead" color="textTertiary">
                      {t.isla.notYet(b.unlockAt - coins)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      </BottomSheet>

      <BottomSheet visible={!!info} onClose={() => setInfo(null)} accessibilityLabel={infoB ? L(infoB.name) : ''}>
        {infoB ? (
          <View style={styles.infoBody}>
            <Text variant="title">{L(infoB.name)}</Text>
            <Text variant="overline">{t.isla.earnedBy}</Text>
            <Text variant="headline" color="accent">
              {L(infoB.earnedBy)}
            </Text>
            <PillButton label={t.common.close} kind="secondary" block onPress={() => setInfo(null)} />
          </View>
        ) : null}
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  title: { paddingHorizontal: space.screen, marginBottom: 4 },
  scene: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 6 },
  bottom: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  gap: { gap: 10 },
  row: { flexDirection: 'row', gap: space.gap },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  toast: {
    position: 'absolute',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: radius.pill,
  },
  sheetHead: { gap: 2, marginBottom: 12 },
  list: { maxHeight: 420 },
  buildRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: radius.inset },
  status: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  infoBody: { gap: 8, paddingBottom: 8 },
});

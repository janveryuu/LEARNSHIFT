import { useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card, PillButton, SegmentedControl, SheetHeader, Text, WheelGroup, WheelPicker } from '@/components/ui';
import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';
import { fontFor } from '@/design/typography';
import { formatClock, useT } from '@/i18n/useT';
import { useAppStore, type BedtimeDays } from '@/store/useAppStore';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
const AMPM = ['AM', 'PM'];

/** Nights the window applies to, Sun → Sat. School nights are the nights before school days. */
const NIGHTS: Record<BedtimeDays, boolean[]> = {
  school: [true, true, true, true, true, false, false],
  weekends: [false, false, false, false, false, true, true],
  every: [true, true, true, true, true, true, true],
};

const toParts = (m: number) => {
  const h24 = Math.floor(m / 60);
  return { h: (h24 % 12 || 12) - 1, min: Math.round((m % 60) / 5) % 12, pm: h24 >= 12 ? 1 : 0 };
};
const fromParts = (h: number, min: number, pm: number) => (((h + 1) % 12) + pm * 12) * 60 + min * 5;

export default function BedtimeEditor() {
  const { c } = useTheme();
  const t = useT();
  const insets = useSafeAreaInsets();
  const saved = useAppStore((s) => s.bedtime);
  const savedDays = useAppStore((s) => s.bedtimeDays);
  const [which, setWhich] = useState<'start' | 'end'>('start');
  const [times, setTimes] = useState(saved);
  const [days, setDays] = useState<BedtimeDays>(savedDays);
  const parts = toParts(times[which]);
  const set = (p: Partial<typeof parts>) => {
    const n = { ...parts, ...p };
    setTimes((tm) => ({ ...tm, [which]: fromParts(n.h, n.min, n.pm) }));
  };

  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingBottom: insets.bottom + 16 }]}>
      <SheetHeader title={t.bedtime.title} />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.summary}>
          <Text variant="display" tabular style={styles.big}>
            {formatClock(times.start).replace(/ (AM|PM)/, '')}
          </Text>
          <Text variant="displayUnit">{formatClock(times.start).slice(-2)}</Text>
          <Text variant="title" color="textTertiary" style={styles.arrow}>
            →
          </Text>
          <Text variant="title" tabular>
            {formatClock(times.end)}
          </Text>
        </View>

        <Card style={styles.gap}>
          <SegmentedControl<'start' | 'end'>
            options={[
              { value: 'start', label: t.bedtime.starts },
              { value: 'end', label: t.bedtime.ends },
            ]}
            value={which}
            onChange={setWhich}
          />
          <WheelGroup key={which}>
            <WheelPicker items={HOURS} index={parts.h} onChange={(h) => set({ h })} accessibilityLabel="Hour" />
            <WheelPicker
              items={MINUTES}
              index={parts.min}
              onChange={(min) => set({ min })}
              accessibilityLabel="Minute"
            />
            <WheelPicker items={AMPM} index={parts.pm} onChange={(pm) => set({ pm })} accessibilityLabel="AM or PM" />
          </WheelGroup>
        </Card>

        <Card style={styles.gap}>
          <SegmentedControl<BedtimeDays>
            options={[
              { value: 'school', label: t.bedtime.school },
              { value: 'weekends', label: t.bedtime.weekends },
              { value: 'every', label: t.bedtime.every },
            ]}
            value={days}
            onChange={setDays}
            compact
          />
          <View style={styles.days}>
            {t.days.narrow.map((d, i) => {
              const on = NIGHTS[days][i];
              return (
                <View
                  key={i}
                  style={[styles.day, { backgroundColor: on ? c.accent : c.inset }]}
                  accessible
                  accessibilityLabel={`${t.days.long[i]} ${on ? t.common.on : t.common.off}`}
                >
                  <Text variant="subhead" color={on ? 'onAccent' : 'textSecondary'} style={fontFor(700)}>
                    {d}
                  </Text>
                </View>
              );
            })}
          </View>
          <Text variant="caption" align="center">
            {t.bedtime.hint}
          </Text>
        </Card>
      </ScrollView>
      <View style={styles.footer}>
        <PillButton
          label={t.common.save}
          size="lg"
          block
          onPress={() => {
            useAppStore.getState().setBedtime(times, days);
            router.back();
          }}
        />
        <PillButton label={t.common.cancel} kind="secondary" size="lg" block onPress={() => router.back()} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  body: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
  summary: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'center', gap: 4, paddingVertical: 8 },
  big: { fontSize: 48, lineHeight: 52 },
  arrow: { marginHorizontal: 8, marginBottom: 4 },
  gap: { gap: 14 },
  days: { flexDirection: 'row', justifyContent: 'space-between' },
  day: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: space.screen,
    gap: 10,
    paddingTop: 10,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
  },
});

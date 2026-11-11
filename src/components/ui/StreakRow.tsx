import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { Moon } from 'phosphor-react-native';

import { PatySpark, type SparkState } from '@/components/mascot/PatySpark';
import { haptic } from '@/design/haptics';
import { nativeOnly } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useT } from '@/i18n/useT';

import { Text } from './Text';

export type StreakDay = {
  state: SparkState;
  lateNight?: boolean;
  /** Popover text, e.g. "Tue · 3 breaks · off at 10:04 PM". */
  info?: string;
};

type Props = { days: readonly StreakDay[] };

/** Su–Sa row of Paty spark faces on a soft tray, green dot under today. */
export function StreakRow({ days }: Props) {
  const { c } = useTheme();
  const t = useT();
  const [open, setOpen] = useState<number | null>(null);
  const [w, setW] = useState(0);
  const POP = 132;
  const popLeft = open == null ? 0 : Math.max(0, Math.min(w - POP, ((open + 0.5) / 7) * w - POP / 2));

  return (
    <View onLayout={(e) => setW(e.nativeEvent.layout.width)}>
      <View style={styles.labels}>
        {t.days.short.map((l, i) => (
          <Text key={i} variant="subhead" color="text" align="center" style={styles.cell}>
            {l}
          </Text>
        ))}
      </View>

      <View style={styles.trayWrap}>
        <View style={[styles.tray, { backgroundColor: c.inset }]} />
        <View style={styles.faces}>
          {days.map((d, i) => (
            <Pressable
              key={i}
              style={styles.cell}
              accessibilityRole="button"
              accessibilityLabel={`${t.days.long[i]}${d.info ? ', ' + d.info : ''}`}
              onPress={() => {
                haptic.select();
                setOpen(open === i ? null : i);
              }}
              hitSlop={4}
            >
              <View style={styles.face}>
                <PatySpark state={d.state} size={40} />
                {d.lateNight ? (
                  <View style={[styles.moon, { backgroundColor: c.card }]}>
                    <Moon size={11} weight="fill" color={c.indigo} />
                  </View>
                ) : null}
              </View>
            </Pressable>
          ))}
        </View>
      </View>

      <View style={styles.dots}>
        {days.map((d, i) => (
          <View key={i} style={styles.cell}>
            {d.state === 'today' ? <View style={[styles.dot, { backgroundColor: c.success }]} /> : null}
          </View>
        ))}
      </View>

      {open != null ? (
        <Animated.View
          entering={nativeOnly(FadeIn.duration(140))}
          exiting={nativeOnly(FadeOut.duration(120))}
          style={[styles.popover, { backgroundColor: c.tileDark, left: popLeft, width: POP }]}
          pointerEvents="none"
        >
          <Text variant="caption" color={c.tileDarkText} numberOfLines={2} align="center">
            {days[open].info ?? t.streak.upcoming}
          </Text>
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  labels: { flexDirection: 'row', marginBottom: 6 },
  cell: { flex: 1, alignItems: 'center' },
  trayWrap: { justifyContent: 'center' },
  tray: { position: 'absolute', left: 4, right: 4, height: 30, borderRadius: radius.pill },
  faces: { flexDirection: 'row' },
  face: { width: 40, height: 40 },
  moon: {
    position: 'absolute',
    right: -4,
    top: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: { flexDirection: 'row', height: 12, alignItems: 'center', marginTop: 4 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  popover: {
    position: 'absolute',
    top: -34,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.sm,
  },
});

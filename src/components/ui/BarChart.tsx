import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withDelay, withSpring } from 'react-native-reanimated';

import { spring, timing, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

import { Text } from './Text';

type Props = {
  values: readonly number[];
  labels: readonly string[];
  /** Index drawn in the accent (today). */
  highlight?: number;
  height?: number;
  /** Optional small label above the highlighted bar, e.g. "2h 41m". */
  highlightLabel?: string;
  max?: number;
  accessibilityLabel?: string;
};

/** Capsule bar chart: gray bars, today in accent. Bars grow in with a spring. */
export function BarChart({ values, labels, highlight, height = 120, highlightLabel, max, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const top = max ?? Math.max(1, ...values);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <View style={[styles.bars, { height: height + 18 }]}>
        {values.map((v, i) => (
          <View key={i} style={styles.col}>
            {i === highlight && highlightLabel ? (
              <Text variant="caption" color="accent" style={styles.topLabel}>
                {highlightLabel}
              </Text>
            ) : null}
            <Bar index={i} ratio={v / top} height={height} color={i === highlight ? c.accent : c.chartIdle} />
          </View>
        ))}
      </View>
      <View style={styles.labels}>
        {labels.map((l, i) => (
          <Text
            key={i}
            variant="caption"
            color={i === highlight ? 'text' : 'textSecondary'}
            align="center"
            style={styles.label}
          >
            {l}
          </Text>
        ))}
      </View>
    </View>
  );
}

function Bar({ index, ratio, height, color }: { index: number; ratio: number; height: number; color: string }) {
  const reduced = useReducedMotion();
  const target = Math.max(10, ratio * height);
  const h = useSharedValue(reduced ? target : 10);
  useEffect(() => {
    h.set(reduced ? target : withDelay(index * timing.stagger, withSpring(target, spring.smooth)));
  }, [target, index, reduced, h]);
  const style = useAnimatedStyle(() => ({ height: h.get() }));
  return <Animated.View style={[styles.bar, { backgroundColor: color }, style]} />;
}

const styles = StyleSheet.create({
  bars: { flexDirection: 'row', alignItems: 'flex-end', gap: 8 },
  col: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  bar: { width: '100%', maxWidth: 40, borderRadius: 999 },
  topLabel: { marginBottom: 4, fontSize: 10 },
  labels: { flexDirection: 'row', gap: 8, marginTop: 6 },
  label: { flex: 1 },
});

import { useEffect, useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

type Segment = { value: number; color: string };

type Props = {
  /** 0–1. Ignored when `segments` is given. */
  progress?: number;
  /** Multi-color fill (values are fractions of the whole). */
  segments?: readonly Segment[];
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Starting fill (0–1) before springing to `progress`. Default 0. */
  initial?: number;
};

export function ProgressBar({ progress = 0, segments, color, height = 8, style, accessibilityLabel, initial }: Props) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const total = segments ? segments.reduce((a, s) => a + s.value, 0) : progress;
  const reduced = useReducedMotion();
  const p = useSharedValue(reduced ? total : (initial ?? 0));
  useEffect(() => {
    const v = Math.max(0, Math.min(1, total));
    p.set(reduced ? v : withSpring(v, spring.smooth));
  }, [total, reduced, p]);

  const fill = useAnimatedStyle(() => ({ width: p.get() * w }));
  const onLayout = (e: LayoutChangeEvent) => setW(e.nativeEvent.layout.width);

  return (
    <View
      onLayout={onLayout}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(total * 100) }}
      style={[styles.track, { height, borderRadius: height / 2, backgroundColor: c.inset }, style]}
    >
      <Animated.View style={[styles.fill, { borderRadius: height / 2 }, fill]}>
        {segments ? (
          <View style={[styles.segRow, { width: total > 0 ? w * Math.min(1, total) : 0 }]}>
            {segments.map(({ value: share, color: segColor }, i) => (
              <View
                key={i}
                style={{
                  flex: share,
                  backgroundColor: segColor,
                  marginRight: i < segments.length - 1 ? 2 : 0,
                }}
              />
            ))}
          </View>
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: color ?? c.accent }]} />
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { overflow: 'hidden', width: '100%' },
  fill: { height: '100%', overflow: 'hidden' },
  segRow: { height: '100%', flexDirection: 'row' },
});

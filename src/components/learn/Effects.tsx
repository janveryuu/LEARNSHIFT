import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { Coin } from '@/components/ui';
import { ease, spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

/** Small radial burst of spark dots. Bump `play` to fire again. */
export function SparkBurst({ play, size = 120, style }: { play: number; size?: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const p = useSharedValue(0);
  useEffect(() => {
    if (play === 0 || reduced) return;
    p.set(0);
    p.set(withSpring(1, { ...spring.bouncy, overshootClamping: true }));
  }, [play, reduced, p]);
  const colors = [c.spark, c.accent, c.success, c.sparkDeep];
  return (
    <View
      pointerEvents="none"
      style={[styles.burst, { width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2 }, style]}
    >
      {Array.from({ length: 10 }, (_, i) => (
        <Particle key={i} i={i} p={p} r={size / 2} color={colors[i % colors.length]} />
      ))}
    </View>
  );
}

function Particle({ i, p, r, color }: { i: number; p: SharedValue<number>; r: number; color: string }) {
  const a = (i / 10) * Math.PI * 2 + (i % 2) * 0.3;
  const dist = r * (0.6 + (i % 3) * 0.15);
  const s = useAnimatedStyle(() => {
    const v = p.get();
    return {
      opacity: v === 0 ? 0 : interpolate(v, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(a) * dist * v },
        { translateY: Math.sin(a) * dist * v },
        { scale: interpolate(v, [0, 0.3, 1], [0.4, 1, 0.6]) },
      ],
    };
  });
  return (
    <Animated.View
      style={[styles.particle, { backgroundColor: color, left: r - 4, top: r - 4 }, i % 2 ? styles.diamond : null, s]}
    />
  );
}

type Pt = { x: number; y: number };

/**
 * Coins fly from `from` to `to` on a curved path, staggered, then call
 * `onArrive` once per coin so the counter can tick up with them.
 */
export function CoinFly({
  play,
  from,
  to,
  count = 6,
  onArrive,
}: {
  play: number;
  from: Pt | null;
  to: Pt | null;
  count?: number;
  onArrive?: (i: number) => void;
}) {
  if (!play || !from || !to) return null;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: count }, (_, i) => (
        <FlyingCoin key={`${play}-${i}`} i={i} from={from} to={to} onArrive={onArrive} />
      ))}
    </View>
  );
}

function FlyingCoin({ i, from, to, onArrive }: { i: number; from: Pt; to: Pt; onArrive?: (i: number) => void }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    const done = (finished?: boolean) => {
      'worklet';
      if (finished && onArrive) scheduleOnRN(onArrive, i);
    };
    t.set(withDelay(i * 70, withTiming(1, { duration: reduced ? 1 : 720, easing: ease.inOut }, done)));
  }, [i, onArrive, reduced, t]);

  // Control point above and between the two points gives the arc.
  const cx = (from.x + to.x) / 2 + (i % 2 ? 30 : -30);
  const cy = Math.min(from.y, to.y) - 90 - i * 6;
  const s = useAnimatedStyle(() => {
    const v = t.get();
    const u = 1 - v;
    const x = u * u * from.x + 2 * u * v * cx + v * v * to.x;
    const y = u * u * from.y + 2 * u * v * cy + v * v * to.y;
    return {
      opacity: v === 0 || v === 1 ? 0 : 1,
      transform: [
        { translateX: x - 11 },
        { translateY: y - 11 },
        { scale: interpolate(v, [0, 0.5, 1], [0.7, 1.15, 0.8]) },
      ],
    };
  });
  return (
    <Animated.View style={[styles.coin, s]}>
      <Coin size={22} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  burst: { position: 'absolute', left: '50%', top: '50%' },
  particle: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
  diamond: { borderRadius: 1, transform: [{ rotate: '45deg' }] },
  coin: { position: 'absolute', left: 0, top: 0 },
});

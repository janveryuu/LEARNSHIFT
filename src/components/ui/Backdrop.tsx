import { useEffect, useId } from 'react';
import { StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Pattern, RadialGradient, Rect, Stop } from 'react-native-svg';

import { ease, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

/** Sparkles sit near the edges so they never sit behind text or buttons. */
const SPARKLES: { x: `${number}%`; y: `${number}%`; s: number; tone: 0 | 1 | 2; d: number }[] = [
  { x: '8%', y: '13%', s: 3, tone: 0, d: 0 },
  { x: '86%', y: '9%', s: 4, tone: 1, d: 700 },
  { x: '91%', y: '40%', s: 3, tone: 2, d: 1400 },
  { x: '6%', y: '70%', s: 4, tone: 1, d: 300 },
  { x: '10%', y: '84%', s: 3, tone: 2, d: 1100 },
  { x: '88%', y: '76%', s: 3, tone: 0, d: 1800 },
  { x: '62%', y: '4%', s: 2, tone: 2, d: 2200 },
];

/**
 * Warm "study desk" backdrop for onboarding: a cream-to-peach wash, a faint
 * pixel grid that echoes Paty's sprite, a soft glow behind the mascot and a
 * few slow pixel sparkles. Low contrast by design; content stays on top.
 */
export function Backdrop({ glowY = 0.36 }: { glowY?: number }) {
  const { c, isNight } = useTheme();
  const id = useId().replace(/[^a-zA-Z0-9]/g, '');
  const wash: [string, string, string] = isNight
    ? ['#0D1020', '#141432', '#211A33']
    : ['#FFF8EF', '#FDEEDD', '#F9DCC3'];
  const glow = isNight ? '#F2A65A' : '#FFD9A8';
  const dot = isNight ? 'rgba(236,232,225,0.06)' : 'rgba(200,64,15,0.07)';
  const tones = isNight ? [c.spark, c.accent, '#8FA8F5'] : [c.spark, c.accent, '#2E55B8'];

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <LinearGradient colors={wash} locations={[0, 0.55, 1]} style={StyleSheet.absoluteFill} />
      <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern id={`grid${id}`} patternUnits="userSpaceOnUse" width={24} height={24}>
            <Rect x={11} y={11} width={2} height={2} fill={dot} />
          </Pattern>
          <RadialGradient id={`glow${id}`} cx="50%" cy={`${glowY * 100}%`} rx="60%" ry="34%" fx="50%" fy={`${glowY * 100}%`}>
            <Stop offset="0" stopColor={glow} stopOpacity={isNight ? 0.22 : 0.75} />
            <Stop offset="1" stopColor={glow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#grid${id})`} />
        <Rect width="100%" height="100%" fill={`url(#glow${id})`} />
      </Svg>
      {SPARKLES.map((p, i) => (
        <Sparkle key={i} x={p.x} y={p.y} unit={p.s} color={tones[p.tone]} delay={p.d} />
      ))}
    </View>
  );
}

/** A 5-pixel "+" sparkle that twinkles and drifts a little. */
function Sparkle({
  x,
  y,
  unit,
  color,
  delay,
}: {
  x: `${number}%`;
  y: `${number}%`;
  unit: number;
  color: string;
  delay: number;
}) {
  const reduced = useReducedMotion();
  const v = useSharedValue(0.6);
  useEffect(() => {
    if (reduced) return;
    v.set(
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 1600, easing: ease.inOut }),
            withTiming(0.2, { duration: 1600, easing: ease.inOut }),
          ),
          -1,
        ),
      ),
    );
  }, [reduced, delay, v]);
  const s = useAnimatedStyle(() => ({
    opacity: v.get() * 0.8,
    transform: [{ translateY: (1 - v.get()) * 4 }, { scale: 0.85 + v.get() * 0.15 }],
  }));
  const u = unit * 1.6;
  return (
    <Animated.View style={[styles.sparkle, { left: x, top: y, width: u * 3, height: u * 3 }, s]}>
      <View style={{ position: 'absolute', left: u, top: 0, width: u, height: u * 3, backgroundColor: color }} />
      <View style={{ position: 'absolute', left: 0, top: u, width: u * 3, height: u, backgroundColor: color }} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  sparkle: { position: 'absolute' },
});

import { useEffect, useId, type ReactNode } from 'react';
import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { Flame } from 'phosphor-react-native';

import { Tarsi, type Expression } from '@/components/mascot/Tarsi';
import { ease, enterAt, spring, timing, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { useT } from '@/i18n/useT';

import { AnimatedNumber } from './AnimatedNumber';
import { PillButton } from './PillButton';
import { Text } from './Text';

/** Coin glyph: spark-gold disc with a sampaguita-style star. Original art. */
export function Coin({ size = 18 }: { size?: number }) {
  const { c } = useTheme();
  const id = 'coin' + useId().replace(/[^a-zA-Z0-9]/g, '');
  return (
    <Svg width={size} height={size} viewBox="0 0 20 20">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.spark} />
          <Stop offset="1" stopColor={c.sparkDeep} />
        </LinearGradient>
      </Defs>
      <Circle cx={10} cy={10} r={9} fill={`url(#${id})`} />
      <Circle cx={10} cy={10} r={6.6} fill="none" stroke="#FFFFFF" strokeOpacity={0.45} strokeWidth={1.2} />
      <Path
        d="M10 5.6 L11.2 8.7 L14.4 8.9 L11.9 10.9 L12.7 14 L10 12.3 L7.3 14 L8.1 10.9 L5.6 8.9 L8.8 8.7 Z"
        fill="#FFFFFF"
        fillOpacity={0.9}
      />
    </Svg>
  );
}

/** Coin pill. The counter rolls when the value changes; it pops when coins land. */
export function CoinCounter({ value, style }: { value: number; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const pop = useSharedValue(1);
  useEffect(() => {
    pop.set(withSequence(withSpring(1.12, spring.snappy), withSpring(1, spring.bouncy)));
  }, [value, pop]);
  const s = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View
      style={[styles.coinPill, { backgroundColor: c.card }, s, style]}
      accessibilityLabel={`${value.toLocaleString('en-US')} coins`}
    >
      <Coin size={18} />
      <AnimatedNumber value={value.toLocaleString('en-US')} variant="headline" fromZero={false} />
    </Animated.View>
  );
}

/** Spark streak counter for the Home header. */
export function SparkCount({ value }: { value: number }) {
  const { c } = useTheme();
  return (
    <View style={styles.spark} accessibilityLabel={`${value} day streak`}>
      <Flame size={26} weight="fill" color={c.spark} />
      <AnimatedNumber value={value} variant="title" color="spark" />
    </View>
  );
}

export function Skeleton({
  width = '100%',
  height = 16,
  r = 8,
  style,
}: {
  width?: DimensionValue;
  height?: number;
  r?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const o = useSharedValue(0.55);
  useEffect(() => {
    if (reduced) return;
    o.set(withRepeat(withTiming(1, { duration: timing.shimmer, easing: ease.inOut }), -1, true));
  }, [reduced, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[{ width, height, borderRadius: r, backgroundColor: c.inset }, s, style]} />;
}

export function EmptyState({
  title,
  subtitle,
  expression = 'curious',
  action,
}: {
  title?: string;
  subtitle?: string;
  expression?: Expression;
  action?: { label: string; onPress: () => void };
}) {
  const t = useT();
  return (
    <View style={styles.empty}>
      <Tarsi expression={expression} size={96} />
      <Text variant="headline" align="center">
        {title ?? t.empty.title}
      </Text>
      <Text variant="subhead" align="center">
        {subtitle ?? t.empty.subtitle}
      </Text>
      {action ? <PillButton label={action.label} onPress={action.onPress} kind="secondary" size="sm" /> : null}
    </View>
  );
}

/** Staggered entry wrapper: translateY 12 → 0, fade in, once per mount. */
export function Stagger({
  index,
  children,
  style,
}: {
  index: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  return (
    <Animated.View entering={enterAt(index, reduced)} style={style}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  coinPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  spark: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 24 },
});

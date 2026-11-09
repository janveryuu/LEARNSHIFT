import { useEffect, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  progress: number;
  size: number;
  stroke?: number;
  color?: string;
  track?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
};

/** Progress ring that draws on with a smooth spring. Starts at 12 o'clock. */
export function Ring({ progress, size, stroke = 10, color, track, children, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = useSharedValue(reduced ? progress : 0);

  useEffect(() => {
    const v = Math.max(0, Math.min(1, progress));
    p.set(reduced ? v : withSpring(v, spring.draw));
  }, [progress, reduced, p]);

  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - p.get()) }));

  return (
    <View
      style={{ width: size, height: size }}
      accessible={!!accessibilityLabel}
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Svg width={size} height={size} style={styles.rotate}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={track ?? c.chartIdle} strokeWidth={stroke} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color ?? c.accent}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${circ} ${circ}`}
          animatedProps={props}
        />
      </Svg>
      {children ? <View style={styles.center}>{children}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  rotate: { transform: [{ rotate: '-90deg' }] },
  center: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

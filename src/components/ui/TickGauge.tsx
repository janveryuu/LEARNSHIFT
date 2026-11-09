import { useEffect, useMemo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedProps, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import Svg, { Circle, Line } from 'react-native-svg';

import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

const AnimatedLine = Animated.createAnimatedComponent(Line);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type Props = {
  /** 0–1. */
  progress: number;
  width: number;
  ticks?: number;
  /** Degrees of arc, centered on the top. */
  sweep?: number;
  color?: string;
  children?: ReactNode;
  accessibilityLabel?: string;
};

const deg = Math.PI / 180;

/**
 * Arc of short ticks that fill with the accent, with a marker dot at "now".
 * Ticks draw on with a slow spring; the marker settles with a tiny overshoot.
 */
export function TickGauge({ progress, width, ticks = 44, sweep = 220, color, children, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const accent = color ?? c.accent;
  const R = width / 2 - 12;
  const r1 = R - 12;
  const cx = width / 2;
  const cy = R + 12;
  const start = -90 - sweep / 2;
  const step = sweep / (ticks - 1);
  const bottom = cy + Math.max(0, Math.sin((start + sweep) * deg)) * R + 14;

  const p = useSharedValue(reduced ? progress : 0);
  useEffect(() => {
    p.set(reduced ? progress : withSpring(Math.max(0, Math.min(1, progress)), spring.draw));
  }, [progress, reduced, p]);

  const lines = useMemo(
    () =>
      Array.from({ length: ticks }, (_, i) => {
        const a = (start + i * step) * deg;
        const cos = Math.cos(a);
        const sin = Math.sin(a);
        return { i, x1: cx + r1 * cos, y1: cy + r1 * sin, x2: cx + R * cos, y2: cy + R * sin };
      }),
    [ticks, start, step, cx, cy, r1, R],
  );

  const marker = useAnimatedProps(() => {
    const a = (start + p.get() * sweep) * deg;
    const rm = (R + r1) / 2;
    return { cx: cx + rm * Math.cos(a), cy: cy + rm * Math.sin(a) };
  });

  return (
    <View
      style={{ width, height: bottom }}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ min: 0, max: 100, now: Math.round(progress * 100) }}
    >
      <Svg width={width} height={bottom}>
        {lines.map((l) => (
          <Line
            key={`b${l.i}`}
            x1={l.x1}
            y1={l.y1}
            x2={l.x2}
            y2={l.y2}
            stroke={c.chartIdle}
            strokeWidth={3}
            strokeLinecap="round"
          />
        ))}
        {lines.map((l) => (
          <FillTick key={`f${l.i}`} {...l} total={ticks} p={p} color={accent} />
        ))}
        <AnimatedCircle animatedProps={marker} r={7} fill={accent} stroke={c.card} strokeWidth={3} />
      </Svg>
      {children ? (
        <View pointerEvents="box-none" style={[styles.center, { top: cy - R * 0.5 }]}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function FillTick({
  i,
  x1,
  y1,
  x2,
  y2,
  total,
  p,
  color,
}: {
  i: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  total: number;
  p: SharedValue<number>;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const filled = p.get() * (total - 1);
    if (i > filled + 0.001) return { strokeOpacity: 0 };
    // Ramp from faint at the start to full at the marker.
    const t = filled <= 0 ? 1 : i / filled;
    return { strokeOpacity: 0.28 + 0.72 * t * t };
  });
  return (
    <AnimatedLine
      animatedProps={props}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={color}
      strokeWidth={3}
      strokeLinecap="round"
    />
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});

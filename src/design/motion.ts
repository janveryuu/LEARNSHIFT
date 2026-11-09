import { Platform } from 'react-native';
import {
  Easing,
  FadeIn,
  FadeInDown,
  ReduceMotion,
  useReducedMotion,
  type WithSpringConfig,
} from 'react-native-reanimated';

/** Spring presets. Nothing in the app animates linearly. */
export const spring = {
  snappy: { damping: 18, stiffness: 260, mass: 1, reduceMotion: ReduceMotion.System },
  smooth: { damping: 22, stiffness: 180, mass: 1, reduceMotion: ReduceMotion.System },
  bouncy: { damping: 12, stiffness: 200, mass: 1, reduceMotion: ReduceMotion.System },
  /** Gauges and rings: a slower settle (~700 ms) with no visible overshoot. */
  draw: { damping: 20, stiffness: 120, mass: 1, reduceMotion: ReduceMotion.System },
} as const satisfies Record<string, WithSpringConfig>;

export const pressScale = {
  button: 0.96,
  card: 0.98,
} as const;

export const timing = {
  stagger: 40,
  themeCrossfade: 1200,
  blinkMin: 3000,
  blinkMax: 6000,
  breath: 3000,
  shimmer: 1100,
} as const;

export const ease = {
  inOut: Easing.bezier(0.45, 0, 0.55, 1),
  out: Easing.bezier(0.22, 1, 0.36, 1),
} as const;

/**
 * Entry animation for stacked cards: translateY 12 → 0, opacity 0 → 1,
 * 40 ms stagger. Falls back to a plain fade under Reduce Motion.
 */
export function enterAt(index: number, reduced: boolean) {
  const delay = index * timing.stagger;
  // Reanimated's web layout animations leave content hidden (visibility:
  // hidden until a keyframe that never starts), so web renders without them.
  if (Platform.OS === 'web') return undefined;
  if (reduced) return FadeIn.delay(delay).duration(220);
  return FadeInDown.delay(delay)
    .springify()
    .damping(spring.smooth.damping)
    .stiffness(spring.smooth.stiffness)
    .withInitialValues({ opacity: 0, transform: [{ translateY: 12 }] });
}

export { useReducedMotion };

/** Layout animations are native-only; see `enterAt`. */
export function nativeOnly<T>(anim: T): T | undefined {
  return Platform.OS === 'web' ? undefined : anim;
}

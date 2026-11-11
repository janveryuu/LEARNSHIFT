import { memo, useEffect, useState } from 'react';
import { Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { G, Rect } from 'react-native-svg';

import { haptic } from '@/design/haptics';
import { spring, timing, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import {
  L_BOOK,
  L_CHEER,
  L_FULL,
  L_NOL,
  L_NOLR,
  L_PENCIL,
  L_WAVEA,
  L_WAVEB,
  L_WRENCH,
  PATY_PALETTE as PAL,
  type Run,
} from './patySprite';

export type Expression = 'happy' | 'curious' | 'proud' | 'concerned' | 'sleepy' | 'cheering' | 'studying' | 'waving';

export type PatyProp = 'none' | 'pencil' | 'book' | 'wrench';

type Props = {
  expression?: Expression;
  size?: number;
  prop?: PatyProp;
  /** Idle bob, blinking and waving. Default true. */
  alive?: boolean;
  /** Tap to hop. */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Square viewBox around the 36×48 sprite, with room for raised arms and a shadow. */
const VIEW = { x: -7, y: -1, w: 50, h: 50 };
/** Tiny overlap hides anti-aliasing seams between neighbouring pixel runs. */
const BLEED = 0.04;

type Px = readonly [number, number, string];

const EYE_L = [11, 18] as const;
const EYE_R = [22, 18] as const;

/** Eye-lid rows covered (0 open … 4 shut) per expression. */
const lidFor: Record<Expression, number> = {
  happy: 0,
  curious: 0,
  proud: 0,
  concerned: 1,
  sleepy: 2,
  cheering: 0,
  studying: 1,
  waving: 0,
};

/** Pupil offset per expression (look direction), in pixels. */
const lookFor: Record<Expression, [number, number]> = {
  happy: [0, 0],
  curious: [1, -1],
  proud: [0, 0],
  concerned: [0, 0],
  sleepy: [0, 1],
  cheering: [0, 0],
  studying: [0, 1],
  waving: [0, 0],
};

const arcEyes: Expression[] = ['proud', 'cheering'];

/** Draws one run list as merged SVG rects. */
const Runs = memo(function Runs({ runs }: { runs: readonly Run[] }) {
  return (
    <G>
      {runs.map(([x, y, w, k], i) => (
        <Rect key={i} x={x} y={y} width={w + BLEED} height={1 + BLEED} fill={PAL[k]} />
      ))}
    </G>
  );
});

function Pixels({ px }: { px: readonly Px[] }) {
  return (
    <G>
      {px.map(([x, y, col], i) => (
        <Rect key={i} x={x} y={y} width={1 + BLEED} height={1 + BLEED} fill={col} />
      ))}
    </G>
  );
}

const K = PAL.K;
const WHITE = '#FFFFFF';

/** The eyes inside the lenses: open, lidded, blinking or happy arcs. */
function eyePixels(expression: Expression, blink: boolean): Px[] {
  const out: Px[] = [];
  const [lx, ly] = lookFor[expression];
  for (const [ex0, ey0] of [EYE_L, EYE_R]) {
    if (arcEyes.includes(expression)) {
      // ^ ^ : a little upside-down V for joy.
      out.push([ex0 - 1, ey0 + 3, K], [ex0, ey0 + 2, K], [ex0 + 1, ey0 + 1, K], [ex0 + 2, ey0 + 2, K], [ex0 + 3, ey0 + 3, K]);
      continue;
    }
    if (blink) {
      for (let x = ex0 - 1; x <= ex0 + 3; x++) out.push([x, ey0 + 2, K]);
      continue;
    }
    const ex = ex0 + lx;
    const ey = ey0 + ly;
    const lid = lidFor[expression];
    for (let y = 0; y < 4; y++)
      for (let x = 0; x < 3; x++) {
        if (y < lid) continue;
        out.push([ex + x, ey + y, x === 0 && y === lid ? WHITE : K]);
      }
    // Lash line along a heavy lid.
    if (lid > 0) for (let x = -1; x < 4; x++) out.push([ex + x, ey + lid - 1, K]);
  }
  return out;
}

function mouthPixels(expression: Expression): Px[] {
  const M = PAL.M;
  switch (expression) {
    case 'cheering':
      return [
        [16, 25, M], [17, 25, M], [18, 25, M], [19, 25, M], [20, 25, M],
        [16, 26, M], [17, 26, PAL.m], [18, 26, PAL.m], [19, 26, PAL.m], [20, 26, M],
        [17, 27, M], [18, 27, M], [19, 27, M],
      ];
    case 'proud':
      return [[15, 25, M], [16, 26, M], [17, 26, M], [18, 26, M], [19, 26, M], [20, 26, M], [21, 25, M]];
    case 'curious':
      return [[17, 25, M], [18, 25, M], [17, 26, M], [18, 26, M]];
    case 'concerned':
      return [[16, 26, M], [17, 25, M], [18, 26, M], [19, 25, M], [20, 26, M]];
    case 'sleepy':
      return [[17, 26, M], [18, 26, M]];
    case 'studying':
      return [[17, 26, M], [18, 26, M], [19, 26, M]];
    default:
      return [[16, 25, M], [17, 26, M], [18, 26, M], [19, 26, M], [20, 25, M]];
  }
}

/** Little extras: sleepy Z's, a worry drop, cheering sparkles. */
function extraPixels(expression: Expression, frame: number): Px[] {
  if (expression === 'sleepy') {
    const z = PAL.z;
    const zs: Px[] = [
      [31, 8, z], [32, 8, z], [33, 8, z], [32, 9, z], [31, 10, z], [32, 10, z], [33, 10, z],
      [35, 4, z], [36, 4, z], [36, 5, z], [35, 6, z], [36, 6, z],
    ];
    return frame ? zs : zs.slice(0, 7);
  }
  if (expression === 'concerned') {
    const L = PAL.L;
    return [[30, 13, L], [29, 14, L], [30, 14, L], [29, 15, L], [30, 15, L]];
  }
  if (expression === 'cheering') {
    const Y = PAL.Y;
    const a: Px[] = [[-3, 12, Y], [-4, 13, Y], [-3, 13, Y], [-2, 13, Y], [-3, 14, Y]];
    const b: Px[] = [[38, 10, Y], [37, 11, Y], [38, 11, Y], [39, 11, Y], [38, 12, Y]];
    return frame ? [...a, ...b.map(([x, y, c]) => [x, y + 3, c] as Px)] : [...a.map(([x, y, c]) => [x, y - 2, c] as Px), ...b];
  }
  return [];
}

/**
 * Paty, a pixel-art Filipino student: round blue glasses, school uniform,
 * red backpack. Built from a sprite grid so expressions are props and
 * every size stays crisp. Idle: a one-pixel bob, random blinks, waving.
 */
export function Paty({
  expression = 'happy',
  size = 120,
  prop = 'none',
  alive = true,
  interactive = true,
  style,
  accessibilityLabel = 'Paty',
}: Props) {
  const reduced = useReducedMotion();
  const live = alive && !reduced;
  const [blink, setBlink] = useState(false);
  const [frame, setFrame] = useState(0);
  const bob = useSharedValue(0);
  const hop = useSharedValue(0);
  const unit = size / VIEW.h;

  // One-pixel idle bob, the classic sprite "breathing".
  useEffect(() => {
    if (!live) {
      bob.set(0);
      return;
    }
    bob.set(
      withRepeat(
        withSequence(
          withDelay(timing.breath / 4, withTiming(-unit, { duration: 0 })),
          withDelay(timing.breath / 4, withTiming(0, { duration: 0 })),
        ),
        -1,
      ),
    );
  }, [live, unit, bob]);

  // Blink every 3–6 s at random.
  useEffect(() => {
    if (!live || arcEyes.includes(expression)) return;
    let t1: ReturnType<typeof setTimeout> | undefined;
    let t2: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      const wait = timing.blinkMin + Math.random() * (timing.blinkMax - timing.blinkMin);
      t1 = setTimeout(() => {
        setBlink(true);
        t2 = setTimeout(() => {
          setBlink(false);
          schedule();
        }, 140);
      }, wait);
    };
    schedule();
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [live, expression]);

  // Two-frame animation for waving, cheering sparkles and sleepy Z's.
  const animated = expression === 'waving' || expression === 'cheering' || expression === 'sleepy';
  useEffect(() => {
    if (!live || !animated) return;
    const ms = expression === 'waving' ? 300 : 600;
    const id = setInterval(() => setFrame((f) => (f ? 0 : 1)), ms);
    return () => clearInterval(id);
  }, [live, animated, expression]);

  const body = useAnimatedStyle(() => ({ transform: [{ translateY: bob.get() + hop.get() }] }));

  const onTap = () => {
    if (!interactive) return;
    haptic.light();
    if (reduced) return;
    hop.set(withSequence(withSpring(-unit * 4, spring.snappy), withSpring(0, spring.bouncy)));
  };

  const waving = expression === 'waving';
  const cheering = expression === 'cheering';
  const base = cheering ? L_NOLR : waving ? L_NOL : L_FULL;
  const arms = cheering ? L_CHEER : waving ? (live && frame ? L_WAVEB : L_WAVEA) : null;
  const held = prop === 'book' || expression === 'studying' ? L_BOOK : prop === 'pencil' ? L_PENCIL : prop === 'wrench' ? L_WRENCH : null;

  return (
    <Pressable
      onPress={onTap}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Svg width={size} height={size} viewBox={`${VIEW.x} ${VIEW.y} ${VIEW.w} ${VIEW.h}`}>
          {/* Ground shadow */}
          <Rect x={9} y={47.4} width={18} height={1} rx={0.5} fill="#000" opacity={0.1} />
          <Runs runs={base} />
          <Pixels px={eyePixels(expression, live && blink)} />
          <Pixels px={mouthPixels(expression)} />
          {held && !cheering && !waving ? <Runs runs={held} /> : null}
          {arms ? <Runs runs={arms} /> : null}
          <Pixels px={extraPixels(expression, live ? frame : 0)} />
        </Svg>
      </Animated.View>
    </Pressable>
  );
}

/** Static head-and-shoulders avatar (no idle loops), for lists and headers. */
export function PatyAvatar({ size = 40, background }: { size?: number; background?: string }) {
  const { c } = useTheme();
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: background ?? c.inset,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <Svg width={size} height={size} viewBox="2 0 32 32">
        <Runs runs={L_FULL} />
        <Pixels px={eyePixels('happy', false)} />
        <Pixels px={mouthPixels('happy')} />
      </Svg>
    </View>
  );
}

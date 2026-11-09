import { useEffect, useId, useRef } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, ClipPath, Defs, Ellipse, G, Path, Rect } from 'react-native-svg';

import { haptic } from '@/design/haptics';
import { ease, spring, timing, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type Expression = 'happy' | 'curious' | 'proud' | 'concerned' | 'sleepy' | 'cheering' | 'studying' | 'waving';

export type TarsiProp = 'none' | 'pencil' | 'book' | 'wrench';

type Props = {
  expression?: Expression;
  size?: number;
  prop?: TarsiProp;
  /** Idle breathing + blinking. Default true. */
  alive?: boolean;
  /** Tap to bob. */
  interactive?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** Base eyelid closure per expression (0 open … 1 shut). */
const lidFor: Record<Expression, number> = {
  happy: 0,
  curious: 0,
  proud: 0,
  concerned: 0.22,
  sleepy: 0.58,
  cheering: 0,
  studying: 0.18,
  waving: 0,
};

/** Pupil offset per expression (look direction). */
const lookFor: Record<Expression, [number, number]> = {
  happy: [0, 1],
  curious: [4, -4],
  proud: [0, 0],
  concerned: [0, 2],
  sleepy: [0, 3],
  cheering: [0, 0],
  studying: [0, 6],
  waving: [1, 1],
};

const arcEyes: Expression[] = ['proud', 'cheering'];

const EYE_R = 24;
const EYES: [number, number][] = [
  [76, 92],
  [124, 92],
];

/**
 * Tarsi, a Philippine tarsier. Layered SVG so expressions are props.
 * Big round eyes (focus), long fingers, ember scarf. Nocturnal, so it
 * owns the wind-down story.
 */
export function Tarsi({
  expression = 'happy',
  size = 120,
  prop = 'none',
  alive = true,
  interactive = true,
  style,
  accessibilityLabel = 'Tarsi',
}: Props) {
  const { c, isNight } = useTheme();
  const reduced = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const baseLid = lidFor[expression];
  const [lx, ly] = lookFor[expression];
  const showArcs = arcEyes.includes(expression);

  const breath = useSharedValue(1);
  const bob = useSharedValue(0);
  const lid = useSharedValue(baseLid);
  const wave = useSharedValue(0);

  useEffect(() => {
    lid.set(withTiming(baseLid, { duration: 260, easing: ease.inOut }));
  }, [baseLid, lid]);

  useEffect(() => {
    if (!alive || reduced) {
      breath.set(1);
      return;
    }
    breath.set(withRepeat(withTiming(1.02, { duration: timing.breath / 2, easing: ease.inOut }), -1, true));
  }, [alive, reduced, breath]);

  useEffect(() => {
    if (expression !== 'waving' || reduced) {
      wave.set(withTiming(0, { duration: 200 }));
      return;
    }
    wave.set(
      withRepeat(
        withSequence(
          withTiming(-14, { duration: 260, easing: ease.inOut }),
          withTiming(10, { duration: 260, easing: ease.inOut }),
        ),
        -1,
        true,
      ),
    );
  }, [expression, reduced, wave]);

  // Blink every 3–6 s at random.
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!alive || showArcs) return;
    const schedule = () => {
      const wait = timing.blinkMin + Math.random() * (timing.blinkMax - timing.blinkMin);
      timer.current = setTimeout(() => {
        lid.set(withSequence(withTiming(1, { duration: 70 }), withTiming(lidFor[expression], { duration: 120 })));
        schedule();
      }, wait);
    };
    schedule();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [alive, showArcs, expression, lid]);

  const body = useAnimatedStyle(() => ({
    transform: [{ translateY: bob.get() }, { scale: breath.get() }],
  }));
  const armStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${wave.get()}deg` }] }));
  const lidProps = useAnimatedProps(() => ({ height: lid.get() * EYE_R * 2 + 1 }));

  const onTap = () => {
    if (!interactive) return;
    haptic.light();
    if (reduced) return;
    bob.set(withSequence(withSpring(-8, spring.snappy), withSpring(0, spring.bouncy)));
  };

  const fur = c.fur;
  const furDeep = c.furDeep;
  const cream = c.furLight;
  const innerEar = isNight ? '#B98A78' : '#E9B7A0';
  const iris = isNight ? '#D99A3E' : '#E9A23B';
  const pupil = '#1E140D';
  const scarf = c.accent;
  const tilt = expression === 'curious' ? -8 : 0;
  const armsUp = expression === 'cheering';

  return (
    <Pressable
      onPress={onTap}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : 'image'}
      accessibilityLabel={accessibilityLabel}
      style={style}
    >
      <Animated.View style={[{ width: size, height: size }, body]}>
        <Svg width={size} height={size} viewBox="0 0 200 200">
          <Defs>
            {EYES.map(([x, y], i) => (
              <ClipPath key={i} id={`eye${i}${uid}`}>
                <Circle cx={x} cy={y} r={EYE_R} />
              </ClipPath>
            ))}
          </Defs>

          {/* Ground shadow */}
          <Ellipse cx={100} cy={194} rx={42} ry={5} fill="#000" opacity={isNight ? 0.25 : 0.07} />

          {/* Body */}
          <Ellipse cx={100} cy={168} rx={36} ry={28} fill={fur} />
          <Ellipse cx={100} cy={174} rx={22} ry={18} fill={cream} />

          {/* Feet */}
          <Ellipse cx={82} cy={192} rx={12} ry={5} fill={furDeep} />
          <Ellipse cx={118} cy={192} rx={12} ry={5} fill={furDeep} />

          {/* Arms (down) */}
          {!armsUp ? (
            <>
              <Arm side="left" color={fur} pad={cream} />
              {expression !== 'waving' ? <Arm side="right" color={fur} pad={cream} /> : null}
            </>
          ) : null}

          <G transform={`rotate(${tilt} 100 110)`}>
            {/* Ears */}
            <Circle cx={50} cy={56} r={30} fill={fur} />
            <Circle cx={150} cy={56} r={30} fill={fur} />
            <Circle cx={52} cy={58} r={18} fill={innerEar} />
            <Circle cx={148} cy={58} r={18} fill={innerEar} />

            {/* Head */}
            <Circle cx={100} cy={96} r={62} fill={fur} />
            {/* Face mask around the eyes */}
            <Circle cx={76} cy={94} r={33} fill={cream} />
            <Circle cx={124} cy={94} r={33} fill={cream} />
            <Ellipse cx={100} cy={124} rx={26} ry={20} fill={cream} />
            {/* Brow tuft */}
            <Path d="M92 50 Q100 40 108 50" stroke={furDeep} strokeWidth={4} strokeLinecap="round" fill="none" />

            {/* Eyes */}
            {showArcs
              ? EYES.map(([x, y], i) => (
                  <Path
                    key={i}
                    d={`M${x - 15} ${y + 4} Q${x} ${y - 16} ${x + 15} ${y + 4}`}
                    stroke={pupil}
                    strokeWidth={6}
                    strokeLinecap="round"
                    fill="none"
                  />
                ))
              : EYES.map(([x, y], i) => (
                  <G key={i}>
                    <Circle cx={x} cy={y} r={EYE_R} fill={iris} />
                    <Circle cx={x + lx} cy={y + ly} r={17} fill={pupil} />
                    <Circle cx={x + lx - 7} cy={y + ly - 7} r={5.5} fill="#FFFFFF" />
                    <Circle cx={x + lx + 6} cy={y + ly + 6} r={2.2} fill="#FFFFFF" opacity={0.85} />
                    <AnimatedRect
                      x={x - EYE_R - 1}
                      y={y - EYE_R - 1}
                      width={EYE_R * 2 + 2}
                      animatedProps={lidProps}
                      fill={cream}
                      clipPath={`url(#eye${i}${uid})`}
                    />
                    <Circle cx={x} cy={y} r={EYE_R} fill="none" stroke={furDeep} strokeWidth={2} opacity={0.35} />
                  </G>
                ))}

            {/* Brows for concern */}
            {expression === 'concerned' ? (
              <>
                <Path d="M58 60 L86 66" stroke={furDeep} strokeWidth={4.5} strokeLinecap="round" />
                <Path d="M142 60 L114 66" stroke={furDeep} strokeWidth={4.5} strokeLinecap="round" />
              </>
            ) : null}

            {/* Nose */}
            <Path d="M95 116 Q100 112 105 116 Q100 122 95 116 Z" fill={furDeep} />

            {/* Mouth */}
            <Mouth expression={expression} color={furDeep} />

            {/* Blush */}
            {['happy', 'proud', 'cheering', 'waving'].includes(expression) ? (
              <>
                <Ellipse cx={56} cy={124} rx={8} ry={5} fill={scarf} opacity={0.22} />
                <Ellipse cx={144} cy={124} rx={8} ry={5} fill={scarf} opacity={0.22} />
              </>
            ) : null}
          </G>

          {/* Scarf */}
          <Path d="M64 146 Q100 160 136 146 L138 156 Q100 172 62 156 Z" fill={scarf} />
          <Path d="M120 156 L132 184 L118 182 L112 160 Z" fill={scarf} />
          <Path d="M66 150 Q100 162 134 150" stroke="#FFFFFF" strokeOpacity={0.25} strokeWidth={2} fill="none" />

          {/* Arms up for cheering */}
          {armsUp ? (
            <>
              <Path d="M72 156 Q50 130 46 100" stroke={fur} strokeWidth={10} strokeLinecap="round" fill="none" />
              <Path d="M128 156 Q150 130 154 100" stroke={fur} strokeWidth={10} strokeLinecap="round" fill="none" />
              <Fingers x={46} y={98} up color={fur} pad={cream} />
              <Fingers x={154} y={98} up color={fur} pad={cream} />
            </>
          ) : null}

          {/* Props held in front */}
          {prop === 'book' || expression === 'studying' ? <Book accent={scarf} /> : null}
          {prop === 'pencil' ? <Pencil /> : null}
          {prop === 'wrench' ? <Wrench /> : null}
        </Svg>

        {/* Waving arm: separate layer so it can rotate around the shoulder. */}
        {expression === 'waving' ? (
          <Animated.View style={[StyleSheet.absoluteFill, styles.wavePivot, armStyle]} pointerEvents="none">
            <Svg width={size} height={size} viewBox="0 0 200 200">
              <Path d="M132 156 Q156 140 162 112" stroke={fur} strokeWidth={10} strokeLinecap="round" fill="none" />
              <Fingers x={162} y={110} up color={fur} pad={cream} />
            </Svg>
          </Animated.View>
        ) : null}
      </Animated.View>
    </Pressable>
  );
}

function Arm({ side, color, pad }: { side: 'left' | 'right'; color: string; pad: string }) {
  const s = side === 'left' ? -1 : 1;
  const x0 = 100 + s * 30;
  const x1 = 100 + s * 40;
  return (
    <G>
      <Path
        d={`M${x0} 152 Q${x1 + s * 6} 166 ${x1} 182`}
        stroke={color}
        strokeWidth={10}
        strokeLinecap="round"
        fill="none"
      />
      <Fingers x={x1} y={184} color={color} pad={pad} />
    </G>
  );
}

/** Three long tarsier fingers with round pads. */
function Fingers({ x, y, up, color, pad }: { x: number; y: number; up?: boolean; color: string; pad: string }) {
  const d = up ? -1 : 1;
  const tips: [number, number][] = [
    [x - 7, y + d * 9],
    [x, y + d * 12],
    [x + 7, y + d * 9],
  ];
  return (
    <G>
      {tips.map(([tx, ty], i) => (
        <G key={i}>
          <Path d={`M${x} ${y} L${tx} ${ty}`} stroke={color} strokeWidth={3.5} strokeLinecap="round" />
          <Circle cx={tx} cy={ty} r={3.4} fill={pad} />
        </G>
      ))}
    </G>
  );
}

function Mouth({ expression, color }: { expression: Expression; color: string }) {
  switch (expression) {
    case 'cheering':
      return <Path d="M88 128 Q100 146 112 128 Z" fill={color} />;
    case 'sleepy':
      return <Ellipse cx={100} cy={133} rx={5} ry={7} fill={color} />;
    case 'curious':
      return <Circle cx={100} cy={131} r={4} fill={color} />;
    case 'concerned':
      return (
        <Path
          d="M90 134 Q95 129 100 133 Q105 137 110 132"
          stroke={color}
          strokeWidth={3}
          strokeLinecap="round"
          fill="none"
        />
      );
    case 'studying':
      return <Path d="M94 131 L106 131" stroke={color} strokeWidth={3} strokeLinecap="round" />;
    default:
      return <Path d="M90 128 Q100 138 110 128" stroke={color} strokeWidth={3.5} strokeLinecap="round" fill="none" />;
  }
}

function Book({ accent }: { accent: string }) {
  return (
    <G>
      <Path d="M70 160 L100 166 L100 192 L70 186 Z" fill="#FFFFFF" stroke="#D8D2CA" strokeWidth={1.5} />
      <Path d="M130 160 L100 166 L100 192 L130 186 Z" fill="#FAF7F2" stroke="#D8D2CA" strokeWidth={1.5} />
      <Path
        d="M76 168 L94 171 M76 174 L94 177 M106 171 L124 168 M106 177 L124 174"
        stroke="#C9C2B8"
        strokeWidth={1.5}
      />
      <Path d="M100 166 L100 192" stroke={accent} strokeWidth={2.5} />
    </G>
  );
}

function Pencil() {
  return (
    <G transform="rotate(-35 150 170)">
      <Rect x={140} y={150} width={9} height={40} rx={2} fill="#FFB21E" />
      <Rect x={140} y={150} width={9} height={6} rx={2} fill="#E9A487" />
      <Path d="M140 190 L149 190 L144.5 200 Z" fill="#F3E2C8" />
      <Path d="M143 196 L146 196 L144.5 200 Z" fill="#3A2A20" />
    </G>
  );
}

function Wrench() {
  return (
    <G transform="rotate(30 40 160)">
      <Rect x={36} y={150} width={9} height={36} rx={4} fill="#9A9AA0" />
      <Path d="M30 146 a10 10 0 1 1 21 0 l-5 0 l0 6 l-11 0 l0 -6 Z" fill="#9A9AA0" />
    </G>
  );
}

const styles = StyleSheet.create({
  wavePivot: { transformOrigin: '66% 78%' },
});

/** Static small avatar (no idle loops), for lists and headers. */
export function TarsiAvatar({ size = 40, background }: { size?: number; background?: string }) {
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
      <Tarsi size={size * 1.15} alive={false} interactive={false} style={{ marginTop: size * 0.22 }} />
    </View>
  );
}

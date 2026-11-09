import { useEffect } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

import { SHORT, SKILLS, SKILL_BY_ID, type SkillId } from '@/data/skills';
import { haptic } from '@/design/haptics';
import { ease, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { useL } from '@/i18n/useT';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);
const FONT = Platform.OS === 'ios' ? undefined : 'Inter_600SemiBold';

type Props = {
  mastery: Record<SkillId, number>;
  root: SkillId;
  /** Skills the root is holding back: their edges glow. */
  blocked: SkillId[];
  width: number;
  onPress?: (id: SkillId) => void;
  /** Nodes fade in one by one (onboarding "first gap" reveal). */
  reveal?: boolean;
};

const R = 24;

/**
 * Grade 7 Math prerequisite graph. Nodes are mastery rings, edges are soft
 * curves, the root gap pulses. Taps go through invisible Pressables laid over
 * each node, which also carry the screen-reader labels.
 */
export function SkillGraph({ mastery, root, blocked, width, onPress, reveal }: Props) {
  const { c } = useTheme();
  const L = useL();
  // Rows need ~80 px each so a label never sits under the next row of rings.
  const height = Math.round(Math.max(width * 1.02, 400));
  const padX = R + 18;
  const padTop = R + 10;
  const padBottom = R + 26;
  const pos = (id: SkillId) => ({
    x: padX + SKILL_BY_ID[id].pos.x * (width - padX * 2),
    y: padTop + SKILL_BY_ID[id].pos.y * (height - padTop - padBottom),
  });
  const path = new Set<SkillId>([root, ...blocked]);
  const circ = 2 * Math.PI * R;

  return (
    <View style={{ width, height }}>
      <Svg width={width} height={height}>
        {SKILLS.flatMap((s) =>
          s.prereqs.map((p) => {
            const a = pos(p);
            const b = pos(s.id);
            const hot = path.has(p) && path.has(s.id);
            // Bow each edge a little so long edges never run through a node.
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const k = 0.16;
            const cx = mx - dy * k;
            const cy = my + dx * k;
            return (
              <Path
                key={`${p}-${s.id}`}
                d={`M${a.x},${a.y} Q${cx},${cy} ${b.x},${b.y}`}
                stroke={hot ? c.accent : c.chartIdle}
                strokeWidth={hot ? 3 : 2}
                strokeDasharray={hot ? undefined : '2 6'}
                strokeLinecap="round"
                fill="none"
              />
            );
          }),
        )}
        {SKILLS.map((s, i) => {
          const { x, y } = pos(s.id);
          const m = mastery[s.id];
          const isRoot = s.id === root;
          const color = isRoot ? c.accent : m >= 0.7 ? c.success : m >= 0.5 ? c.warning : c.accentFaded;
          return (
            <Node key={s.id} index={i} reveal={!!reveal}>
              {isRoot ? <Pulse x={x} y={y} color={c.accent} /> : null}
              <Circle cx={x} cy={y} r={R + 5} fill={c.card} />
              <Circle cx={x} cy={y} r={R} stroke={c.chartIdle} strokeWidth={6} fill={c.card} />
              <Circle
                cx={x}
                cy={y}
                r={R}
                stroke={color}
                strokeWidth={6}
                fill="none"
                strokeLinecap="round"
                strokeDasharray={`${circ * m} ${circ}`}
                transform={`rotate(-90 ${x} ${y})`}
              />
              <SvgText
                x={x}
                y={y + 5}
                fontSize={13}
                fontWeight="700"
                fontFamily={FONT}
                fill={c.text}
                textAnchor="middle"
              >
                {Math.round(m * 100)}
              </SvgText>
              <SvgText
                x={x}
                y={y + R + 18}
                fontSize={12}
                fontWeight="600"
                fontFamily={FONT}
                fill={isRoot ? c.accent : c.textSecondary}
                textAnchor="middle"
              >
                {L(SHORT[s.id])}
              </SvgText>
            </Node>
          );
        })}
      </Svg>
      {SKILLS.map((s) => {
        const { x, y } = pos(s.id);
        return (
          <Pressable
            key={s.id}
            disabled={!onPress}
            onPress={() => {
              haptic.select();
              onPress?.(s.id);
            }}
            accessibilityRole="button"
            accessibilityLabel={`${L(SKILL_BY_ID[s.id].name)}, ${Math.round(mastery[s.id] * 100)}%${s.id === root ? ', root gap' : ''}`}
            style={[styles.hit, { left: x - R - 10, top: y - R - 8 }]}
          />
        );
      })}
    </View>
  );
}

function Node({ index, reveal, children }: { index: number; reveal: boolean; children: React.ReactNode }) {
  const o = useSharedValue(reveal ? 0 : 1);
  useEffect(() => {
    if (reveal)
      o.set(withSequence(withTiming(0, { duration: index * 120 }), withTiming(1, { duration: 380, easing: ease.out })));
  }, [reveal, index, o]);
  const props = useAnimatedProps(() => ({ opacity: o.get() }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

/** Soft breathing halo on the root-gap node. */
function Pulse({ x, y, color }: { x: number; y: number; color: string }) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (reduced) return;
    t.set(withRepeat(withTiming(1, { duration: 1600, easing: ease.out }), -1));
  }, [reduced, t]);
  const props = useAnimatedProps(() => ({ r: R + 6 + t.get() * 14, opacity: 0.35 * (1 - t.get()) }));
  return <AnimatedCircle cx={x} cy={y} fill={color} animatedProps={props} />;
}

const styles = StyleSheet.create({
  hit: { position: 'absolute', width: (R + 10) * 2, height: (R + 8) * 2 + 18 },
});

import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';

import { PressableScale, Text } from '@/components/ui';
import { pressScale, spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';
import { fontFor } from '@/design/typography';

export type OptionState = 'idle' | 'selected' | 'correct' | 'wrong' | 'reveal' | 'dim';

const AnimatedPath = Animated.createAnimatedComponent(Path);
const LETTERS = ['A', 'B', 'C', 'D'];

/**
 * Large answer row. Correct fills green and draws a check; wrong shakes
 * three times (6 px) and tints red; `reveal` marks the right answer softly.
 */
export function QuizOption({
  index,
  label,
  state,
  onPress,
  disabled,
}: {
  index: number;
  label: string;
  state: OptionState;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const fill = useSharedValue(0); // 0 idle, 1 correct, 2 wrong
  const x = useSharedValue(0);
  const draw = useSharedValue(0);

  useEffect(() => {
    if (state === 'correct') {
      fill.set(withSpring(1, spring.smooth));
      draw.set(withTiming(1, { duration: reduced ? 1 : 360 }));
    } else if (state === 'wrong') {
      fill.set(withSpring(2, spring.smooth));
      if (!reduced) {
        x.set(
          withSequence(
            withTiming(-6, { duration: 45 }),
            withTiming(6, { duration: 70 }),
            withTiming(-6, { duration: 70 }),
            withTiming(6, { duration: 70 }),
            withTiming(-6, { duration: 70 }),
            withSpring(0, spring.snappy),
          ),
        );
      }
    } else {
      fill.set(withSpring(0, spring.snappy));
      draw.set(0);
    }
  }, [state, reduced, fill, x, draw]);

  const selected = state === 'selected';
  const bgIdle = selected ? c.accentTint : c.inset;
  const bgWrong = c.danger;
  const box = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(fill.get(), [0, 1, 2], [bgIdle, c.success, bgWrong]),
    transform: [{ translateX: x.get() }],
  }));
  const check = useAnimatedProps(() => ({ strokeDashoffset: 30 * (1 - draw.get()) }));

  const onColor = state === 'correct' || state === 'wrong' ? '#FFFFFF' : c.text;
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      scaleTo={pressScale.card}
      accessibilityLabel={`${LETTERS[index]}. ${label}`}
      accessibilityState={{ selected, disabled }}
      style={state === 'dim' ? styles.dim : null}
    >
      <Animated.View
        style={[
          styles.row,
          box,
          state === 'reveal' && { borderColor: c.success, borderWidth: 2 },
          selected && { borderColor: c.accent, borderWidth: 2 },
        ]}
      >
        <View
          style={[
            styles.letter,
            { backgroundColor: state === 'correct' || state === 'wrong' ? 'rgba(255,255,255,0.25)' : c.card },
          ]}
        >
          <Text variant="subhead" color={onColor} style={styles.bold}>
            {LETTERS[index]}
          </Text>
        </View>
        <Text variant="headline" color={onColor} style={styles.flex} numberOfLines={2}>
          {label}
        </Text>
        {state === 'correct' ? (
          <Svg width={24} height={24} viewBox="0 0 24 24">
            <AnimatedPath
              d="M5 12.5l4.5 4.5L19 7.5"
              stroke="#FFFFFF"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
              strokeDasharray="30"
              animatedProps={check}
            />
          </Svg>
        ) : null}
      </Animated.View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 62,
    borderRadius: radius.inset,
    borderCurve: 'continuous',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 14,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  letter: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bold: fontFor(700),
  flex: { flex: 1 },
  dim: { opacity: 0.5 },
});

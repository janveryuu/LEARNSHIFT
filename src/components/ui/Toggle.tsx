import { Pressable, StyleSheet } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useDerivedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/design/haptics';
import { spring } from '@/design/motion';
import { useTheme } from '@/design/theme';

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
};

const W = 51;
const H = 31;
const K = 27;

export function Toggle({ value, onChange, accessibilityLabel, disabled }: Props) {
  const { c } = useTheme();
  const p = useDerivedValue(() => withSpring(value ? 1 : 0, spring.snappy), [value]);
  const off = c.chartIdle;
  const on = c.accent;

  const track = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(p.get(), [0, 1], [off, on]),
  }));
  const knob = useAnimatedStyle(() => ({
    transform: [{ translateX: 2 + p.get() * (W - K - 4) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={8}
      onPress={() => {
        haptic.light();
        onChange(!value);
      }}
      style={{ opacity: disabled ? 0.4 : 1 }}
    >
      <Animated.View style={[styles.track, track]}>
        <Animated.View style={[styles.knob, knob]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: { width: W, height: H, borderRadius: H / 2, justifyContent: 'center' },
  knob: {
    width: K,
    height: K,
    borderRadius: K / 2,
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
});

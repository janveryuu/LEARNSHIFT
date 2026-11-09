import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { haptic } from '@/design/haptics';
import { pressScale, spring } from '@/design/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export type PressableScaleProps = Omit<PressableProps, 'style'> & {
  style?: StyleProp<ViewStyle>;
  /** 0.96 for buttons (default), 0.98 for cards. */
  scaleTo?: number;
  haptics?: boolean;
};

/** The one pressable in the app: spring scale + light selection haptic. */
export function PressableScale({
  style,
  scaleTo = pressScale.button,
  haptics = true,
  onPressIn,
  onPressOut,
  onPress,
  disabled,
  children,
  accessibilityRole = 'button',
  ...rest
}: PressableScaleProps) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.get() }] }));

  return (
    <AnimatedPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPressIn={(e) => {
        scale.set(withSpring(scaleTo, spring.snappy));
        onPressIn?.(e);
      }}
      onPressOut={(e) => {
        scale.set(withSpring(1, spring.snappy));
        onPressOut?.(e);
      }}
      onPress={(e) => {
        if (haptics) haptic.select();
        onPress?.(e);
      }}
      style={[style, animated]}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}

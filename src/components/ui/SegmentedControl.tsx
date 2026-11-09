import { useState } from 'react';
import { Pressable, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, withSpring } from 'react-native-reanimated';

import { haptic } from '@/design/haptics';
import { spring } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { Text } from './Text';

type Props<T extends string> = {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  style?: StyleProp<ViewStyle>;
  /** Small inline variant (Clucky's repeat selector). */
  compact?: boolean;
};

const PAD = 3;

export function SegmentedControl<T extends string>({ options, value, onChange, style, compact }: Props<T>) {
  const { c, isNight } = useTheme();
  const [width, setWidth] = useState(0);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const segW = width > 0 ? (width - PAD * 2) / options.length : 0;

  const thumb = useAnimatedStyle(() => ({
    width: segW,
    transform: [{ translateX: withSpring(index * segW, spring.snappy) }],
  }));

  const onLayout = (e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width);
  const h = compact ? 30 : 36;

  return (
    <View
      accessibilityRole="tablist"
      onLayout={onLayout}
      style={[styles.track, { backgroundColor: c.inset, height: h }, style]}
    >
      {segW > 0 ? (
        <Animated.View
          style={[styles.thumb, { backgroundColor: isNight ? c.tileDark : c.card, height: h - PAD * 2 }, thumb]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => {
              if (!active) {
                haptic.select();
                onChange(o.value);
              }
            }}
            style={styles.seg}
            hitSlop={{ top: 6, bottom: 6 }}
          >
            <Text variant="subhead" color={active ? 'text' : 'textSecondary'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', borderRadius: radius.pill, padding: PAD },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    borderRadius: radius.pill,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  seg: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});

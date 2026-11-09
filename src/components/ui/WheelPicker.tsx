import { useEffect, useRef } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedReaction,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { Text } from './Text';

const ITEM = 34;
const VISIBLE = 5;

type Props = {
  items: readonly string[];
  index: number;
  onChange: (index: number) => void;
  width?: number;
  accessibilityLabel: string;
};

/** iOS-style wheel column. Combine several in a `WheelGroup`. */
export function WheelPicker({ items, index, onChange, width = 64, accessibilityLabel }: Props) {
  const ref = useRef<Animated.ScrollView>(null);
  const y = useSharedValue(index * ITEM);
  const last = useSharedValue(index);

  useEffect(() => {
    ref.current?.scrollTo({ y: index * ITEM, animated: false });
    // only on mount: later changes come from the wheel itself
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScroll = useAnimatedScrollHandler((e) => {
    y.set(e.contentOffset.y);
  });

  useAnimatedReaction(
    () => Math.round(y.get() / ITEM),
    (i) => {
      const clamped = Math.max(0, Math.min(items.length - 1, i));
      if (clamped !== last.get()) {
        last.set(clamped);
        scheduleOnRN(haptic.select);
        scheduleOnRN(onChange, clamped);
      }
    },
    [items.length, onChange],
  );

  return (
    <View
      style={{ width, height: ITEM * VISIBLE }}
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityValue={{ text: items[index] }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={(e) => {
        const next = e.nativeEvent.actionName === 'increment' ? index + 1 : index - 1;
        if (next >= 0 && next < items.length) {
          ref.current?.scrollTo({ y: next * ITEM, animated: true });
        }
      }}
    >
      <Animated.ScrollView
        ref={ref}
        onScroll={onScroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM}
        decelerationRate="fast"
        contentContainerStyle={{ paddingVertical: ITEM * ((VISIBLE - 1) / 2) }}
      >
        {items.map((label, i) => (
          <WheelItem key={label + i} label={label} i={i} y={y} />
        ))}
      </Animated.ScrollView>
    </View>
  );
}

function WheelItem({ label, i, y }: { label: string; i: number; y: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const d = Math.abs(y.get() / ITEM - i);
    return {
      opacity: interpolate(d, [0, 1, 2, 3], [1, 0.45, 0.2, 0.08], 'clamp'),
      transform: [{ scale: interpolate(d, [0, 2], [1, 0.86], 'clamp') }],
    };
  });
  return (
    <Animated.View style={[styles.item, style]}>
      <Text variant="title" style={styles.itemText}>
        {label}
      </Text>
    </Animated.View>
  );
}

/** Wraps wheel columns with the shared selection band. */
export function WheelGroup({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  return (
    <View style={[styles.group, style]}>
      <View pointerEvents="none" style={[styles.band, { backgroundColor: c.inset }]} />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  item: { height: ITEM, alignItems: 'center', justifyContent: 'center' },
  itemText: { fontSize: 21 },
  group: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 4 },
  band: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: ITEM,
    top: ITEM * ((VISIBLE - 1) / 2),
    borderRadius: radius.sm,
  },
});

import { useEffect, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GestureDetector, usePanGesture, useSimultaneousGestures, useTapGesture } from 'react-native-gesture-handler';
import { scheduleOnRN } from 'react-native-worklets';

import { haptic } from '@/design/haptics';
import { spring } from '@/design/motion';
import { useTheme } from '@/design/theme';

type Props = {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  color?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel: string;
  /** Spoken value, e.g. "6:00 PM". */
  accessibilityValueText?: string;
};

const THUMB = 26;

/** Pill track with an accent fill and a white thumb. Drag or tap anywhere. */
export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
  color,
  disabled,
  style,
  accessibilityLabel,
  accessibilityValueText,
}: Props) {
  const { c } = useTheme();
  const [w, setW] = useState(0);
  const width = useSharedValue(0);
  const t = useSharedValue((value - min) / (max - min));
  const dragging = useSharedValue(false);
  const last = useSharedValue(value);

  useEffect(() => {
    if (dragging.get()) return;
    t.set(withSpring((value - min) / (max - min), spring.snappy));
    last.set(value);
  }, [value, min, max, t, dragging, last]);

  const emit = (v: number) => {
    haptic.select();
    onChange(v);
  };

  const apply = (x: number) => {
    'worklet';
    const usable = Math.max(1, width.get() - THUMB);
    const raw = Math.max(0, Math.min(1, (x - THUMB / 2) / usable));
    const v = Math.round((min + raw * (max - min)) / step) * step;
    t.set((v - min) / (max - min));
    if (v !== last.get()) {
      last.set(v);
      scheduleOnRN(emit, v);
    }
  };

  const pan = usePanGesture({
    enabled: !disabled,
    activeOffsetX: [-4, 4],
    onBegin: () => {
      'worklet';
      dragging.set(true);
    },
    onUpdate: (e) => {
      'worklet';
      apply(e.x);
    },
    onFinalize: () => {
      'worklet';
      dragging.set(false);
    },
  });
  const tap = useTapGesture({
    enabled: !disabled,
    onActivate: (e) => {
      'worklet';
      apply(e.x);
    },
  });
  const gesture = useSimultaneousGestures(pan, tap);

  const fill = useAnimatedStyle(() => ({ width: THUMB / 2 + t.get() * Math.max(0, width.get() - THUMB) }));
  const thumb = useAnimatedStyle(() => ({ transform: [{ translateX: t.get() * Math.max(0, width.get() - THUMB) }] }));

  const pct = (value - min) / (max - min);
  return (
    <GestureDetector gesture={gesture}>
      <View
        style={[styles.hit, { opacity: disabled ? 0.4 : 1 }, style]}
        onLayout={(e) => {
          setW(e.nativeEvent.layout.width);
          width.set(e.nativeEvent.layout.width);
        }}
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100), text: accessibilityValueText }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={(e) => {
          const d = e.nativeEvent.actionName === 'increment' ? step : -step;
          onChange(Math.max(min, Math.min(max, value + d)));
        }}
      >
        <View style={[styles.track, { backgroundColor: c.inset }]}>
          <Animated.View style={[styles.fill, { backgroundColor: color ?? c.accent }, fill]} />
        </View>
        {w > 0 ? (
          <Animated.View style={[styles.thumb, { backgroundColor: '#FFFFFF', borderColor: c.hairline }, thumb]} />
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  hit: { height: 44, justifyContent: 'center' },
  track: { height: 8, borderRadius: 4, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  thumb: {
    position: 'absolute',
    left: 0,
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});

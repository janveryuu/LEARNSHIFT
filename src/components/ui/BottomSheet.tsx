import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';

import { spring } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

type Props = {
  visible: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Sheet surface color override (wind-down uses the card color, Shift the bg). */
  surface?: string;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  /** Max width on wide screens (web dashboards). */
  maxWidth?: number;
};

/**
 * In-screen bottom sheet: scrim fades, sheet springs up, drag the grabber
 * (or anywhere on the sheet's top) down to dismiss. Exit animates before unmount.
 */
export function BottomSheet({ visible, onClose, children, surface, style, accessibilityLabel, maxWidth = 560 }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const { height: winH } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const progress = useSharedValue(0);
  const drag = useSharedValue(0);
  const h = useSharedValue(winH);

  if (visible && !mounted) setMounted(true);

  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      drag.set(0);
      progress.set(withSpring(1, spring.smooth));
    } else {
      progress.set(
        withSpring(0, { ...spring.snappy, overshootClamping: true }, (finished) => {
          if (finished) scheduleOnRN(setMounted, false);
        }),
      );
    }
  }, [visible, mounted, progress, drag]);

  const pan = usePanGesture({
    activeOffsetY: [-8, 8],
    onUpdate: (e) => {
      'worklet';
      drag.set(Math.max(0, e.translationY));
    },
    onDeactivate: (e) => {
      'worklet';
      if (e.translationY > 110 || e.velocityY > 900) {
        scheduleOnRN(onClose);
      } else {
        drag.set(withSpring(0, spring.snappy));
      }
    },
  });

  const scrim = useAnimatedStyle(() => ({ opacity: progress.get() }));
  const sheet = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.get()) * (h.get() + 40) + drag.get() }],
  }));

  if (!mounted) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={visible ? 'auto' : 'none'}>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: c.scrim }, scrim]}>
        <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
      </Animated.View>
      <Animated.View
        accessibilityViewIsModal
        accessibilityLabel={accessibilityLabel}
        onLayout={(e) => h.set(e.nativeEvent.layout.height)}
        style={[
          styles.sheet,
          { backgroundColor: surface ?? c.card, paddingBottom: Math.max(insets.bottom, 16), maxWidth },
          style,
          sheet,
        ]}
      >
        <GestureDetector gesture={pan}>
          <View style={styles.handleZone}>
            <View style={[styles.grabber, { backgroundColor: c.textTertiary }]} />
          </View>
        </GestureDetector>
        {children}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    alignSelf: 'center',
    marginHorizontal: 'auto',
    width: '100%',
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    borderCurve: 'continuous',
    paddingHorizontal: space.screen,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -4 },
    elevation: 16,
  },
  handleZone: { alignItems: 'center', paddingTop: 8, paddingBottom: 12 },
  grabber: { width: 36, height: 5, borderRadius: 3 },
});

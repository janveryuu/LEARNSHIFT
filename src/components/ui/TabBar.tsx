import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookOpen, ChartBar, House, Plus, UserCircle, type IconProps } from 'phosphor-react-native';

import { haptic } from '@/design/haptics';
import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import type { Palette } from '@/design/tokens';
import { fontFor } from '@/design/typography';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type TabKey = 'home' | 'learn' | 'insights' | 'profile';

type TabDef = { key: TabKey; label: string; Icon: React.ComponentType<IconProps>; tint: keyof Palette };

const TABS: TabDef[] = [
  { key: 'home', label: 'Home', Icon: House, tint: 'tabHome' },
  { key: 'learn', label: 'Learn', Icon: BookOpen, tint: 'tabLearn' },
  { key: 'insights', label: 'Insights', Icon: ChartBar, tint: 'tabInsights' },
  { key: 'profile', label: 'Profile', Icon: UserCircle, tint: 'tabProfile' },
];

type Props = {
  active: TabKey;
  onTab: (key: TabKey) => void;
  onShift: () => void;
  /** Center button rotated to × while its sheet is open. */
  shiftOpen?: boolean;
  labels?: Partial<Record<TabKey | 'shift', string>>;
  /** Render inline (gallery) instead of pinned to the bottom. */
  inline?: boolean;
};

/** Five-slot bar: four tinted tabs and the raised Shift button in the middle. */
export function TabBar({ active, onTab, onShift, shiftOpen, labels, inline }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const left = TABS.slice(0, 2);
  const right = TABS.slice(2);
  const bottom = inline ? 8 : Math.max(insets.bottom, 10);

  return (
    <View style={inline ? null : styles.pinned} pointerEvents="box-none">
      {!inline ? (
        <LinearGradient
          pointerEvents="none"
          colors={[c.bg + '00', c.bg + 'E6', c.bg]}
          locations={[0, 0.6, 1]}
          style={styles.fade}
        />
      ) : null}
      <View style={[styles.bar, { backgroundColor: c.card, paddingBottom: bottom }]}>
        {left.map((t) => (
          <Tab
            key={t.key}
            def={t}
            active={active === t.key}
            label={labels?.[t.key] ?? t.label}
            onPress={() => onTab(t.key)}
          />
        ))}
        <ShiftButton open={!!shiftOpen} onPress={onShift} label={labels?.shift ?? 'Shift'} />
        {right.map((t) => (
          <Tab
            key={t.key}
            def={t}
            active={active === t.key}
            label={labels?.[t.key] ?? t.label}
            onPress={() => onTab(t.key)}
          />
        ))}
      </View>
    </View>
  );
}

function Tab({ def, active, label, onPress }: { def: TabDef; active: boolean; label: string; onPress: () => void }) {
  const { c } = useTheme();
  const reduced = useReducedMotion();
  const tint = c[def.tint] as string;
  const idle = c.tabIdle;
  const pop = useSharedValue(1);
  const on = useSharedValue(active ? 1 : 0);

  useEffect(() => {
    on.set(withSpring(active ? 1 : 0, spring.snappy));
    if (active && !reduced) {
      pop.set(withSequence(withSpring(1.18, spring.snappy), withSpring(1, spring.bouncy)));
    }
  }, [active, reduced, on, pop]);

  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: pop.get() }] }));
  const colorStyle = useAnimatedStyle(() => ({ opacity: on.get() }));
  const labelStyle = useAnimatedStyle(() => ({ color: interpolateColor(on.get(), [0, 1], [idle, tint]) }));
  const Icon = def.Icon;

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={() => {
        if (!active) haptic.select();
        onPress();
      }}
      style={styles.tab}
    >
      <Animated.View style={[styles.icon, iconStyle]}>
        <Icon size={26} weight="fill" color={idle} />
        <Animated.View style={[StyleSheet.absoluteFill, colorStyle]}>
          <Icon size={26} weight="fill" color={tint} />
        </Animated.View>
      </Animated.View>
      <Animated.Text maxFontSizeMultiplier={1.2} style={[styles.label, labelFont, labelStyle]} numberOfLines={1}>
        {label}
      </Animated.Text>
    </Pressable>
  );
}

function ShiftButton({ open, onPress, label }: { open: boolean; onPress: () => void; label: string }) {
  const { c } = useTheme();
  const r = useSharedValue(0);
  useEffect(() => {
    r.set(withSpring(open ? 1 : 0, spring.snappy));
  }, [open, r]);
  const plus = useAnimatedStyle(() => ({
    transform: [{ rotate: `${r.get() * 45}deg` }, { scale: 1 + r.get() * 0.06 }],
  }));

  return (
    <View style={styles.tab}>
      <PressableScale
        onPress={onPress}
        accessibilityLabel={label}
        style={[styles.shift, { backgroundColor: c.accent, shadowColor: c.accent }]}
      >
        <Animated.View style={plus}>
          <Plus size={26} weight="bold" color={c.onAccent} />
        </Animated.View>
      </PressableScale>
      <Text variant="caption" color="accent" style={styles.shiftLabel} maxFontSizeMultiplier={1.2}>
        {label}
      </Text>
    </View>
  );
}

const labelFont = fontFor(600);

const styles = StyleSheet.create({
  pinned: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  fade: { position: 'absolute', left: 0, right: 0, top: -40, height: 48 },
  bar: { flexDirection: 'row', alignItems: 'flex-end', paddingTop: 8, paddingHorizontal: 6 },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'flex-end', minHeight: 48, gap: 2 },
  icon: { width: 26, height: 26 },
  label: { fontSize: 10, lineHeight: 13 },
  shift: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -22,
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  shiftLabel: { fontSize: 10, lineHeight: 13 },
});

import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { haptic } from '@/design/haptics';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';
import { fontFor } from '@/design/typography';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type LargeTitleProps = {
  title: string;
  action?: { label: string; onPress: () => void };
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
};

/** Left-aligned iOS large title with an optional accent text action. */
export function LargeTitleHeader({ title, action, right, style }: LargeTitleProps) {
  return (
    <View style={[styles.large, style]}>
      <Text variant="largeTitle" accessibilityRole="header" numberOfLines={1} style={styles.flex}>
        {title}
      </Text>
      {action ? <TextAction label={action.label} onPress={action.onPress} /> : null}
      {right}
    </View>
  );
}

type SheetHeaderProps = {
  title?: string;
  left?: { label: string; onPress: () => void };
  /** Right action renders as a gray "Done" pill, like Clucky's sheets. */
  right?: { label: string; onPress: () => void };
  grabber?: boolean;
};

export function SheetHeader({ title, left, right, grabber = true }: SheetHeaderProps) {
  const { c } = useTheme();
  return (
    <View style={styles.sheetWrap}>
      {grabber ? <View style={[styles.grabber, { backgroundColor: c.textTertiary }]} /> : null}
      <View style={styles.sheet}>
        <View style={styles.side}>{left ? <TextAction label={left.label} onPress={left.onPress} muted /> : null}</View>
        <Text variant="headline" align="center" numberOfLines={1} accessibilityRole="header" style={styles.flex}>
          {title ?? ''}
        </Text>
        <View style={[styles.side, styles.sideRight]}>
          {right ? (
            <PressableScale onPress={right.onPress} hitSlop={8} style={[styles.donePill, { backgroundColor: c.inset }]}>
              <Text variant="subhead" color="text" style={styles.doneText}>
                {right.label}
              </Text>
            </PressableScale>
          ) : null}
        </View>
      </View>
    </View>
  );
}

/** Round icon button (back, close, share). 40 px visual, 44 px hit area. */
export function IconButton({
  icon,
  onPress,
  accessibilityLabel,
  tone = 'card',
  style,
}: {
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  tone?: 'card' | 'inset' | 'glass';
  style?: StyleProp<ViewStyle>;
}) {
  const { c } = useTheme();
  const bg = tone === 'card' ? c.card : tone === 'inset' ? c.inset : 'rgba(255,255,255,0.18)';
  return (
    <PressableScale
      onPress={onPress}
      hitSlop={4}
      accessibilityLabel={accessibilityLabel}
      style={[styles.iconBtn, { backgroundColor: bg }, style]}
    >
      {icon}
    </PressableScale>
  );
}

/** Top bar for pushed screens: round back button left, optional actions right. */
export function NavBar({
  onBack,
  backIcon,
  backLabel = 'Back',
  title,
  right,
  tone,
}: {
  onBack: () => void;
  backIcon: ReactNode;
  backLabel?: string;
  title?: string;
  right?: ReactNode;
  tone?: 'card' | 'inset' | 'glass';
}) {
  return (
    <View style={styles.nav}>
      <IconButton icon={backIcon} onPress={onBack} accessibilityLabel={backLabel} tone={tone} />
      <Text variant="headline" align="center" numberOfLines={1} style={styles.flex} accessibilityRole="header">
        {title ?? ''}
      </Text>
      <View style={styles.navRight}>{right}</View>
    </View>
  );
}

export function TextAction({ label, onPress, muted }: { label: string; onPress: () => void; muted?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => {
        haptic.select();
        onPress();
      }}
      hitSlop={12}
      style={({ pressed }) => ({ opacity: pressed ? 0.5 : 1, minHeight: 44, justifyContent: 'center' })}
    >
      <Text variant="subhead" color={muted ? 'textSecondary' : 'accent'} style={styles.actionText}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  large: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.screen,
    paddingTop: 8,
    paddingBottom: 10,
    gap: 12,
  },
  flex: { flex: 1 },
  sheetWrap: { paddingTop: 8, paddingHorizontal: space.screen },
  grabber: { alignSelf: 'center', width: 36, height: 5, borderRadius: 3, opacity: 0.6, marginBottom: 6 },
  sheet: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  side: { width: 80 },
  sideRight: { alignItems: 'flex-end' },
  donePill: { height: 32, paddingHorizontal: 14, borderRadius: radius.pill, justifyContent: 'center' },
  doneText: { fontSize: 14, ...fontFor(600) },
  actionText: { fontSize: 15, ...fontFor(600) },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  nav: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.screen, paddingVertical: 6, gap: 12 },
  navRight: { minWidth: 40, flexDirection: 'row', justifyContent: 'flex-end', gap: 8 },
});

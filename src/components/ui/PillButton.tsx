import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Kind = 'primary' | 'secondary' | 'neutral' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  kind?: Kind;
  size?: Size;
  icon?: ReactNode;
  disabled?: boolean;
  /** Faded accent look, still tappable (Clucky "Open farm" style). */
  soft?: boolean;
  block?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

const heights: Record<Size, number> = { sm: 32, md: 44, lg: 54 };
const pads: Record<Size, number> = { sm: 14, md: 20, lg: 24 };

export function PillButton({
  label,
  onPress,
  kind = 'primary',
  size = 'md',
  icon,
  disabled,
  soft,
  block,
  style,
  accessibilityLabel,
}: Props) {
  const { c } = useTheme();
  const palette: Record<Kind, { bg: string; fg: string }> = {
    primary: { bg: soft ? c.accentFaded : c.accent, fg: c.onAccent },
    secondary: { bg: c.accentTint, fg: c.accent },
    neutral: { bg: c.inset, fg: c.text },
    destructive: { bg: c.accentTint, fg: c.danger },
  };
  const p = palette[kind];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={accessibilityLabel ?? label}
      style={[
        styles.base,
        {
          height: heights[size],
          minHeight: Math.max(heights[size], 32),
          paddingHorizontal: pads[size],
          backgroundColor: p.bg,
          opacity: disabled ? 0.4 : 1,
        },
        block && styles.block,
        style,
      ]}
      hitSlop={size === 'sm' ? 6 : 0}
    >
      <View style={styles.row}>
        {icon}
        <Text variant={size === 'sm' ? 'subhead' : 'headline'} color={p.fg} numberOfLines={1}>
          {label}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: { borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  block: { alignSelf: 'stretch' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
});

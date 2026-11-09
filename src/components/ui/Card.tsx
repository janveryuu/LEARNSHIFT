import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CaretRight } from 'phosphor-react-native';

import { pressScale } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius, space } from '@/design/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

const continuous = Platform.OS === 'ios' ? ({ borderCurve: 'continuous' } as const) : null;

type CardProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padded?: boolean;
  accessibilityLabel?: string;
};

/** White card on the gray canvas. Depth from layering, not shadow. */
export function Card({ children, style, onPress, padded = true, accessibilityLabel }: CardProps) {
  const { c, isNight } = useTheme();
  const base: StyleProp<ViewStyle> = [
    styles.card,
    continuous,
    { backgroundColor: c.card },
    isNight ? styles.nightEdge : styles.dayShadow,
    isNight && { borderColor: c.hairline },
    padded && styles.padded,
    style,
  ];
  if (onPress) {
    return (
      <PressableScale scaleTo={pressScale.card} onPress={onPress} style={base} accessibilityLabel={accessibilityLabel}>
        {children}
      </PressableScale>
    );
  }
  return <View style={base}>{children}</View>;
}

type InsetCardProps = {
  /** Tiny uppercase label, e.g. NEXT BREAK. */
  label?: string;
  value?: string;
  chevron?: boolean;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Gray sub-card that sits inside a white card. */
export function InsetCard({ label, value, chevron, children, style, onPress, accessibilityLabel }: InsetCardProps) {
  const { c } = useTheme();
  const body = (
    <>
      {label ? <Text variant="overline">{label}</Text> : null}
      {value ? (
        <View style={styles.valueRow}>
          <Text variant="headline" numberOfLines={1} style={styles.flex}>
            {value}
          </Text>
          {chevron ? <CaretRight size={16} weight="bold" color={c.text} /> : null}
        </View>
      ) : null}
      {children}
    </>
  );
  const s = [styles.inset, continuous, { backgroundColor: c.inset }, style];
  if (onPress) {
    return (
      <PressableScale
        scaleTo={pressScale.card}
        onPress={onPress}
        style={s}
        accessibilityLabel={accessibilityLabel ?? [label, value].filter(Boolean).join(', ')}
      >
        {body}
      </PressableScale>
    );
  }
  return <View style={s}>{body}</View>;
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: space.card },
  dayShadow: {
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 0,
  },
  nightEdge: { borderWidth: StyleSheet.hairlineWidth },
  inset: { borderRadius: radius.inset, padding: 14, gap: 4 },
  valueRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
});

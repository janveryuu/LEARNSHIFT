import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CaretDown } from 'phosphor-react-native';

import { useTheme } from '@/design/theme';
import { radius, type RiskLevel } from '@/design/tokens';
import { useT } from '@/i18n/useT';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Kind = 'accent' | 'tinted' | 'neutral' | 'outline';

type ChipProps = {
  label: string;
  kind?: Kind;
  icon?: ReactNode;
  selected?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  /** Custom tint (bg) and foreground. */
  tint?: { bg: string; fg: string };
};

export function Chip({ label, kind = 'neutral', icon, selected, onPress, style, tint }: ChipProps) {
  const { c } = useTheme();
  const map: Record<Kind, { bg: string; fg: string; border?: string }> = {
    accent: { bg: c.accent, fg: c.onAccent },
    tinted: { bg: c.accentTint, fg: c.accent },
    neutral: { bg: selected ? c.text : c.inset, fg: selected ? c.card : c.text },
    outline: { bg: 'transparent', fg: c.text, border: c.hairline },
  };
  const p: { bg: string; fg: string; border?: string } = tint ?? map[kind];
  const s: StyleProp<ViewStyle> = [
    styles.chip,
    { backgroundColor: p.bg },
    p.border ? { borderWidth: 1, borderColor: p.border } : null,
    style,
  ];
  const inner = (
    <View style={styles.row}>
      {icon}
      <Text variant="subhead" color={p.fg} style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={s} hitSlop={8} accessibilityState={{ selected }}>
        {inner}
      </PressableScale>
    );
  }
  return <View style={s}>{inner}</View>;
}

/** The small "▾ Demo" chip, reused for the pitch panel. */
export function DevChip({ label = 'Demo', onPress }: { label?: string; onPress?: () => void }) {
  const { c } = useTheme();
  return (
    <Chip
      label={label}
      kind="accent"
      onPress={onPress}
      icon={<CaretDown size={11} weight="fill" color={c.onAccent} />}
      style={styles.dev}
    />
  );
}

export function RiskChip({ level, style }: { level: RiskLevel; style?: StyleProp<ViewStyle> }) {
  const { c, isNight } = useTheme();
  const t = useT();
  const color: Record<RiskLevel, string> = {
    calm: c.success,
    long: c.warning,
    shift: c.accent,
    winddown: c.indigo,
  };
  const fg = color[level];
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={t.risk[level]}
      style={[styles.chip, styles.risk, { backgroundColor: fg + (isNight ? '26' : '1F') }, style]}
    >
      <View style={[styles.dot, { backgroundColor: fg }]} />
      <Text variant="subhead" color={fg} style={styles.label}>
        {t.risk[level]}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    height: 30,
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  label: { fontSize: 13 },
  dev: { height: 26, paddingHorizontal: 10 },
  risk: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 26, paddingHorizontal: 10 },
  dot: { width: 7, height: 7, borderRadius: 4 },
});

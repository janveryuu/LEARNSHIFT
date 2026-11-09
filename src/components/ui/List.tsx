import { Children, Fragment, isValidElement, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { CaretRight } from 'phosphor-react-native';

import { pressScale } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

/** Grouped list card with inset hairline separators. */
export function ListGroup({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { c } = useTheme();
  const rows = Children.toArray(children).filter(isValidElement);
  return (
    <View
      style={[
        styles.group,
        Platform.OS === 'ios' && ({ borderCurve: 'continuous' } as const),
        { backgroundColor: c.card },
        style,
      ]}
    >
      {rows.map((row, i) => (
        <Fragment key={row.key ?? i}>
          {i > 0 ? <View style={[styles.sep, { backgroundColor: c.hairline }]} /> : null}
          {row}
        </Fragment>
      ))}
    </View>
  );
}

type RowProps = {
  title: string;
  value?: string;
  icon?: ReactNode;
  chevron?: boolean;
  destructive?: boolean;
  right?: ReactNode;
  onPress?: () => void;
};

export function ListRow({ title, value, icon, chevron = true, destructive, right, onPress }: RowProps) {
  const { c } = useTheme();
  const body = (
    <View style={styles.row}>
      {icon ? <View style={styles.icon}>{icon}</View> : null}
      <Text variant="body" color={destructive ? 'danger' : 'text'} style={styles.title} numberOfLines={1}>
        {title}
      </Text>
      {value ? (
        <Text variant="body" color="textSecondary" numberOfLines={1}>
          {value}
        </Text>
      ) : null}
      {right}
      {chevron && onPress && !right ? <CaretRight size={14} weight="bold" color={c.textTertiary} /> : null}
    </View>
  );
  if (!onPress) return body;
  return (
    <PressableScale
      scaleTo={pressScale.card}
      onPress={onPress}
      accessibilityLabel={[title, value].filter(Boolean).join(', ')}
    >
      {body}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: { borderRadius: radius.group, overflow: 'hidden' },
  sep: { height: StyleSheet.hairlineWidth, marginLeft: 18 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 52, paddingHorizontal: 18, gap: 10 },
  icon: { width: 24, alignItems: 'center' },
  title: { flex: 1 },
});

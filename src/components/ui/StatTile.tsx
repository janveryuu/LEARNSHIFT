import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { AnimatedNumber } from './AnimatedNumber';
import { Card } from './Card';
import { Text } from './Text';

type Props = {
  label: string;
  value: string | number;
  unit?: string;
  caption?: string;
  icon?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/** Small white tile: icon + label, big number, one gray line. */
export function StatTile({ label, value, unit, caption, icon, onPress, style }: Props) {
  return (
    <Card style={[styles.tile, style]} onPress={onPress} accessibilityLabel={`${label} ${value}${unit ?? ''}`}>
      <View style={styles.head}>
        {icon}
        <Text variant="subhead" color="text" numberOfLines={1} style={styles.flex}>
          {label}
        </Text>
      </View>
      <View style={styles.valueRow}>
        <AnimatedNumber value={value} variant="statNumber" />
        {unit ? (
          <Text variant="headline" style={styles.unit}>
            {unit}
          </Text>
        ) : null}
      </View>
      {caption ? (
        <Text variant="caption" numberOfLines={1}>
          {caption}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, gap: 6, padding: 16 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  flex: { flex: 1 },
  valueRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  unit: { marginBottom: 3 },
});

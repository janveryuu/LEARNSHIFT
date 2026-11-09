import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AnimatedNumber, ProgressBar, Text } from '@/components/ui';
import { useTheme } from '@/design/theme';

/** Skill label, percentage and a bar that springs from `from` to `to`. */
export function MasteryRow({
  label,
  from,
  to,
  color,
  delay = 350,
}: {
  label: string;
  from: number;
  to: number;
  color?: string;
  delay?: number;
}) {
  const { c } = useTheme();
  const [v, setV] = useState(from);
  useEffect(() => {
    const id = setTimeout(() => setV(to), delay);
    return () => clearTimeout(id);
  }, [to, delay]);
  const pct = Math.round(v * 100);
  return (
    <View style={styles.wrap} accessible accessibilityLabel={`${label} ${Math.round(to * 100)}%`}>
      <View style={styles.head}>
        <Text variant="subhead" color="text" style={styles.flex} numberOfLines={1}>
          {label}
        </Text>
        <View style={styles.pct}>
          <AnimatedNumber value={pct} variant="headline" fromZero={false} />
          <Text variant="subhead">%</Text>
        </View>
      </View>
      <ProgressBar progress={v} initial={from} color={color ?? (to >= 0.7 ? c.success : c.accent)} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  head: { flexDirection: 'row', alignItems: 'flex-end' },
  flex: { flex: 1 },
  pct: { flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
});

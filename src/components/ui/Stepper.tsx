import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Minus, Plus } from 'phosphor-react-native';

import { useTheme } from '@/design/theme';

import { AnimatedNumber } from './AnimatedNumber';
import { Card } from './Card';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  label: string;
  value: number;
  onChange: (v: number) => void;
  unit?: string;
  min?: number;
  max?: number;
  step?: number;
  style?: StyleProp<ViewStyle>;
};

/** Clucky-style stepper card: label, big number, unit, – + buttons. */
export function Stepper({ label, value, onChange, unit, min = 0, max = 999, step = 1, style }: Props) {
  const { c } = useTheme();
  const canDec = value - step >= min;
  const canInc = value + step <= max;
  return (
    <Card style={[styles.card, style]}>
      <Text variant="subhead" color="text" style={styles.label}>
        {label}
      </Text>
      <View style={styles.center}>
        <AnimatedNumber
          value={value}
          variant="display"
          fromZero={false}
          accessibilityLabel={`${value} ${unit ?? ''}`}
        />
        {unit ? <Text variant="caption">{unit}</Text> : null}
      </View>
      <View style={styles.buttons}>
        <RoundButton disabled={!canDec} label={`Decrease ${label}`} onPress={() => onChange(value - step)}>
          <Minus size={16} weight="bold" color={canDec ? c.text : c.textTertiary} />
        </RoundButton>
        <RoundButton disabled={!canInc} label={`Increase ${label}`} onPress={() => onChange(value + step)}>
          <Plus size={16} weight="bold" color={canInc ? c.text : c.textTertiary} />
        </RoundButton>
      </View>
    </Card>
  );
}

function RoundButton({
  children,
  onPress,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onPress: () => void;
  disabled: boolean;
  label: string;
}) {
  const { c } = useTheme();
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      hitSlop={4}
      style={[styles.round, { backgroundColor: c.inset }]}
    >
      {children}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'stretch', gap: 6 },
  label: { alignSelf: 'flex-start' },
  center: { alignItems: 'center', gap: 0 },
  buttons: { flexDirection: 'row', justifyContent: 'center', gap: 28, marginTop: 6 },
  round: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});

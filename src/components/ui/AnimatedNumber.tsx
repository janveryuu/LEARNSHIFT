import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import { spring, useReducedMotion } from '@/design/motion';
import { variants, type Variant } from '@/design/typography';

import { Text, type TextProps } from './Text';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

type Props = {
  value: string | number;
  variant?: Variant;
  color?: TextProps['color'];
  style?: StyleProp<ViewStyle>;
  /** Roll from 0 on mount. Default true. */
  fromZero?: boolean;
  accessibilityLabel?: string;
};

/**
 * Digit-wheel number. Each digit is a clipped column of 0–9 that springs to
 * its value; non-digits (":", "h", ",") render as static glyphs.
 */
export function AnimatedNumber({
  value,
  variant = 'statNumber',
  color,
  style,
  fromZero = true,
  accessibilityLabel,
}: Props) {
  const text = String(value);
  const chars = text.split('');
  const line = variants[variant].line;
  return (
    <View
      style={[styles.row, style]}
      accessible
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel ?? text}
    >
      {chars.map((ch, i) => {
        // Key by position from the right so units/tens keep their wheel.
        const key = `${chars.length - i}`;
        if (ch >= '0' && ch <= '9') {
          return <Digit key={key} digit={Number(ch)} variant={variant} color={color} line={line} fromZero={fromZero} />;
        }
        return (
          <Text key={key + ch} variant={variant} color={color} importantForAccessibility="no">
            {ch}
          </Text>
        );
      })}
    </View>
  );
}

function Digit({
  digit,
  variant,
  color,
  line,
  fromZero,
}: {
  digit: number;
  variant: Variant;
  color: TextProps['color'];
  line: number;
  fromZero: boolean;
}) {
  const reduced = useReducedMotion();
  const pos = useSharedValue(fromZero && !reduced ? 0 : digit);

  useEffect(() => {
    pos.set(reduced ? digit : withSpring(digit, spring.smooth));
  }, [digit, reduced, pos]);

  const column = useAnimatedStyle(() => ({ transform: [{ translateY: -pos.get() * line }] }));

  return (
    <View style={{ height: line, overflow: 'hidden' }} importantForAccessibility="no-hide-descendants">
      {/* Invisible sizer keeps the width of the real digit. */}
      <Text variant={variant} style={styles.sizer}>
        {digit}
      </Text>
      <Animated.View style={[styles.column, column]}>
        {DIGITS.map((d) => (
          <Text key={d} variant={variant} color={color} style={{ height: line }}>
            {d}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end' },
  sizer: { opacity: 0 },
  column: { position: 'absolute', top: 0, left: 0, right: 0, alignItems: 'center' },
});

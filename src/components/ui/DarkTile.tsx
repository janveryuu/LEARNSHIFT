import type { ReactNode } from 'react';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { pressScale } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { radius } from '@/design/tokens';

import { PressableScale } from './PressableScale';
import { Text } from './Text';

type Props = {
  title: string;
  status?: string;
  /** Status in accent (e.g. "On") instead of gray. */
  statusAccent?: boolean;
  /** Illustration that bleeds off the bottom-right corner. */
  art?: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  height?: number;
};

/** Near-black feature tile with a two-line label and corner illustration. */
export function DarkTile({ title, status, statusAccent, art, onPress, style, height = 120 }: Props) {
  const { c } = useTheme();
  const content = (
    <>
      <View style={styles.label}>
        <Text variant="headline" color={c.tileDarkText} numberOfLines={1}>
          {title}
        </Text>
        {status ? (
          <Text variant="subhead" color={statusAccent ? c.spark : c.tileDarkSecondary} numberOfLines={1}>
            {status}
          </Text>
        ) : null}
      </View>
      {art ? (
        <View style={styles.art} pointerEvents="none">
          {art}
        </View>
      ) : null}
    </>
  );
  const s = [
    styles.tile,
    Platform.OS === 'ios' && ({ borderCurve: 'continuous' } as const),
    { backgroundColor: c.tileDark, height },
    style,
  ];
  if (onPress) {
    return (
      <PressableScale
        scaleTo={pressScale.card}
        onPress={onPress}
        style={s}
        accessibilityLabel={[title, status].filter(Boolean).join(', ')}
      >
        {content}
      </PressableScale>
    );
  }
  return <View style={s}>{content}</View>;
}

const styles = StyleSheet.create({
  tile: { borderRadius: radius.tile, overflow: 'hidden', padding: 16 },
  label: { gap: 2, maxWidth: '70%', zIndex: 1 },
  art: { position: 'absolute', right: -8, bottom: -8 },
});

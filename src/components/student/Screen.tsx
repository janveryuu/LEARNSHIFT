import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/design/theme';
import { space } from '@/design/tokens';

/** Space the floating tab bar (and its fade) takes at the bottom of a tab screen. */
export function useTabInset(): number {
  const insets = useSafeAreaInsets();
  return 104 + insets.bottom;
}

type Props = {
  children: ReactNode;
  /** Fixed header above the scroll area (NavBar). */
  header?: ReactNode;
  /** Leaves room for the tab bar. */
  tabs?: boolean;
  /** Content is inside a modal sheet: no top safe-area inset. */
  sheet?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
  scroll?: boolean;
  /** Overlays (sheets, toasts) rendered above the scroll view. */
  overlay?: ReactNode;
};

/** Canvas + safe areas + a centered, max-width column. */
export function Screen({ children, header, tabs, sheet, contentStyle, scroll = true, overlay }: Props) {
  const { c } = useTheme();
  const insets = useSafeAreaInsets();
  const tabInset = useTabInset();
  const bottom = tabs ? tabInset : Math.max(insets.bottom, 16) + 24;
  return (
    <View style={[styles.root, { backgroundColor: c.bg, paddingTop: sheet ? 0 : insets.top }]}>
      {header}
      {scroll ? (
        <ScrollView
          style={styles.root}
          contentContainerStyle={[styles.content, { paddingBottom: bottom }, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.root, styles.content, { paddingBottom: bottom }, contentStyle]}>{children}</View>
      )}
      {overlay}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: space.screen, gap: space.gap, width: '100%', maxWidth: 560, alignSelf: 'center' },
});

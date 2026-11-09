import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { useTheme } from '@/design/theme';
import type { Palette } from '@/design/tokens';
import { maxScaleFor, textStyle, type Variant } from '@/design/typography';

type ColorKey = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];

export type TextProps = RNTextProps & {
  variant?: Variant;
  /** A palette key (`textSecondary`) or a raw color. */
  color?: ColorKey | (string & {});
  align?: 'left' | 'center' | 'right';
  tabular?: boolean;
};

const defaultColor: Partial<Record<Variant, ColorKey>> = {
  overline: 'textSecondary',
  caption: 'textSecondary',
  subhead: 'textSecondary',
};

export function Text({ variant = 'body', color, align, tabular, style, ...rest }: TextProps) {
  const { c } = useTheme();
  const key = color ?? defaultColor[variant] ?? 'text';
  const resolved = key in c ? (c[key as ColorKey] as string) : key;
  return (
    <RNText
      maxFontSizeMultiplier={maxScaleFor(variant)}
      {...rest}
      style={[
        textStyle(variant),
        { color: resolved },
        align ? { textAlign: align } : null,
        tabular ? { fontVariant: ['tabular-nums'] } : null,
        style,
      ]}
    />
  );
}

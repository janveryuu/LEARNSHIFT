import { Platform, type TextStyle } from 'react-native';

export type Weight = 500 | 600 | 700 | 800;

/**
 * iOS uses the system font (SF Pro) with numeric weights.
 * Android and web use Inter, one family per weight, because Android ignores
 * fontWeight on custom fonts.
 */
const interFamily: Record<Weight, string> = {
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
};

export function fontFor(weight: Weight): TextStyle {
  if (Platform.OS === 'ios') {
    return { fontWeight: String(weight) as TextStyle['fontWeight'] };
  }
  return { fontFamily: interFamily[weight], fontWeight: 'normal' };
}

type VariantSpec = {
  size: number;
  line: number;
  weight: Weight;
  tracking: number;
  upper?: boolean;
  tabular?: boolean;
  /** Cap Dynamic Type growth for display sizes so heroes never wrap. */
  maxScale: number;
};

export const variants = {
  display: { size: 56, line: 58, weight: 800, tracking: -2, tabular: true, maxScale: 1.1 },
  displayUnit: { size: 20, line: 22, weight: 800, tracking: -0.4, tabular: true, maxScale: 1.1 },
  largeTitle: { size: 34, line: 40, weight: 800, tracking: -0.9, maxScale: 1.2 },
  title: { size: 22, line: 26, weight: 700, tracking: -0.4, maxScale: 1.3 },
  headline: { size: 17, line: 22, weight: 700, tracking: -0.3, maxScale: 1.4 },
  body: { size: 15, line: 20, weight: 500, tracking: -0.1, maxScale: 1.4 },
  subhead: { size: 13, line: 17, weight: 500, tracking: 0, maxScale: 1.4 },
  caption: { size: 11, line: 14, weight: 500, tracking: 0, maxScale: 1.4 },
  overline: { size: 11, line: 13, weight: 700, tracking: 0.6, upper: true, maxScale: 1.3 },
  statNumber: { size: 30, line: 32, weight: 800, tracking: -1, tabular: true, maxScale: 1.15 },
} as const satisfies Record<string, VariantSpec>;

export type Variant = keyof typeof variants;

const cache = new Map<Variant, TextStyle>();

export function textStyle(variant: Variant): TextStyle {
  const hit = cache.get(variant);
  if (hit) return hit;
  const v: VariantSpec = variants[variant];
  const style: TextStyle = {
    fontSize: v.size,
    lineHeight: v.line,
    letterSpacing: v.tracking,
    ...fontFor(v.weight),
    ...(v.upper ? { textTransform: 'uppercase' } : null),
    ...(v.tabular ? { fontVariant: ['tabular-nums'] } : null),
  };
  cache.set(variant, style);
  return style;
}

export function maxScaleFor(variant: Variant): number {
  return variants[variant].maxScale;
}

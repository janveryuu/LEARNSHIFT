/**
 * LearnShift design tokens. Every color, radius and spacing value in the app
 * comes from here. Two complete palettes: Day (light) and Night (wind-down).
 */

export type Palette = {
  bg: string;
  card: string;
  inset: string;
  tileDark: string;
  tileDarkText: string;
  tileDarkSecondary: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  hairline: string;
  accent: string;
  accentTint: string;
  accentFaded: string;
  onAccent: string;
  spark: string;
  sparkDeep: string;
  success: string;
  warning: string;
  danger: string;
  indigo: string;
  tabHome: string;
  tabLearn: string;
  tabInsights: string;
  tabProfile: string;
  tabIdle: string;
  chartIdle: string;
  heat: readonly [string, string, string, string, string];
  shadow: string;
  scrim: string;
  /** Mascot fur colors shift slightly at night so Tarsi never glows. */
  fur: string;
  furDeep: string;
  furLight: string;
};

export const day: Palette = {
  bg: '#EFEFEF',
  card: '#FFFFFF',
  inset: '#F3F3F3',
  tileDark: '#161616',
  tileDarkText: '#FFFFFF',
  tileDarkSecondary: '#8E8E93',
  text: '#111111',
  textSecondary: '#8A8A8E',
  textTertiary: '#B8B8BC',
  hairline: 'rgba(0,0,0,0.06)',
  accent: '#C8400F',
  accentTint: '#F7DED3',
  accentFaded: '#E9A487',
  onAccent: '#FFFFFF',
  spark: '#FFB21E',
  sparkDeep: '#FF8A00',
  success: '#2FBF5B',
  warning: '#FF9F0A',
  danger: '#E5484D',
  indigo: '#6E6AF0',
  tabHome: '#E5483B',
  tabLearn: '#2FBF5B',
  tabInsights: '#1E9BF0',
  tabProfile: '#8E5BEF',
  tabIdle: '#B4B4B8',
  chartIdle: '#DCDCDC',
  heat: ['#EDE6E2', '#F2C3AE', '#E58A63', '#D1592A', '#B13A0C'],
  shadow: '#000000',
  scrim: 'rgba(0,0,0,0.32)',
  fur: '#A8714A',
  furDeep: '#7A4C2E',
  furLight: '#F3E2C8',
};

export const night: Palette = {
  bg: '#0D1020',
  card: '#161A2C',
  inset: '#1E2338',
  tileDark: '#232845',
  tileDarkText: '#ECE8E1',
  tileDarkSecondary: '#8C90A6',
  text: '#ECE8E1',
  textSecondary: '#8C90A6',
  textTertiary: '#545A75',
  hairline: 'rgba(236,232,225,0.07)',
  accent: '#F2A65A',
  accentTint: '#3A3140',
  accentFaded: '#7A5D4A',
  onAccent: '#1A1410',
  spark: '#F5C46B',
  sparkDeep: '#E0A24A',
  success: '#5CC98A',
  warning: '#E9B25E',
  danger: '#E88A86',
  indigo: '#8F8BF5',
  tabHome: '#F2A65A',
  tabLearn: '#5CC98A',
  tabInsights: '#7DB8F0',
  tabProfile: '#B39AF2',
  tabIdle: '#545A75',
  chartIdle: '#2A3049',
  heat: ['#22273D', '#4A3F3F', '#8A6443', '#C98A4E', '#F2A65A'],
  shadow: '#000000',
  scrim: 'rgba(5,6,14,0.55)',
  fur: '#8E6448',
  furDeep: '#5E4130',
  furLight: '#D9C7AE',
};

export const radius = {
  card: 28,
  inset: 20,
  tile: 24,
  group: 22,
  sheet: 32,
  pill: 999,
  sm: 12,
} as const;

/** 4-pt grid. */
export const space = {
  xxs: 4,
  xs: 8,
  sm: 12,
  md: 16,
  screen: 20,
  card: 18,
  gap: 12,
  section: 28,
  xl: 40,
} as const;

export const touch = { min: 44 } as const;

export const iconSize = { tab: 24, inline: 20, small: 16 } as const;

export type RiskLevel = 'calm' | 'long' | 'shift' | 'winddown';

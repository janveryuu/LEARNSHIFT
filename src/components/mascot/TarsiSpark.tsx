import { useId } from 'react';
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import { useTheme } from '@/design/theme';

export type SparkState = 'done' | 'today' | 'future' | 'rest';

type Props = { state: SparkState; size?: number };

/**
 * Small Tarsi-head face used in the streak row.
 * done: glowing spark gradient · today: outline face · future: gray blank
 * rest: soft gray face (a past day without a break; never shown as failure).
 */
export function TarsiSpark({ state, size = 38 }: Props) {
  const { c } = useTheme();
  const id = 'sg' + useId().replace(/[^a-zA-Z0-9]/g, '');
  const fill =
    state === 'done' ? `url(#${id})` : state === 'today' ? c.card : state === 'rest' ? c.chartIdle : c.chartIdle;
  const stroke = state === 'today' ? c.textTertiary : 'none';
  const face = state !== 'future';
  const eye = state === 'done' ? '#3A1F05' : state === 'rest' ? c.textSecondary : c.text;

  return (
    <Svg width={size} height={size} viewBox="0 0 40 40">
      <Defs>
        <LinearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={c.spark} />
          <Stop offset="1" stopColor={c.sparkDeep} />
        </LinearGradient>
      </Defs>
      {/* Head silhouette: ears + round head as one path. */}
      <Path
        d="M9.5 6.5 a5.5 5.5 0 0 1 7.2 2.6 a13 13 0 0 1 6.6 0 a5.5 5.5 0 1 1 7.6 6.9 A13.5 13.5 0 1 1 8.6 16 a5.5 5.5 0 0 1 0.9 -9.5 Z"
        fill={fill}
        stroke={stroke}
        strokeWidth={1.6}
      />
      {face ? (
        <>
          <Circle cx={15} cy={21} r={state === 'today' ? 4.2 : 3.4} fill={eye} />
          <Circle cx={25} cy={21} r={state === 'today' ? 4.2 : 3.4} fill={eye} />
          <Circle cx={13.9} cy={19.8} r={1.2} fill="#FFFFFF" />
          <Circle cx={23.9} cy={19.8} r={1.2} fill="#FFFFFF" />
          {state === 'done' ? (
            <Path d="M17.5 27.5 Q20 30 22.5 27.5" stroke={eye} strokeWidth={1.6} strokeLinecap="round" fill="none" />
          ) : state === 'rest' ? (
            <Path d="M18 28 L22 28" stroke={eye} strokeWidth={1.4} strokeLinecap="round" />
          ) : (
            <Circle cx={20} cy={28} r={1.3} fill={eye} />
          )}
        </>
      ) : null}
      {state === 'done' ? <Path d="M33 3 L34 6 L37 7 L34 8 L33 11 L32 8 L29 7 L32 6 Z" fill={c.spark} /> : null}
    </Svg>
  );
}

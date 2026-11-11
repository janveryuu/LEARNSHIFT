import Svg, { G, Path, Rect } from 'react-native-svg';

import { useTheme } from '@/design/theme';
import { L_FULL, PATY_PALETTE as PAL } from './patySprite';

export type SparkState = 'done' | 'today' | 'future' | 'rest';

type Props = { state: SparkState; size?: number };

/** Head-only runs (hair, face, glasses), cut at the chin. */
const HEAD = L_FULL.filter(([, y]) => y <= 28);
const EYES: [number, number][] = [
  [11, 19],
  [22, 19],
];

/**
 * Small pixel Paty head used in the streak row.
 * done: full colour + spark · today: outlined blank · future: gray blank
 * rest: soft gray face (a past day without a break; never shown as failure).
 */
export function PatySpark({ state, size = 38 }: Props) {
  const { c } = useTheme();
  const colorFor = (k: string) => {
    if (state === 'done') return PAL[k];
    if (state === 'today') return k === 'K' || k === 'G' ? c.textTertiary : c.card;
    if (state === 'rest') return k === 'K' || k === 'G' ? c.textTertiary : c.chartIdle;
    return k === 'K' ? c.chartIdle : c.chartIdle;
  };
  const eye = state === 'done' ? PAL.K : state === 'future' ? null : c.textSecondary;

  return (
    <Svg width={size} height={size} viewBox="1 -1 34 34">
      <G>
        {HEAD.map(([x, y, w, k], i) => (
          <Rect key={i} x={x} y={y} width={w + 0.04} height={1.04} fill={colorFor(k)} />
        ))}
      </G>
      {eye
        ? EYES.map(([x, y]) => (
            <G key={x}>
              <Rect x={x} y={y} width={3} height={3} fill={eye} />
              {state === 'done' ? <Rect x={x} y={y} width={1} height={1} fill="#FFFFFF" /> : null}
            </G>
          ))
        : null}
      {state === 'done' ? (
        <>
          <Rect x={16} y={25} width={1} height={1} fill={PAL.M} />
          <Rect x={17} y={26} width={3} height={1} fill={PAL.M} />
          <Rect x={20} y={25} width={1} height={1} fill={PAL.M} />
          <Path d="M31 -0.5 L32 2.5 L34.8 3.5 L32 4.5 L31 7.5 L30 4.5 L27.2 3.5 L30 2.5 Z" fill={c.spark} />
        </>
      ) : null}
    </Svg>
  );
}

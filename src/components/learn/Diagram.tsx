import { Platform, View } from 'react-native';
import Svg, { Circle, G, Line, Path, Polygon, Rect, Text as SvgText } from 'react-native-svg';

import type { DiagramSpec } from '@/data/lessons';
import { useTheme } from '@/design/theme';
import type { Palette } from '@/design/tokens';

type Props = {
  spec: DiagramSpec;
  width?: number;
  /** Draw for a dark immersive surface (Feed). */
  onDark?: boolean;
  accessibilityLabel?: string;
};

const FONT = Platform.OS === 'ios' ? undefined : 'Inter_700Bold';

/**
 * Flat, one-idea diagrams for concept cards and the Feed. Each kind is a
 * tiny SVG that reads at a glance: bars, pies, number lines, a balance…
 */
export function Diagram({ spec, width = 280, onDark, accessibilityLabel }: Props) {
  const { c } = useTheme();
  const ink = onDark ? '#F4EFE8' : c.text;
  const soft = onDark ? 'rgba(255,255,255,0.14)' : c.inset;
  const line = onDark ? 'rgba(255,255,255,0.35)' : c.textTertiary;
  const h = heightFor(spec, width);
  return (
    <View accessible={!!accessibilityLabel} accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Svg width={width} height={h}>
        {draw(spec, width, h, { c, ink, soft, line })}
      </Svg>
    </View>
  );
}

function heightFor(spec: DiagramSpec, w: number): number {
  switch (spec.kind) {
    case 'bar':
    case 'sum':
      return 84;
    case 'bars':
      return spec.rows.length * 50 + 6;
    case 'pie':
      return Math.min(150, w * 0.55);
    case 'numberline':
      return 96;
    case 'balance':
      return 132;
    case 'tiles':
      return 96;
    case 'ratio':
      return 96;
    case 'triangle':
      return 140;
    case 'grid':
      return 120;
  }
}

type Ink = { c: Palette; ink: string; soft: string; line: string };

function label(
  x: number,
  y: number,
  text: string,
  color: string,
  size = 15,
  anchor: 'start' | 'middle' | 'end' = 'middle',
) {
  return (
    <SvgText
      key={`${text}-${x}-${y}`}
      x={x}
      y={y}
      fill={color}
      fontSize={size}
      fontWeight="700"
      fontFamily={FONT}
      textAnchor={anchor}
    >
      {text}
    </SvgText>
  );
}

function segBar(
  x: number,
  y: number,
  w: number,
  h: number,
  parts: number,
  fill: (i: number) => string,
  stroke: string,
) {
  const gap = 4;
  const sw = (w - gap * (parts - 1)) / parts;
  return Array.from({ length: parts }, (_, i) => (
    <Rect
      key={i}
      x={x + i * (sw + gap)}
      y={y}
      width={sw}
      height={h}
      rx={8}
      fill={fill(i)}
      stroke={stroke}
      strokeWidth={0}
    />
  ));
}

function draw(spec: DiagramSpec, w: number, h: number, k: Ink) {
  const { c, ink, soft, line } = k;
  switch (spec.kind) {
    case 'bar': {
      const bw = w - 8;
      return (
        <G>
          {segBar(4, 6, bw, 46, spec.parts, (i) => (i < spec.filled ? c.accent : soft), line)}
          {label(w / 2, 78, `${spec.filled}/${spec.parts}`, ink, 16)}
        </G>
      );
    }
    case 'bars': {
      const lw = 44;
      return (
        <G>
          {spec.rows.map((r, i) => (
            <G key={i}>
              {label(4, i * 50 + 30, r.label, ink, 15, 'start')}
              {segBar(
                lw,
                i * 50 + 6,
                w - lw - 4,
                38,
                r.parts,
                (j) => (j < r.filled ? (i === 0 ? c.accent : c.success) : soft),
                line,
              )}
            </G>
          ))}
        </G>
      );
    }
    case 'sum': {
      const lw = 56;
      const bw = w - lw - 8;
      return (
        <G>
          {segBar(
            4,
            6,
            bw,
            46,
            spec.parts,
            (i) => (i < spec.a ? c.accent : i < spec.a + spec.b ? c.success : soft),
            line,
          )}
          {label(bw + 8 + lw / 2, 36, `= ${spec.label}`, ink, 16)}
          {label(4 + (bw * spec.a) / spec.parts / 2, 78, `${spec.a}/${spec.parts}`, c.accent, 13)}
          {label(4 + (bw * (spec.a + spec.b / 2)) / spec.parts, 78, `${spec.b}/${spec.parts}`, c.success, 13)}
        </G>
      );
    }
    case 'pie': {
      const r = h / 2 - 6;
      const cx = w / 2;
      const cy = h / 2;
      return (
        <G>
          {Array.from({ length: spec.parts }, (_, i) => {
            const a0 = (i / spec.parts) * Math.PI * 2 - Math.PI / 2;
            const a1 = ((i + 1) / spec.parts) * Math.PI * 2 - Math.PI / 2;
            const x0 = cx + r * Math.cos(a0);
            const y0 = cy + r * Math.sin(a0);
            const x1 = cx + r * Math.cos(a1);
            const y1 = cy + r * Math.sin(a1);
            const large = a1 - a0 > Math.PI ? 1 : 0;
            return (
              <Path
                key={i}
                d={`M${cx},${cy} L${x0},${y0} A${r},${r} 0 ${large} 1 ${x1},${y1} Z`}
                fill={i < spec.filled ? c.accent : soft}
                stroke={c.card}
                strokeWidth={3}
              />
            );
          })}
          {label(cx + r + 30, cy + 6, `1/${spec.parts}`, ink, 16)}
        </G>
      );
    }
    case 'numberline': {
      const pad = 18;
      const n = spec.to - spec.from;
      const xAt = (v: number) => pad + ((v - spec.from) / n) * (w - pad * 2);
      const y = 62;
      const end = spec.start + spec.jump;
      const x0 = xAt(spec.start);
      const x1 = xAt(end);
      const arcH = Math.min(46, Math.abs(x1 - x0) * 0.5 + 12);
      return (
        <G>
          <Line x1={pad - 8} y1={y} x2={w - pad + 8} y2={y} stroke={line} strokeWidth={3} strokeLinecap="round" />
          {Array.from({ length: n + 1 }, (_, i) => {
            const v = spec.from + i;
            const x = xAt(v);
            return (
              <G key={i}>
                <Line
                  x1={x}
                  y1={y - 6}
                  x2={x}
                  y2={y + 6}
                  stroke={v === 0 ? ink : line}
                  strokeWidth={v === 0 ? 3 : 2}
                  strokeLinecap="round"
                />
                {label(x, y + 26, String(v).replace('-', '−'), v === end && spec.jump ? c.accent : ink, 12)}
              </G>
            );
          })}
          {spec.jump !== 0 ? (
            <Path
              d={`M${x0},${y - 8} Q${(x0 + x1) / 2},${y - 8 - arcH * 2} ${x1},${y - 8}`}
              stroke={c.accent}
              strokeWidth={3}
              fill="none"
              strokeLinecap="round"
              strokeDasharray="1 7"
            />
          ) : null}
          <Circle cx={x0} cy={y} r={8} fill={c.tabInsights} stroke={c.card} strokeWidth={2} />
          {spec.jump !== 0 ? <Circle cx={x1} cy={y} r={8} fill={c.accent} stroke={c.card} strokeWidth={2} /> : null}
        </G>
      );
    }
    case 'balance': {
      const cx = w / 2;
      const beamY = 56;
      const span = Math.min(110, w / 2 - 34);
      return (
        <G>
          <Polygon points={`${cx},${beamY} ${cx - 22},${beamY + 58} ${cx + 22},${beamY + 58}`} fill={soft} />
          <Rect x={cx - span - 30} y={beamY - 4} width={(span + 30) * 2} height={8} rx={4} fill={ink} />
          {[-1, 1].map((s) => (
            <G key={s}>
              <Line x1={cx + s * span} y1={beamY} x2={cx + s * span} y2={beamY - 8} stroke={ink} strokeWidth={3} />
              <Rect
                x={cx + s * span - 46}
                y={beamY - 50}
                width={92}
                height={40}
                rx={14}
                fill={s < 0 ? c.accent : c.success}
              />
              {label(cx + s * span, beamY - 24, s < 0 ? spec.left : spec.right, '#FFFFFF', 17)}
            </G>
          ))}
          {label(cx, beamY + 78, '=', ink, 18)}
        </G>
      );
    }
    case 'tiles': {
      const tw = 28;
      const th = 70;
      const total = spec.x + spec.ones;
      const gap = 8;
      const width = spec.x * (tw + gap) + spec.ones * (26 + gap) + (spec.ones && spec.x ? 18 : 0);
      let x = (w - width) / 2;
      const out = [];
      for (let i = 0; i < spec.x; i++) {
        out.push(
          <G key={`x${i}`}>
            <Rect x={x} y={8} width={tw} height={th} rx={8} fill={c.accent} />
            {label(x + tw / 2, 50, 'x', '#FFFFFF', 15)}
          </G>,
        );
        x += tw + gap;
      }
      if (spec.ones && spec.x) {
        out.push(label(x + 2, 50, '+', ink, 18));
        x += 18;
      }
      for (let i = 0; i < spec.ones; i++) {
        out.push(<Rect key={`o${i}`} x={x} y={50} width={26} height={26} rx={7} fill={c.success} />);
        x += 26 + gap;
      }
      return <G key={total}>{out}</G>;
    }
    case 'ratio': {
      const items = [
        ...Array.from({ length: spec.a }, () => 'a' as const),
        ...Array.from({ length: spec.b }, () => 'b' as const),
      ];
      const r = 24;
      const gap = 18;
      const width = items.length * (r * 2) + (items.length - 1) * gap + 24;
      let x = (w - width) / 2 + r;
      return (
        <G>
          {items.map((it, i) => {
            const cx = x + (i >= spec.a ? 24 : 0);
            x += r * 2 + gap;
            return (
              <G key={i}>
                <Circle cx={cx} cy={40} r={r} fill={it === 'a' ? c.spark : c.tabInsights} />
                {it === 'a' ? (
                  <Path d={`M${cx - 13},${36} h26 a13,13 0 0 1 -26,0 Z`} fill="#FFFFFF" opacity={0.9} />
                ) : (
                  <Path
                    d={`M${cx},${26} C${cx + 9},${38} ${cx + 10},${44} ${cx},${52} C${cx - 10},${44} ${cx - 9},${38} ${cx},${26} Z`}
                    fill="#FFFFFF"
                    opacity={0.9}
                  />
                )}
              </G>
            );
          })}
          {label(w / 2, 90, `${spec.a} : ${spec.b}`, ink, 16)}
        </G>
      );
    }
    case 'triangle': {
      const ax = w / 2;
      const ay = 12;
      const bx = w / 2 - 92;
      const by = 118;
      const cx2 = w / 2 + 92;
      return (
        <G>
          <Polygon
            points={`${ax},${ay} ${bx},${by} ${cx2},${by}`}
            fill={soft}
            stroke={ink}
            strokeWidth={3}
            strokeLinejoin="round"
          />
          <Circle cx={ax} cy={ay + 18} r={9} fill={c.accent} />
          <Circle cx={bx + 22} cy={by - 9} r={9} fill={c.success} />
          <Circle cx={cx2 - 22} cy={by - 9} r={9} fill={c.tabInsights} />
          {label(w / 2, by + 20, '= 180°', ink, 15)}
        </G>
      );
    }
    case 'grid': {
      const s = 24;
      const gw = spec.w * s;
      const x0 = (w - gw) / 2;
      return (
        <G>
          {Array.from({ length: spec.w * spec.h }, (_, i) => (
            <Rect
              key={i}
              x={x0 + (i % spec.w) * s}
              y={8 + Math.floor(i / spec.w) * s}
              width={s - 3}
              height={s - 3}
              rx={5}
              fill={i % 3 === 0 ? c.accent : c.accentFaded}
            />
          ))}
          {label(w / 2, 8 + spec.h * s + 22, `${spec.w} × ${spec.h} = ${spec.w * spec.h}`, ink, 15)}
        </G>
      );
    }
  }
}

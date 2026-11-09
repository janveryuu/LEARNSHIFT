import { useEffect, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { GestureDetector, usePanGesture, usePinchGesture, useSimultaneousGestures } from 'react-native-gesture-handler';
import Svg, { Circle, Ellipse, G, Line, Polygon, Rect } from 'react-native-svg';

import { BUILDINGS, type BuildingId } from '@/data/seed';
import { spring, useReducedMotion } from '@/design/motion';
import { useTheme } from '@/design/theme';
import { useL } from '@/i18n/useT';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedG = Animated.createAnimatedComponent(G);

const N = 7;
const TW = 56;
const TH = 28;
const VW = 420;
const VH = 286;
const OX = VW / 2;
const OY = 56;

/** Island mask: a 7×7 grid with the corners rounded off. */
const LAND = (col: number, row: number) => {
  const d = Math.abs(col - 3) + Math.abs(row - 3);
  return d <= 4 && !(col === 0 && row === 0) && !(col === 6 && row === 6);
};

export const iso = (col: number, row: number) => ({
  x: OX + (col - row) * (TW / 2),
  y: OY + (col + row) * (TH / 2),
});

type Pal = {
  grassA: string;
  grassB: string;
  side: string;
  sideDeep: string;
  water: string;
  waterRing: string;
  night: boolean;
};

function palette(night: boolean): Pal {
  return night
    ? {
        grassA: '#3B5A46',
        grassB: '#35523F',
        side: '#5B4A3A',
        sideDeep: '#463829',
        water: '#1A2340',
        waterRing: '#222C4E',
        night,
      }
    : {
        grassA: '#BFE3A5',
        grassB: '#B2DA97',
        side: '#D9B98A',
        sideDeep: '#C29E6C',
        water: '#CFE9F2',
        waterRing: '#E2F3F8',
        night,
      };
}

type P = { x: number; y: number };
const pts = (arr: P[]) => arr.map((q) => `${q.x},${q.y}`).join(' ');

/** Footprint corners of a w×d (cells) box centered at (x, y), lifted by `lift`. */
function footprint(x: number, y: number, w: number, d: number, lift = 0) {
  const qx = TW / 4;
  const qy = TH / 4;
  return {
    n: { x: x + (d - w) * qx, y: y - (w + d) * qy - lift },
    e: { x: x + (w + d) * qx, y: y + (w - d) * qy - lift },
    s: { x: x + (w - d) * qx, y: y + (w + d) * qy - lift },
    w: { x: x - (w + d) * qx, y: y + (d - w) * qy - lift },
  };
}

/** Iso box: left, right and top faces. `w` along columns, `d` along rows. */
function Box({
  x,
  y,
  w,
  d,
  h,
  top,
  left,
  right,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h: number;
  top: string;
  left: string;
  right: string;
}) {
  const b = footprint(x, y, w, d);
  const t = footprint(x, y, w, d, h);
  return (
    <G>
      <Polygon points={pts([t.w, t.s, b.s, b.w])} fill={left} />
      <Polygon points={pts([t.s, t.e, b.e, b.s])} fill={right} />
      <Polygon points={pts([t.n, t.e, t.s, t.w])} fill={top} />
    </G>
  );
}

/** Four-sided roof whose eaves sit at (x, y) and rise to a peak. */
function Roof({
  x,
  y,
  w,
  d,
  peak,
  left,
  right,
  top,
}: {
  x: number;
  y: number;
  w: number;
  d: number;
  h?: number;
  peak: number;
  left: string;
  right: string;
  top: string;
}) {
  const b = footprint(x, y, w + 0.18, d + 0.18);
  const pk = { x, y: y - peak };
  return (
    <G>
      <Polygon points={pts([b.n, b.e, pk])} fill={top} />
      <Polygon points={pts([b.w, b.n, pk])} fill={top} />
      <Polygon points={pts([b.w, b.s, pk])} fill={left} />
      <Polygon points={pts([b.s, b.e, pk])} fill={right} />
    </G>
  );
}

function Building({ id, x, y, night }: { id: BuildingId; x: number; y: number; night: boolean }) {
  const dim = (day: string, nightC: string) => (night ? nightC : day);
  const shadow = <Ellipse cx={x} cy={y + 2} rx={22} ry={9} fill="#000" opacity={night ? 0.25 : 0.1} />;
  switch (id) {
    case 'bahay':
      return (
        <G>
          {shadow}
          {[-10, 10].map((dx) => (
            <Line
              key={dx}
              x1={x + dx}
              y1={y}
              x2={x + dx}
              y2={y - 10}
              stroke={dim('#8A6338', '#5E4630')}
              strokeWidth={3}
            />
          ))}
          <Box
            x={x}
            y={y - 8}
            w={1.1}
            d={1.1}
            h={18}
            top={dim('#E6C88F', '#9C8763')}
            left={dim('#D4B074', '#85704F')}
            right={dim('#C29C60', '#776345')}
          />
          <Rect x={x + 3} y={y - 26} width={7} height={9} fill={dim('#7A5326', '#3D2C1A')} rx={1} />
          {night ? <Rect x={x + 4} y={y - 25} width={5} height={7} fill="#F5C46B" opacity={0.8} rx={1} /> : null}
          <Roof
            x={x}
            y={y - 26}
            w={1.1}
            d={1.1}
            h={0}
            peak={26}
            top={dim('#B58B45', '#7A6038')}
            left={dim('#A27A38', '#6D552F')}
            right={dim('#8E6A2E', '#5F4A29')}
          />
        </G>
      );
    case 'mango':
      return (
        <G>
          {shadow}
          <Rect x={x - 3} y={y - 22} width={6} height={22} rx={2} fill={dim('#8A5A2B', '#5E4130')} />
          <Circle cx={x} cy={y - 34} r={18} fill={dim('#4FAF5B', '#2F6B45')} />
          <Circle cx={x - 12} cy={y - 26} r={11} fill={dim('#5DBB66', '#357550')} />
          <Circle cx={x + 12} cy={y - 28} r={12} fill={dim('#46A352', '#2B6340')} />
          {[
            [-6, -32],
            [7, -38],
            [10, -24],
            [-12, -22],
          ].map(([dx, dy], i) => (
            <Ellipse key={i} cx={x + dx} cy={y + dy} rx={3} ry={4} fill={dim('#FFC23A', '#C9A04A')} />
          ))}
        </G>
      );
    case 'sarisari':
      return (
        <G>
          {shadow}
          <Box
            x={x}
            y={y}
            w={1.1}
            d={0.9}
            h={22}
            top={dim('#F2E2C4', '#8C8170')}
            left={dim('#E8D3AE', '#7D7262')}
            right={dim('#DDC497', '#706657')}
          />
          <Box
            x={x}
            y={y - 22}
            w={1.25}
            d={1.05}
            h={4}
            top={dim('#D1592A', '#9A5A3A')}
            left={dim('#B84A20', '#844C31')}
            right={dim('#A33F19', '#76432B')}
          />
          {[0, 1, 2].map((i) => (
            <Rect
              key={i}
              x={x + 2 + i * 6}
              y={y - 14}
              width={4}
              height={5}
              fill={i % 2 ? '#FFFFFF' : dim('#E5483B', '#A6534A')}
            />
          ))}
          <Rect x={x + 1} y={y - 9} width={18} height={4} rx={1} fill={dim('#7A5326', '#3D2C1A')} />
        </G>
      );
    case 'school':
      return (
        <G>
          {shadow}
          <Box
            x={x}
            y={y}
            w={1.6}
            d={1}
            h={26}
            top={dim('#F4EFE6', '#8E8A82')}
            left={dim('#E9E1D3', '#7F7A71')}
            right={dim('#DCD2C0', '#726D64')}
          />
          {[0, 1, 2].map((i) => (
            <Rect
              key={i}
              x={x + 4 + i * 9}
              y={y - 18 + i * 4.5 - 4}
              width={5}
              height={6}
              fill={night ? '#F5C46B' : '#9BC6E8'}
              opacity={night ? 0.8 : 1}
            />
          ))}
          <Roof
            x={x}
            y={y - 26}
            w={1.6}
            d={1}
            h={0}
            peak={16}
            top={dim('#C8400F', '#8C4A2E')}
            left={dim('#B13A0C', '#7D4129')}
            right={dim('#9A320A', '#6F3A24')}
          />
          <Line x1={x - 22} y1={y - 8} x2={x - 22} y2={y - 52} stroke={dim('#9A9A9A', '#666')} strokeWidth={2} />
          <Rect x={x - 22} y={y - 52} width={13} height={8} fill={dim('#1E9BF0', '#4A6E99')} />
        </G>
      );
    case 'garden':
      return (
        <G>
          {shadow}
          {[
            [-12, -4],
            [0, -10],
            [12, -4],
            [-4, 4],
            [8, 4],
          ].map(([dx, dy], i) => (
            <G key={i}>
              <Circle cx={x + dx} cy={y + dy - 6} r={8} fill={dim('#3E9A4B', '#2B6340')} />
              <Circle cx={x + dx - 3} cy={y + dy - 9} r={2.2} fill="#FFFFFF" opacity={night ? 0.7 : 1} />
              <Circle cx={x + dx + 3} cy={y + dy - 5} r={2.2} fill="#FFFFFF" opacity={night ? 0.7 : 1} />
            </G>
          ))}
        </G>
      );
    case 'carabao':
      return (
        <G>
          {shadow}
          <Ellipse cx={x} cy={y - 12} rx={16} ry={10} fill={dim('#6E6A6A', '#4A4747')} />
          <Circle cx={x + 15} cy={y - 16} r={7} fill={dim('#5E5A5A', '#403D3D')} />
          <Ellipse
            cx={x + 15}
            cy={y - 24}
            rx={10}
            ry={3}
            fill="none"
            stroke={dim('#DCD2C0', '#8E8A82')}
            strokeWidth={2.5}
          />
          {[-9, -3, 5, 11].map((dx) => (
            <Rect key={dx} x={x + dx} y={y - 4} width={3} height={7} fill={dim('#5E5A5A', '#403D3D')} />
          ))}
        </G>
      );
    case 'jeepney':
      return (
        <G>
          {shadow}
          <Box
            x={x}
            y={y - 4}
            w={1.4}
            d={0.6}
            h={14}
            top={dim('#F4EFE6', '#8E8A82')}
            left={dim('#1E9BF0', '#3E6488')}
            right={dim('#1786D1', '#355878')}
          />
          <Box
            x={x}
            y={y - 18}
            w={1.4}
            d={0.6}
            h={3}
            top={dim('#FFB21E', '#B58B45')}
            left={dim('#E5483B', '#8C4A42')}
            right={dim('#C93B30', '#7A3F38')}
          />
          {[
            [-12, 2],
            [8, 8],
          ].map(([dx, dy], i) => (
            <Circle key={i} cx={x + dx} cy={y + dy - 2} r={4} fill="#222" />
          ))}
        </G>
      );
    case 'library':
      return (
        <G>
          {shadow}
          <Box
            x={x}
            y={y}
            w={1.5}
            d={1.1}
            h={28}
            top={dim('#E8DCC8', '#857C6E')}
            left={dim('#DDCEB4', '#786F62')}
            right={dim('#CFBE9F', '#6B6357')}
          />
          {[0, 1, 2, 3].map((i) => (
            <Rect key={i} x={x + 3 + i * 7} y={y - 24 + i * 3.4} width={3} height={18} fill="#FFFFFF" opacity={0.75} />
          ))}
          <Roof
            x={x}
            y={y - 28}
            w={1.5}
            d={1.1}
            h={0}
            peak={12}
            top={dim('#6E6AF0', '#4F4C99')}
            left={dim('#5D59D6', '#47448A')}
            right={dim('#4E4BBE', '#3F3C7B')}
          />
        </G>
      );
    case 'terraces':
      return (
        <G>
          {[0, 1, 2].map((i) => (
            <Box
              key={i}
              x={x}
              y={y - i * 8}
              w={1.4 - i * 0.35}
              d={1.4 - i * 0.35}
              h={8}
              top={dim(['#9CCB5E', '#8BC34A', '#7CB342'][i], ['#4E6B35', '#47632F', '#405A2A'][i])}
              left={dim('#A68A5B', '#5E4D35')}
              right={dim('#937A4F', '#53442F')}
            />
          ))}
        </G>
      );
    case 'lighthouse':
      return (
        <G>
          {shadow}
          <Polygon points={`${x - 9},${y} ${x + 9},${y} ${x + 6},${y - 52} ${x - 6},${y - 52}`} fill="#FFFFFF" />
          {[0, 1].map((i) => (
            <Polygon
              key={i}
              points={`${x - 8.4 + i * 1.6},${y - 12 - i * 20} ${x + 8.4 - i * 1.6},${y - 12 - i * 20} ${x + 7.8 - i * 1.6},${y - 22 - i * 20} ${x - 7.8 + i * 1.6},${y - 22 - i * 20}`}
              fill={dim('#E5483B', '#A6534A')}
            />
          ))}
          <Rect x={x - 7} y={y - 62} width={14} height={10} rx={2} fill={night ? '#F5C46B' : '#FFE08A'} />
          <Polygon points={`${x - 9},${y - 62} ${x + 9},${y - 62} ${x},${y - 72}`} fill={dim('#333', '#222')} />
        </G>
      );
  }
}

type Props = {
  built: BuildingId[];
  width: number;
  /** Pinch, pan and tap. */
  interactive?: boolean;
  onBuildingPress?: (id: BuildingId) => void;
  /** Building that just went up: it fades in with a dust ring. */
  fresh?: BuildingId | null;
  overlay?: ReactNode;
};

/** "Your little isla": isometric island on a checker grid that grows with coins. */
export function IslaScene({ built, width, interactive, onBuildingPress, fresh, overlay }: Props) {
  const { isNight } = useTheme();
  const L = useL();
  const p = palette(isNight);
  const height = (width * VH) / VW;

  const tiles: { col: number; row: number }[] = [];
  for (let r = 0; r < N; r++) for (let c2 = 0; c2 < N; c2++) if (LAND(c2, r)) tiles.push({ col: c2, row: r });

  const placed = BUILDINGS.filter((b) => built.includes(b.id)).sort(
    (a, b) => a.cell[0] + a.cell[1] - (b.cell[0] + b.cell[1]),
  );

  const svg = (
    <Svg width={width} height={height} viewBox={`0 0 ${VW} ${VH}`}>
      <Ellipse cx={OX} cy={OY + 3 * TH + 8} rx={VW * 0.49} ry={VH * 0.36} fill={p.waterRing} />
      <Ellipse cx={OX} cy={OY + 3 * TH + 8} rx={VW * 0.44} ry={VH * 0.31} fill={p.water} />
      {tiles.map(({ col, row }) => {
        const { x, y } = iso(col, row);
        // Side faces on the outer edge so the island has thickness.
        const edgeS = !LAND(col, row + 1);
        const edgeE = !LAND(col + 1, row);
        return (
          <G key={`s${col}-${row}`}>
            {edgeS ? (
              <Polygon
                points={`${x - TW / 2},${y + TH / 2} ${x},${y + TH} ${x},${y + TH + 14} ${x - TW / 2},${y + TH / 2 + 14}`}
                fill={p.side}
              />
            ) : null}
            {edgeE ? (
              <Polygon
                points={`${x},${y + TH} ${x + TW / 2},${y + TH / 2} ${x + TW / 2},${y + TH / 2 + 14} ${x},${y + TH + 14}`}
                fill={p.sideDeep}
              />
            ) : null}
          </G>
        );
      })}
      {tiles.map(({ col, row }) => {
        const { x, y } = iso(col, row);
        return (
          <Polygon
            key={`t${col}-${row}`}
            points={`${x},${y} ${x + TW / 2},${y + TH / 2} ${x},${y + TH} ${x - TW / 2},${y + TH / 2}`}
            fill={(col + row) % 2 ? p.grassA : p.grassB}
          />
        );
      })}
      {placed.map((b) => {
        const { x, y } = iso(b.cell[0], b.cell[1]);
        const cy = y + TH / 2 + 4;
        return (
          <G key={b.id}>
            {fresh === b.id ? <Fresh x={x} y={cy} /> : null}
            <FadeG fresh={fresh === b.id}>
              <Building id={b.id} x={x} y={cy} night={p.night} />
            </FadeG>
          </G>
        );
      })}
    </Svg>
  );

  // Tap targets for buildings (SVG press events are unreliable on web).
  const k = width / VW;
  const scene = (
    <View style={{ width, height }}>
      {svg}
      {onBuildingPress
        ? placed.map((b) => {
            const { x, y } = iso(b.cell[0], b.cell[1]);
            return (
              <Pressable
                key={b.id}
                onPress={() => onBuildingPress(b.id)}
                accessibilityRole="button"
                accessibilityLabel={L(b.name)}
                style={[styles.hit, { left: (x - 28) * k, top: (y - 50) * k, width: 56 * k, height: 72 * k }]}
              />
            );
          })
        : null}
    </View>
  );

  if (!interactive) return scene;
  return (
    <Zoomable width={width} height={height} overlay={overlay}>
      {scene}
    </Zoomable>
  );
}

function FadeG({ fresh, children }: { fresh: boolean; children: ReactNode }) {
  const o = useSharedValue(fresh ? 0 : 1);
  useEffect(() => {
    if (fresh) o.set(withDelay(150, withSpring(1, spring.bouncy)));
  }, [fresh, o]);
  const props = useAnimatedProps(() => ({ opacity: o.get() }));
  return <AnimatedG animatedProps={props}>{children}</AnimatedG>;
}

function Fresh({ x, y }: { x: number; y: number }) {
  const t = useSharedValue(0);
  useEffect(() => {
    t.set(withTiming(1, { duration: 900 }));
  }, [t]);
  const props = useAnimatedProps(() => ({ r: 6 + t.get() * 46, opacity: (1 - t.get()) * 0.8 }));
  return <AnimatedCircle cx={x} cy={y} fill="none" stroke="#FFFFFF" strokeWidth={4} animatedProps={props} />;
}

function Zoomable({
  width,
  height,
  children,
  overlay,
}: {
  width: number;
  height: number;
  children: ReactNode;
  overlay?: ReactNode;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(1);
  const base = useSharedValue(1);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const sx = useSharedValue(0);
  const sy = useSharedValue(0);

  const clampPan = (v: number, limit: number) => {
    'worklet';
    return Math.max(-limit, Math.min(limit, v));
  };

  const pan = usePanGesture({
    minDistance: 6,
    onBegin: () => {
      'worklet';
      sx.set(tx.get());
      sy.set(ty.get());
    },
    onUpdate: (e) => {
      'worklet';
      const s = scale.get();
      tx.set(clampPan(sx.get() + e.translationX, (width * (s - 0.6)) / 2));
      ty.set(clampPan(sy.get() + e.translationY, (height * (s - 0.6)) / 2));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.get() <= 1.01) {
        tx.set(withSpring(0, spring.smooth));
        ty.set(withSpring(0, spring.smooth));
      }
    },
  });
  const pinch = usePinchGesture({
    onBegin: () => {
      'worklet';
      base.set(scale.get());
    },
    onUpdate: (e) => {
      'worklet';
      scale.set(Math.max(0.85, Math.min(2.6, base.get() * e.scale)));
    },
    onDeactivate: () => {
      'worklet';
      if (scale.get() < 1) scale.set(withSpring(1, spring.smooth));
    },
  });
  const gesture = useSimultaneousGestures(pan, pinch);

  const s = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.get() },
      { translateY: ty.get() },
      { scale: reduced ? Math.max(1, scale.get()) : scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View style={[styles.clip, { width, height }]}>
        <Animated.View style={s}>{children}</Animated.View>
        {overlay}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  clip: { overflow: 'hidden' },
  hit: { position: 'absolute' },
});

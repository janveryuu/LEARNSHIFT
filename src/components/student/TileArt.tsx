import { useId } from 'react';
import Svg, { Circle, Defs, Ellipse, G, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';

/**
 * Soft 3D-style illustrations that bleed off the corner of dark tiles:
 * gradient bodies, a top highlight and a contact shadow.
 */
type Art = { size?: number };

const useGid = () => useId().replace(/[^a-zA-Z0-9]/g, '');

export function MoonArt({ size = 92 }: Art) {
  const id = useGid();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <RadialGradient id={`m${id}`} cx="35%" cy="30%" r="75%">
          <Stop offset="0" stopColor="#FFF4C7" />
          <Stop offset="0.55" stopColor="#F5C46B" />
          <Stop offset="1" stopColor="#C98A2E" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={52} cy={92} rx={30} ry={5} fill="#000" opacity={0.35} />
      <Path d="M62 14 A36 36 0 1 0 86 66 A28 28 0 1 1 62 14 Z" fill={`url(#m${id})`} />
      <Circle cx={30} cy={22} r={3} fill="#FFF4C7" />
      <Circle cx={18} cy={44} r={2} fill="#FFF4C7" opacity={0.8} />
      <Circle cx={80} cy={24} r={2.5} fill="#FFF4C7" opacity={0.9} />
    </Svg>
  );
}

export function LanguageArt({ size = 92 }: Art) {
  const id = useGid();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`a${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#7CC4FA" />
          <Stop offset="1" stopColor="#1E78C8" />
        </LinearGradient>
        <LinearGradient id={`b${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#FFB98F" />
          <Stop offset="1" stopColor="#D1592A" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={52} cy={93} rx={32} ry={5} fill="#000" opacity={0.35} />
      <Rect x={10} y={16} width={56} height={40} rx={14} fill={`url(#a${id})`} />
      <Path d="M22 54 L20 68 L34 56 Z" fill="#1E78C8" />
      <Rect x={16} y={20} width={44} height={6} rx={3} fill="#FFFFFF" opacity={0.35} />
      <Rect x={38} y={44} width={54} height={38} rx={14} fill={`url(#b${id})`} />
      <Path d="M80 80 L84 92 L70 82 Z" fill="#B44A1E" />
      <Rect x={46} y={48} width={38} height={5} rx={2.5} fill="#FFFFFF" opacity={0.35} />
      <Rect x={22} y={32} width={30} height={5} rx={2.5} fill="#FFFFFF" />
      <Rect x={50} y={60} width={30} height={5} rx={2.5} fill="#FFFFFF" />
      <Rect x={50} y={69} width={20} height={5} rx={2.5} fill="#FFFFFF" opacity={0.8} />
    </Svg>
  );
}

export function ShieldArt({ size = 92 }: Art) {
  const id = useGid();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`s${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#8BE3A8" />
          <Stop offset="1" stopColor="#1F9A4A" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={50} cy={93} rx={28} ry={5} fill="#000" opacity={0.35} />
      <Path d="M50 8 L84 20 V48 C84 70 68 84 50 90 C32 84 16 70 16 48 V20 Z" fill={`url(#s${id})`} />
      <Path d="M50 8 L84 20 V48 C84 70 68 84 50 90 Z" fill="#000" opacity={0.12} />
      <Path
        d="M34 48 L46 60 L68 36"
        stroke="#FFFFFF"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </Svg>
  );
}

export function BooksArt({ size = 92 }: Art) {
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Ellipse cx={50} cy={92} rx={36} ry={5} fill="#000" opacity={0.35} />
      {[
        { y: 66, c: '#E5483B', d: '#B8352B', w: 70 },
        { y: 48, c: '#FFB21E', d: '#D48A00', w: 62 },
        { y: 30, c: '#2FBF5B', d: '#1F8F42', w: 66 },
      ].map((b, i) => (
        <G key={i}>
          <Rect x={50 - b.w / 2} y={b.y} width={b.w} height={18} rx={4} fill={b.c} />
          <Rect x={50 - b.w / 2} y={b.y + 12} width={b.w} height={6} rx={3} fill={b.d} />
          <Rect x={50 + b.w / 2 - 14} y={b.y + 3} width={10} height={9} rx={2} fill="#FFF7E6" />
        </G>
      ))}
      <Path d="M70 10 L78 26 L62 26 Z" fill="#FFFFFF" opacity={0.9} />
    </Svg>
  );
}

export function FeedArt({ size = 110 }: Art) {
  const id = useGid();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`f${id}`} x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor="#FF9E6B" />
          <Stop offset="1" stopColor="#C8400F" />
        </LinearGradient>
      </Defs>
      <Rect x={44} y={6} width={44} height={74} rx={10} fill="#3A3A3E" transform="rotate(8 66 43)" />
      <Rect x={22} y={14} width={46} height={78} rx={11} fill={`url(#f${id})`} />
      <Rect x={28} y={64} width={30} height={5} rx={2.5} fill="#FFFFFF" />
      <Rect x={28} y={74} width={20} height={5} rx={2.5} fill="#FFFFFF" opacity={0.7} />
      <Path d="M38 34 L54 44 L38 54 Z" fill="#FFFFFF" />
    </Svg>
  );
}

export function TutorArt({ size = 92 }: Art) {
  const id = useGid();
  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Defs>
        <LinearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#B39AF2" />
          <Stop offset="1" stopColor="#6B44D8" />
        </LinearGradient>
      </Defs>
      <Ellipse cx={50} cy={93} rx={30} ry={5} fill="#000" opacity={0.35} />
      <Rect x={12} y={18} width={72} height={52} rx={18} fill={`url(#t${id})`} />
      <Path d="M28 66 L24 84 L44 68 Z" fill="#6B44D8" />
      <Circle cx={34} cy={44} r={5} fill="#FFFFFF" />
      <Circle cx={50} cy={44} r={5} fill="#FFFFFF" />
      <Circle cx={66} cy={44} r={5} fill="#FFFFFF" />
      <Rect x={20} y={22} width={50} height={6} rx={3} fill="#FFFFFF" opacity={0.3} />
    </Svg>
  );
}

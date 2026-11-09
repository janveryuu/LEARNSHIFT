import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

import { inWindow, nowMinutes, useAppStore } from '@/store/useAppStore';

import { day, night, type Palette } from './tokens';

export type Mode = 'day' | 'night';

export type Theme = {
  mode: Mode;
  isNight: boolean;
  c: Palette;
};

const ThemeContext = createContext<Theme | null>(null);

function themeFor(mode: Mode): Theme {
  return { mode, isNight: mode === 'night', c: mode === 'night' ? night : day };
}

const DAY = themeFor('day');
const NIGHT = themeFor('night');

/** Resolves the app-wide mode from the user preference and the bedtime window. */
export function useResolvedMode(): Mode {
  const pref = useAppStore((s) => s.themePref);
  const bedtime = useAppStore((s) => s.bedtime);
  const clock = useAppStore((s) => s.demo.clock);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    if (pref !== 'auto' || clock != null) return;
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, [pref, clock]);

  return useMemo(() => {
    if (pref === 'day' || pref === 'night') return pref;
    return inWindow(nowMinutes(clock), bedtime) ? 'night' : 'day';
    // tick re-evaluates the real clock once a minute
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pref, bedtime, clock, tick]);
}

/**
 * Provides the theme. With no `mode`, follows the app-wide resolved mode.
 * Nest with an explicit `mode` to render a subtree in a fixed theme
 * (the gallery shows Day and Night side by side this way).
 */
export function ThemeProvider({ mode, children }: { mode?: Mode; children: ReactNode }) {
  const resolved = useResolvedMode();
  const m = mode ?? resolved;
  return <ThemeContext.Provider value={m === 'night' ? NIGHT : DAY}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  const t = useContext(ThemeContext);
  return t ?? DAY;
}

import { useAppStore, type Lang } from '@/store/useAppStore';

import en, { type Strings } from './en';
import fil from './fil';

const tables: Record<Lang, Strings> = { en, fil };

/** Bilingual content string (lessons, questions, tutor bank). */
export type LText = { en: string; fil: string };

export function useT(): Strings {
  const lang = useAppStore((s) => s.lang);
  return tables[lang];
}

export function useLang(): Lang {
  return useAppStore((s) => s.lang);
}

export function stringsFor(lang: Lang): Strings {
  return tables[lang];
}

export function pick(text: LText, lang: Lang): string {
  return text[lang];
}

/** Returns a picker bound to the current language: `L(skill.name)`. */
export function useL(): (text: LText) => string {
  const lang = useLang();
  return (text) => text[lang];
}

/** "10:00 PM" from minutes after midnight. */
export function formatClock(minutes: number): string {
  const m = ((minutes % 1440) + 1440) % 1440;
  const h = Math.floor(m / 60);
  const mm = String(m % 60).padStart(2, '0');
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${mm} ${h < 12 ? 'AM' : 'PM'}`;
}

/** "2h 14m" from minutes. */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

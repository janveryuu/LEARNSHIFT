/**
 * Build flavours:
 *   real (default) — accounts, Supabase, real usage data.
 *   pitch          — EXPO_PUBLIC_PITCH=1: the offline Mika demo with the Demo
 *                    panel, for showing all four scenarios on stage in minutes.
 */
export const IS_PITCH = process.env.EXPO_PUBLIC_PITCH === '1';

export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_KEY = process.env.EXPO_PUBLIC_SUPABASE_KEY ?? '';

/** Names used in pitch mode copy. */
export const PITCH_NAMES = { student: 'Mika', guardian: 'Mom', section: 'Sampaguita' };

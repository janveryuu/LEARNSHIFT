import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

import { SUPABASE_KEY, SUPABASE_URL } from './config';

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    // AsyncStorage on native, localStorage on web.
    storage: Platform.OS === 'web' && typeof window === 'undefined' ? undefined : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh the session only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

/** Turns Supabase / PostgREST / function errors into one short sentence. */
export function errorText(e: unknown, fallback = 'Something went wrong. Try again.'): string {
  if (!e) return fallback;
  const msg = typeof e === 'string' ? e : ((e as { message?: string }).message ?? '');
  if (/network|fetch|Failed to fetch|timeout/i.test(msg)) return 'No connection. Check your internet and try again.';
  if (/Invalid login credentials/i.test(msg)) return 'Wrong email or password.';
  if (/already registered/i.test(msg)) return 'That email already has an account. Sign in instead.';
  if (/Password should be/i.test(msg)) return 'Use at least 6 characters for the password.';
  if (/valid email|invalid format/i.test(msg)) return 'Check the email address.';
  if (/rate limit|Too many/i.test(msg)) return msg.includes('Too many') ? msg : 'Too many tries. Wait a minute.';
  return msg && msg.length < 140 ? msg : fallback;
}

/** Reads the `{ error }` body an edge function returned with a non-2xx status. */
export async function functionError(error: unknown): Promise<string> {
  const ctx = (error as { context?: Response })?.context;
  if (ctx && typeof ctx.json === 'function') {
    try {
      const body = await ctx.json();
      if (body?.error) return String(body.error);
    } catch {
      // fall through
    }
  }
  return errorText(error);
}

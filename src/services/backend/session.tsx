/**
 * Glue between the signed-in account and the app: keeps the local store on
 * the right user, starts student sync, registers for push, and routes
 * notification taps. Renders nothing.
 */
import { useEffect } from 'react';

import { IS_PITCH } from '@/lib/config';
import { useMonitorBridge } from '@/services/monitor/bridge';
import { configureNotifications, registerForPush, routeNotificationTaps } from '@/services/notifications';
import { initialState, useAppStore } from '@/store/useAppStore';
import { startAuth, useAuth } from '@/store/useAuth';

import { startStudentSync } from './sync';

export function SessionEffects() {
  const profile = useAuth((s) => s.profile);
  const id = profile?.id ?? null;
  const role = profile?.role ?? null;
  useMonitorBridge(!IS_PITCH && role === 'student' ? id : null);

  useEffect(() => {
    if (IS_PITCH) return;
    configureNotifications();
    startAuth();
    return routeNotificationTaps();
  }, []);

  // Keep the store on the signed-in user; a different user starts clean.
  useEffect(() => {
    if (IS_PITCH) return;
    const s = useAppStore.getState();
    if (!id) {
      if (s.userId) s.hydrate({ ...initialState(), lang: s.lang, themePref: s.themePref });
      return;
    }
    if (s.userId !== id) s.hydrate({ ...initialState(), lang: s.lang, themePref: s.themePref, userId: id });
    const p = useAuth.getState().profile!;
    useAppStore.getState().hydrate({
      role: p.role,
      lang: p.lang,
      studentName: p.role === 'student' ? p.display_name : '',
      // Guardians and teachers finish setup inside their own home screens.
      ...(p.role !== 'student' ? { onboarded: true } : {}),
    });
  }, [id]);

  useEffect(() => {
    if (IS_PITCH || !id || role !== 'student') return;
    return startStudentSync(id);
  }, [id, role]);

  useEffect(() => {
    if (IS_PITCH || !id) return;
    registerForPush();
  }, [id]);

  return null;
}

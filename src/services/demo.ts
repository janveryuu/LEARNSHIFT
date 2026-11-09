import { router } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';
import { useSession } from '@/store/useSession';

export type ScenarioId = 1 | 2 | 3 | 4;

const later = (ms: number, fn: () => void) => setTimeout(fn, ms);

/**
 * Pitch scenarios. Each sets the demo clock and context, returns to Home,
 * then opens the screen that plays the moment.
 */
export function runScenario(id: ScenarioId) {
  const app = useAppStore.getState();
  const session = useSession.getState();
  app.setRole('student');
  app.setPaused(false);
  session.setShiftOpen(false);
  session.setFocusUntil(null);
  session.bumpScenario();
  session.setLockRequestId(null);

  switch (id) {
    case 1:
      // School-day afternoon: ShortVids fast-forwards, check-in, then a break.
      app.setThemePref('auto');
      app.setDemo({ clock: 18 * 60, schoolDay: true, risk: null });
      session.setSimMinutes(0);
      router.dismissTo('/home');
      later(380, () => router.push({ pathname: '/simulate', params: { auto: '1' } }));
      break;
    case 2:
      // 11:30 PM on a school night: the app crossfades to Night, wind-down opens.
      app.setThemePref('auto');
      app.setDemo({ clock: 23 * 60 + 30, schoolDay: true, risk: null });
      session.setSimMinutes(28);
      router.dismissTo('/home');
      later(1300, () => router.push({ pathname: '/winddown', params: { alert: '1' } }));
      break;
    case 3:
      // Mom switched on the guardian lock; it is very late and risk is high.
      app.setThemePref('auto');
      app.setGuardian({ lockEnabled: true });
      app.setDemo({ clock: 23 * 60 + 50, schoolDay: true, risk: 0.9 });
      router.dismissTo('/home');
      later(1100, () => router.push('/lock'));
      break;
    case 4:
      // A quiz miss in the afternoon: preset wrong answer, then the Tutor.
      app.setThemePref('auto');
      app.setDemo({ clock: 16 * 60 + 15, schoolDay: true, risk: null });
      session.setSimMinutes(0);
      router.dismissTo('/home');
      later(380, () => router.push({ pathname: '/quiz/[skillId]', params: { skillId: 'fractions', preset: 'wrong' } }));
      break;
  }
}

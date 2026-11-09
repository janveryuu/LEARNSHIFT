import { Redirect } from 'expo-router';

import { IS_PITCH } from '@/lib/config';
import type { Role } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

/**
 * Keeps each role's screens for that role. Returns a redirect when someone
 * signed out, or signed in as another role, lands here (e.g. from a link).
 */
export function useRoleGate(role: Role) {
  const status = useAuth((s) => s.status);
  const mine = useAuth((s) => s.profile?.role);
  if (IS_PITCH) return null;
  if (status !== 'signedIn') return <Redirect href="/onboarding" />;
  if (mine && mine !== role) return <Redirect href="/" />;
  return null;
}

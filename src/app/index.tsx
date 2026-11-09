import { Redirect } from 'expo-router';

import { IS_PITCH } from '@/lib/config';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

/** Entry: sign-up / onboarding first, then each role's home. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const storeRole = useAppStore((s) => s.role);
  const status = useAuth((s) => s.status);
  const profileRole = useAuth((s) => s.profile?.role);
  const role = IS_PITCH ? storeRole : profileRole;

  if (!IS_PITCH && status !== 'signedIn') return <Redirect href="/onboarding" />;
  if (role === 'guardian') return <Redirect href="/guardian" />;
  if (role === 'teacher') return <Redirect href="/teacher" />;
  if (!onboarded) return <Redirect href="/onboarding" />;
  return <Redirect href="/home" />;
}

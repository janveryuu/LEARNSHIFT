import { Redirect } from 'expo-router';

import { useAppStore } from '@/store/useAppStore';

/** Entry: onboarding first, then each role's home. */
export default function Index() {
  const onboarded = useAppStore((s) => s.onboarded);
  const role = useAppStore((s) => s.role);
  if (!onboarded) return <Redirect href="/onboarding" />;
  if (role === 'guardian') return <Redirect href="/guardian" />;
  if (role === 'teacher') return <Redirect href="/teacher" />;
  return <Redirect href="/home" />;
}

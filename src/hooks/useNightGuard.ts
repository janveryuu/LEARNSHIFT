import { useEffect } from 'react';
import { router } from 'expo-router';

import { useLive } from './useLive';

/**
 * Policy guardrail as a route guard: never a quiz or learning break inside
 * the bedtime window. Those screens hand over to wind-down instead.
 */
export function useNightGuard() {
  const late = useLive().risk.lateNight;
  useEffect(() => {
    if (late) router.replace('/winddown');
  }, [late]);
}

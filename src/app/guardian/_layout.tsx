import { Stack } from 'expo-router';

import { useTheme } from '@/design/theme';
import { useRoleGate } from '@/hooks/useRoleGate';

export default function GuardianLayout() {
  const { c } = useTheme();
  const gate = useRoleGate('guardian');
  if (gate) return gate;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}

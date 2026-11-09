import { Stack } from 'expo-router';

import { useTheme } from '@/design/theme';

/** Student stack: tabs at the root, everything else pushed or presented over them. */
export default function StudentLayout() {
  const { c } = useTheme();
  const sheet = { presentation: 'modal' as const, contentStyle: { backgroundColor: c.bg } };
  const full = { presentation: 'fullScreenModal' as const, animation: 'fade' as const };
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="simulate" options={{ animation: 'fade', contentStyle: { backgroundColor: '#000' } }} />
      <Stack.Screen name="break/[id]" options={sheet} />
      <Stack.Screen name="quiz/[skillId]" />
      <Stack.Screen name="tutor" options={sheet} />
      <Stack.Screen name="skill/[id]" options={sheet} />
      <Stack.Screen name="feed" options={{ ...full, contentStyle: { backgroundColor: '#0B0D14' } }} />
      <Stack.Screen name="isla" />
      <Stack.Screen name="isla-how" options={sheet} />
      <Stack.Screen name="focus" />
      <Stack.Screen name="winddown" options={full} />
      <Stack.Screen name="lock" options={{ ...full, gestureEnabled: false }} />
      <Stack.Screen name="privacy" />
      <Stack.Screen name="nudges" />
      <Stack.Screen name="offline" />
      <Stack.Screen name="bedtime" options={sheet} />
      <Stack.Screen name="share" options={sheet} />
    </Stack>
  );
}

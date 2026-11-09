import { Stack } from 'expo-router';

import { useTheme } from '@/design/theme';

export default function TeacherLayout() {
  const { c } = useTheme();
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="student/[id]" />
    </Stack>
  );
}

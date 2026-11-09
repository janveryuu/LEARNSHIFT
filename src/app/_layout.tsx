import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withTiming } from 'react-native-reanimated';
import {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/inter';

import { ease, timing, useReducedMotion } from '@/design/motion';
import { ThemeProvider, useTheme } from '@/design/theme';
import { PhoneFrame, SHOW_FRAME } from '@/components/web/PhoneFrame';
import { SessionEffects } from '@/services/backend/session';
import { useAppStore } from '@/store/useAppStore';
import { useAuth } from '@/store/useAuth';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  // Desktop web: show the app inside a phone (it runs in an embedded page).
  if (SHOW_FRAME) {
    SplashScreen.hideAsync().catch(() => {});
    return <PhoneFrame />;
  }
  return <App />;
}

function App() {
  const [loaded, error] = useFonts({ Inter_500Medium, Inter_600SemiBold, Inter_700Bold, Inter_800ExtraBold });
  const [hydrated, setHydrated] = useState(() => useAppStore.persist.hasHydrated());
  const authReady = useAuth((s) => s.status !== 'loading');

  useEffect(() => {
    if (hydrated) return;
    return useAppStore.persist.onFinishHydration(() => setHydrated(true));
  }, [hydrated]);

  useEffect(() => {
    if ((loaded || error) && hydrated && authReady) SplashScreen.hideAsync().catch(() => {});
  }, [loaded, error, hydrated, authReady]);

  if ((!loaded && !error) || !hydrated) return null;

  return (
    <GestureHandlerRootView style={styles.root}>
      <SessionEffects />
      <ThemeProvider>{authReady ? <Shell /> : null}</ThemeProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const { c, isNight } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: c.bg }]}>
      <StatusBar style={isNight ? 'light' : 'dark'} />
      <LangFade>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: c.bg } }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
          <Stack.Screen name="account" options={{ presentation: 'modal', contentStyle: { backgroundColor: c.bg } }} />
          <Stack.Screen name="(student)" />
          <Stack.Screen name="guardian" options={{ animation: 'fade' }} />
          <Stack.Screen name="teacher" options={{ animation: 'fade' }} />
          <Stack.Screen name="demo" options={{ presentation: 'modal', contentStyle: { backgroundColor: c.bg } }} />
          <Stack.Screen name="dev/gallery" />
        </Stack>
      </LangFade>
      <ThemeCrossfade />
    </View>
  );
}

/** Language switch: a quick dip so the swap reads as a crossfade, not a jump. */
function LangFade({ children }: { children: React.ReactNode }) {
  const lang = useAppStore((s) => s.lang);
  const reduced = useReducedMotion();
  const o = useSharedValue(1);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    o.set(
      withSequence(
        withTiming(0.35, { duration: 1 }),
        withTiming(1, { duration: reduced ? 120 : 320, easing: ease.out }),
      ),
    );
  }, [lang, reduced, o]);
  const s = useAnimatedStyle(() => ({ opacity: o.get() }));
  return <Animated.View style={[styles.root, s]}>{children}</Animated.View>;
}

/**
 * Day ↔ Night: the old canvas color sits on top and fades out over ~1.2 s,
 * so the whole app appears to melt into the new theme.
 */
function ThemeCrossfade() {
  const { c, mode } = useTheme();
  const [from, setFrom] = useState<string | null>(null);
  const prev = useRef({ mode, bg: c.bg });
  const o = useSharedValue(0);

  useEffect(() => {
    if (prev.current.mode === mode) return;
    setFrom(prev.current.bg);
    prev.current = { mode, bg: c.bg };
    o.set(
      withSequence(
        withTiming(1, { duration: 1 }),
        withTiming(0, { duration: timing.themeCrossfade, easing: ease.inOut }),
      ),
    );
  }, [mode, c.bg, o]);

  const s = useAnimatedStyle(() => ({ opacity: o.get() }));
  if (!from) return null;
  return <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: from }, s]} />;
}

const styles = StyleSheet.create({ root: { flex: 1 } });

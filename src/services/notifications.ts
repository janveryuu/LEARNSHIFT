/**
 * Push and local notifications.
 * - Family events (requests, approvals, late-night alerts) arrive as Expo push.
 * - Tapping any notification opens the screen in its `url` data.
 */
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { AndroidImportance } from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { registerPushToken } from './backend/api';

let configured = false;

export function configureNotifications() {
  if (configured || Platform.OS === 'web') return;
  configured = true;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('family', {
      name: 'Family',
      description: 'Time requests, approvals and night alerts',
      importance: AndroidImportance.HIGH,
    }).catch(() => {});
  }
}

export async function notificationsAllowed(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted';
}

export async function askNotifications(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  configureNotifications();
  const current = await Notifications.getPermissionsAsync();
  if (current.status === 'granted') return true;
  if (!current.canAskAgain) return false;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

/** Registers this device for push. Quietly does nothing where push can't work. */
export async function registerForPush() {
  if (Platform.OS === 'web' || !Device.isDevice) return;
  if (!(await notificationsAllowed())) return;
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await registerPushToken(data, Platform.OS === 'ios' ? 'ios' : 'android');
  } catch {
    // Expo Go on Android and devices without push services land here.
  }
}

function open(data: Record<string, unknown> | undefined) {
  const url = typeof data?.url === 'string' ? data.url : null;
  if (url && url.startsWith('/')) router.push(url as never);
}

/** Opens the screen a tapped notification points to. Returns a cleanup. */
export function routeNotificationTaps(): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener((r) =>
    open(r.notification.request.content.data as Record<string, unknown>),
  );
  // A tap that launched the app from closed.
  const last = Notifications.getLastNotificationResponse();
  if (last) setTimeout(() => open(last.notification.request.content.data as Record<string, unknown>), 600);
  return () => sub.remove();
}

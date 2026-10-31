import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { notificationApi } from '@/api/services';

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
} catch {
  /* notifications unavailable in this runtime (e.g. Expo Go) */
}

/** Best-effort: registers this device's Expo push token with the backend. Never throws. */
export async function registerForPush(): Promise<void> {
  try {
    if (!Device.isDevice) return;
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') status = (await Notifications.requestPermissionsAsync()).status;
    if (status !== 'granted') return;
    const projectId = (Constants.expoConfig?.extra as any)?.eas?.projectId ?? (Constants as any).easConfig?.projectId;
    if (!projectId) return; // needs an EAS project id (see README)
    const { data } = await Notifications.getExpoPushTokenAsync({ projectId });
    await notificationApi.registerDevice(data);
  } catch {
    /* push is optional; in-app notifications still work */
  }
}

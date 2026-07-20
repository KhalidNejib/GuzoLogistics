/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-require-imports */
import Constants from 'expo-constants';

// In Expo SDK 53+, remote push notification functionality in Expo Go on Android
// throws a fatal error at module load time. We guard against this by only requiring
// the real module outside of Expo Go, and falling back to a no-op stub otherwise.
export const isExpoGo = Constants.appOwnership === 'expo';

let expoNotifications: any = null;

if (!isExpoGo) {
  try {
    expoNotifications = require('expo-notifications');
  } catch (error) {
    console.warn('[Notifications] Failed to load expo-notifications:', error);
  }
}

// Full no-op mock structure matching the expo-notifications surface used in this app.
// The fallback keeps Expo Go functional without push-token features.
export const Notifications: any = expoNotifications || {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never' }),
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never' }),
  getExpoPushTokenAsync: async () => ({ data: 'mock-expo-push-token-for-expo-go' }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  addNotificationResponseReceivedListener: () => ({ remove: () => {} }),
  getLastNotificationResponseAsync: async () => null,
  clearLastNotificationResponseAsync: async () => {},
  scheduleNotificationAsync: async () => 'mock-notification-id',
  cancelAllScheduledNotificationsAsync: async () => {},
  AndroidImportance: { UNSPECIFIED: 0, NONE: 1, MIN: 2, LOW: 3, DEFAULT: 4, HIGH: 5, MAX: 5 },
  AndroidNotificationVisibility: { PUBLIC: 1, PRIVATE: 0, SECRET: -1 },
  AndroidNotificationPriority: { MIN: -2, LOW: -1, DEFAULT: 0, HIGH: 1, MAX: 2 },
};

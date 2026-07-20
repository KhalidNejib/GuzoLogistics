import Constants from 'expo-constants';

// In Expo SDK 53+, remote push notification functionality is unsupported in Expo Go
// on Android and will throw an error immediately upon loading/requiring the package.
// We conditionally require the module dynamically only outside Expo Go.
const isExpoGo = Constants.appOwnership === 'expo';

let expoNotifications: any = null;

if (!isExpoGo) {
  try {
    expoNotifications = require('expo-notifications');
  } catch (error) {
    console.warn('[Notifications] Failed to load expo-notifications:', error);
  }
}

// Full, type-safe fallback no-op mock structure for Expo Go
export const Notifications = expoNotifications || {
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => {},
  getPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never' }),
  requestPermissionsAsync: async () => ({ status: 'denied', granted: false, canAskAgain: true, expires: 'never' }),
  getExpoPushTokenAsync: async () => ({ data: 'mock-expo-push-token-for-expo-go' }),
  addNotificationReceivedListener: () => ({ remove: () => {} }),
  scheduleNotificationAsync: async () => 'mock-notification-id',
  cancelAllScheduledNotificationsAsync: async () => {},
  AndroidImportance: {
    UNSPECIFIED: 0,
    NONE: 1,
    MIN: 2,
    LOW: 3,
    DEFAULT: 4,
    HIGH: 5,
    MAX: 5,
  },
  AndroidNotificationVisibility: {
    PUBLIC: 1,
    PRIVATE: 0,
    SECRET: -1,
  },
  AndroidNotificationPriority: {
    MIN: -2,
    LOW: -1,
    DEFAULT: 0,
    HIGH: 1,
    MAX: 2,
  },
};

export { isExpoGo };

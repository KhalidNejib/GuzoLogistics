import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true, // ⚠️ RESTORED FOR TESTING: Verify device delivery
    shouldPlaySound: true,  
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function registerForPushNotificationsAsync() {
  if (!Device.isDevice) {
    console.warn('Must use physical device for Push Notifications');
    return null;
  }

  // Android 8+ requires a notification channel to exist before a heads-up
  // (banner + sound) notification can be shown — otherwise pushes still
  // arrive but may be silently downgraded. The server always sends
  // channelId: 'default', so that's the channel we create here.
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      sound: 'default',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
    });
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    
    if (finalStatus !== 'granted') {
      console.warn('Failed to get push token for push notification!');
      return null;
    }

    // Wrap the token fetch in an extra try-catch for Expo Go environments
    try {
      const token = (await Notifications.getExpoPushTokenAsync({
        projectId: '03c33a16-cf96-45ed-90cb-8aa58c738b65', // Must match app.json eas.projectId
      })).data;
      return token;
    } catch (tokenError) {
      console.warn('Expo Push Token could not be fetched (likely Expo Go limitation):', tokenError);
      return null;
    }
  } catch (err) {
    console.error('Error in registerForPushNotificationsAsync:', err);
    return null;
  }
}

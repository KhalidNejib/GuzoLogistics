/* eslint-disable @typescript-eslint/no-explicit-any */
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { Notifications } from './safeNotifications';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Battery from 'expo-battery';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { socketService } from './socketService';
import { API_URL } from './apiConfig';


const LOCATION_TASK_NAME = 'background-location-task';

export const requestLocationPermissions = async (): Promise<boolean> => {
  const { status: foreground } = await Location.requestForegroundPermissionsAsync();
  if (foreground !== 'granted') {
    console.warn('Foreground location permission denied');
    return false;
  }

  // Request background permission for continuous tracking
  const { status: background } = await Location.requestBackgroundPermissionsAsync();
  if (background !== 'granted') {
    console.warn('Background location permission denied (optional)');
  }

  return true;
};

export const getCurrentLocation = async (): Promise<{ lat: number; lng: number } | null> => {
  try {
    const lastKnown = await Location.getLastKnownPositionAsync({});
    if (lastKnown) {
      return {
        lat: lastKnown.coords.latitude,
        lng: lastKnown.coords.longitude,
      };
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    return {
      lat: location.coords.latitude,
      lng: location.coords.longitude,
    };
  } catch (error) {
    console.error('Failed to get current location:', error);
    return null;
  }
};

let locationSubscription: Location.LocationSubscription | null = null;

export const startLocationTracking = async (
  onLocationUpdate: (
    lat: number,
    lng: number,
    speed: number | null,
    heading: number | null
  ) => void,
  geofenceTargets?: { orderId: string; lat: number; lng: number; isPickup: boolean } | null,
  intervalMs: number = 2000
): Promise<void> => {
  stopLocationTracking();

  // Store for background task access
  (global as any).activeGeofence = geofenceTargets;
  (global as any).hasNotifiedArrived = false;
  (global as any).hasNotifiedApproaching = false;

  // ✅ FOREGROUND TRACKING: This is the correct JS context where socketService IS connected
  locationSubscription = await Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.High,
      timeInterval: intervalMs,
      distanceInterval: 2,
    },
    (location) => {
      const speedKmH = location.coords.speed !== null ? location.coords.speed * 3.6 : 0;
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const heading = location.coords.heading;

      // ✅ UI update only — socket send is handled by handleLocationUpdate in index.tsx
      onLocationUpdate(lat, lng, speedKmH, heading);
    }
  );

  // Background Tracking — only for OS-level geofence notifications when app is killed
  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (!isRegistered) {
    try {
      await Location.startLocationUpdatesAsync(LOCATION_TASK_NAME, {
        accuracy: Location.Accuracy.Balanced,
        timeInterval: intervalMs,
        distanceInterval: 10,
        foregroundService: {
          notificationTitle: 'Elite Logistics Pilot',
          notificationBody: 'Live tracking active for your mission.',
          notificationColor: '#4F46E5',
        },
      });
      console.info('🛰️ Background location tracking started');
    } catch (err) {
      console.error('Failed to start background tracking:', err);
    }
  }
};

export const stopLocationTracking = async (): Promise<void> => {
  if (locationSubscription) {
    locationSubscription.remove();
    locationSubscription = null;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(LOCATION_TASK_NAME);
  if (isRegistered) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
    console.info('🛑 Background location tracking stopped');
  }
};

// --- BACKGROUND TASK DEFINITION ---
// ⚠️  NOTE: This task runs in a SEPARATE JS isolate — socketService is NOT connected here.
// It executes BOTH background location reporting via HTTP status POST and device-level geofencing notifications.
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[Background Task] Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    const location = locations[0];
    if (location) {
      const lat = location.coords.latitude;
      const lng = location.coords.longitude;
      const speed = Math.round((location.coords.speed || 0) * 3.6);

      // ── 1. HTTP Telemetry Reporting to backend API ──
      try {
        let bgRiderName = 'Rider';
        let bgOrderId = 'global';
        let bgToken: string | null = null;

        const storedName = await SecureStore.getItemAsync('rider_name');
        if (storedName) bgRiderName = storedName;

        const storedOrderId = await SecureStore.getItemAsync('active_order_id');
        if (storedOrderId) bgOrderId = storedOrderId;

        bgToken = await SecureStore.getItemAsync('bg_auth_token');

        if (bgToken) {
          // Was hardcoded to 100 — battery level was never actually read,
          // so any low-battery alerting on the dashboard was meaningless.
          let batteryLevel: number | null = null;
          try {
            const level = await Battery.getBatteryLevelAsync();
            if (typeof level === 'number' && level >= 0) {
              batteryLevel = Math.round(level * 100);
            }
          } catch (batteryErr) {
            console.warn('[Background Task] Battery read failed, reporting null as fallback:', batteryErr);
          }

          const payload = {
            orderId: bgOrderId === 'global' ? undefined : bgOrderId,
            lat,
            lng,
            speed,
            battery: batteryLevel,
            riderName: bgRiderName,
          };

          let success = false;
          try {
            const res = await fetch(`${API_URL}/api/v1/user/location`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${bgToken}`,
              },
              body: JSON.stringify(payload),
            });
            if (res.ok) {
              success = true;
            } else {
              console.warn('[Background Task] API location POST returned non-ok status:', res.status);
            }
          } catch (postErr) {
            console.error('[Background Task] Failed API location POST request:', postErr);
          }

          if (!success) {
            console.info('[Background Task] Buffering failed background location update');
            try {
              const OFFLINE_BUFFER_KEY = 'rider_offline_location_buffer';
              const stored = await AsyncStorage.getItem(OFFLINE_BUFFER_KEY);
              let buffer = stored ? JSON.parse(stored) : [];
              if (!Array.isArray(buffer)) buffer = [];
              
              const socketPayload = {
                orderId: bgOrderId,
                lat,
                lng,
                speed,
                battery: batteryLevel || undefined,
                riderName: bgRiderName,
              };

              buffer.push(socketPayload);
              if (buffer.length > 100) buffer.shift();
              await AsyncStorage.setItem(OFFLINE_BUFFER_KEY, JSON.stringify(buffer));
            } catch (bufErr) {
              console.error('[Background Task] Failed to buffer offline location:', bufErr);
            }
          }
        }
      } catch (err) {
        console.error('[Background Task] Unexpected error in background location payload prep:', err);
      }

      // ── 2. Local OS-level Geofence Checks ──
      const geofence = (global as any).activeGeofence;
      if (geofence) {
        const dLat = (geofence.lat - lat) * Math.PI / 180;
        const dLon = (geofence.lng - lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat * Math.PI / 180) * Math.cos(geofence.lat * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const dist = 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const RADIUS_ARRIVED = geofence.isPickup ? 150 : 100;

        if (dist <= RADIUS_ARRIVED && !(global as any).hasNotifiedArrived) {
          (global as any).hasNotifiedArrived = true;
          console.info(`🎯 [Bg Geofence] ARRIVED at ${geofence.isPickup ? 'Pickup' : 'Delivery'}`);
          
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: "📍 Destination Reached!",
                body: `You are at the ${geofence.isPickup ? 'pickup' : 'delivery'} point. Open the app to complete the mission.`,
                data: { orderId: geofence.orderId, type: 'ARRIVED' },
                sound: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
              },
              trigger: null,
            });
          } catch (notifErr) {
            console.error('[Background Task] Notification schedule failed:', notifErr);
          }
        }
      }
    }
  }
});

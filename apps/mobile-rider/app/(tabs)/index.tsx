/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  RefreshControl,
  Image,
  ActivityIndicator,
  Switch,
  Animated,
  PanResponder,
  AppState,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUser, useAuth } from '@clerk/clerk-expo';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import MapView from 'react-native-maps';
import * as Haptics from 'expo-haptics';
import * as Battery from 'expo-battery';
import { BlurView } from 'expo-blur';
import { Audio } from 'expo-av';
import * as SecureStore from 'expo-secure-store';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import NetInfo from '@react-native-community/netinfo';
import * as Location from 'expo-location';
import * as TaskManager from 'expo-task-manager';

// Services & Components
import { socketService } from '../../services/socketService';

const LOCATION_TASK_NAME = 'background-location-task';

// ─── BACKGROUND LOCATION TASK DEFINITION ──────────────────────────────────
TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }: any) => {
  if (error) {
    console.error('[Background Location] Error:', error);
    return;
  }
  if (data) {
    const { locations } = data;
    if (locations && locations.length > 0) {
      const location = locations[0];
      // Read persisted rider name — SecureStore is accessible in background isolates
      let bgRiderName = 'Rider';
      try {
        const stored = await SecureStore.getItemAsync('rider_name');
        if (stored) bgRiderName = stored;
      } catch (_) { /* ignore */ }
      socketService.sendLocation({
        orderId: 'global',
        lat: location.coords.latitude,
        lng: location.coords.longitude,
        speed: Math.round((location.coords.speed || 0) * 3.6),
        battery: 100,
        riderName: bgRiderName,
      });
    }
  }
});

import { useLanguage } from '../../services/i18n';
import { settingService, RiderSettings } from '../../services/settingService';
import {
  startLocationTracking,
  getCurrentLocation,
  requestLocationPermissions,
  stopLocationTracking,
} from '../../services/locationService';
import { registerForPushNotificationsAsync } from '../../services/notificationService';

import { NewOrderModal } from '../../components/NewOrderModal';
import { OrderDetailModal } from '../../components/OrderDetailModal';
import { NotificationsModal } from '../../components/NotificationsModal';
import { OrderCard } from '../../components/OrderCard';
import { LiveRiderMap } from '../../components/LiveRiderMap';
import { Order, OrderStatus } from '@ethio-logistics/types';
import { OnboardingModal } from '../../components/OnboardingModal';
import { EmptyState } from '../../components/dashboard/EmptyState';
import { SOSButton } from '../../components/dashboard/SOSButton';

// Utils & Styles
import { calculateBearing, calculateDistance } from '../../utils/geometry';
import getStyles from '../index.styles';

// ── Constants ─────────────────────────────────────────────────────
const { width, height } = Dimensions.get('window');
const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const GEOFENCE_RADIUS_PICKUP = 150;
const GEOFENCE_RADIUS_DELIVERY = 100;

import { StatusBar } from 'expo-status-bar';

// ── Component ─────────────────────────────────────────────────────
export default function RiderDashboard() {
  const { user } = useUser();
  const { getToken } = useAuth();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // ── UI state ────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(true);
  const [batteryLevel, setBatteryLevel] = useState(100);
  const [refreshing, setRefreshing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ACTIVE' | 'PENDING' | 'HISTORY'>('ACTIVE');
  const [processingStatusId, setProcessingStatusId] = useState<string | null>(null);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [focusedOrderId, setFocusedOrderId] = useState<string | null>(null);
  const [headingLocked, setHeadingLocked] = useState(true);

  // ── Data state ───────────────────────────────────────────────
  const [pendingOrders, setPendingOrders] = useState<Order[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [historyOrders, setHistoryOrders] = useState<Order[]>([]);
  const [newOrder, setNewOrder] = useState<any | null>(null);
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [riderProfile, setRiderProfile] = useState<any>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const preferencesRef = useRef<RiderSettings | null>(null);
  useEffect(() => { preferencesRef.current = preferences; }, [preferences]);

  // ── SETTINGS SYNC ───────────────────────────────────────────
  useEffect(() => {
    const unsub = settingService.subscribe((s) => {
      setPreferences(s);
    });
    return unsub;
  }, []);

  // ── Persist rider name so background task can read it ───────
  useEffect(() => {
    const name = user?.fullName ?? `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim();
    if (name) {
      SecureStore.setItemAsync('rider_name', name).catch(() => {});
    }
  }, [user]);

  // ── Telemetry state ──────────────────────────────────────────
  const [currentPosition, setCurrentPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [speed, setSpeed] = useState(0);
  const [bearing, setBearing] = useState(0);
  const [shiftStart] = useState<number>(Date.now());
  const [shiftDuration, setShiftDuration] = useState('00:00');

  // ── Stats ──────────────────────────────────────────────────
  const [routeToPickup, setRouteToPickup] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);
  const [routeMeta, setRouteMeta] = useState<{ distance: number; duration: number } | null>(null);

  // ── Refs ─────────────────────────────────────────────────────
  const mapRef = useRef<MapView>(null);
  const soundObject = useRef<Audio.Sound | null>(null);
  const isInitialized = useRef(false);
  const activeOrdersRef = useRef<Order[]>([]);
  const newOrderRef = useRef<any>(null);
  const isFetching = useRef(false);
  const lastCameraAt = useRef<number>(0);
  const lastFittedKey = useRef<string | null>(null);
  const lastAutoArrived = useRef<string | null>(null);
  const lastPosition = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => { activeOrdersRef.current = activeOrders; }, [activeOrders]);

  const focusedOrder = useMemo(() => {
    const current = activeOrders.find((o) => o._id === focusedOrderId);
    return current ?? activeOrders[0];
  }, [activeOrders, focusedOrderId]);

  const isPickedUp = useMemo(
    () =>
      focusedOrder?.itemDetails?.isPickedUp === true ||
      ['IN_TRANSIT', 'PICKED_UP'].includes(focusedOrder?.status ?? ''),
    [focusedOrder]
  );

  // ── Bottom sheet gestures ────────────────────────────────────
  const sheetTranslateY = useRef(new Animated.Value(0)).current;
  const lastGestureY = useRef(0);

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dy) > 10,
      onPanResponderGrant: () => {
        sheetTranslateY.setOffset(lastGestureY.current);
        sheetTranslateY.setValue(0);
      },
      onPanResponderMove: (_, g) => sheetTranslateY.setValue(g.dy),
      onPanResponderRelease: (_, g) => {
        sheetTranslateY.flattenOffset();
        const cur = lastGestureY.current + g.dy;
        const snaps = [-height * 0.5, 0, height * 0.2];
        const closest = snaps.reduce((prev, curr) =>
          Math.abs(curr - cur) < Math.abs(prev - cur) ? curr : prev
        );
        lastGestureY.current = closest;
        Animated.spring(sheetTranslateY, {
          toValue: closest, useNativeDriver: true, tension: 50, friction: 10,
        }).start();
      },
    })
  ).current;

  // ── Swipe-to-go-online slider ────────────────────────────────
  const sliderWidth = width - 40;
  const handleWidth = 56;
  const maxSlide = sliderWidth - handleWidth - 8;
  const slideX = useRef(new Animated.Value(0)).current;

  const sliderPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: (_, g) =>
        slideX.setValue(Math.max(0, Math.min(maxSlide, g.dx))),
      onPanResponderRelease: (_, g) => {
        if (g.dx >= maxSlide * 0.8) {
          Animated.timing(slideX, {
            toValue: maxSlide, duration: 150, useNativeDriver: true,
          }).start(() => {
            handleToggleOnline(true);
            setTimeout(() => slideX.setValue(0), 1_000);
          });
        } else {
          if (onboardingStatus !== 'APPROVED') {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            setShowOnboarding(true);
            return;
          }
          Animated.spring(slideX, {
            toValue: 0, useNativeDriver: true, tension: 40, friction: 7,
          }).start();
        }
      },
    })
  ).current;

  // ── Sound system ─────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    Audio.Sound.createAsync({
      uri: 'https://assets.mixkit.co/active_storage/sfx/2358/2358-preview.mp3',
    }).then(({ sound }) => {
      if (mounted) soundObject.current = sound;
    }).catch(() => {});
    return () => {
      mounted = false;
      soundObject.current?.unloadAsync();
    };
  }, []);

  // ── Shift timer ───────────────────────────────────────────────
  useEffect(() => {
    if (!isOnline) return;
    const id = setInterval(() => {
      const diff = Date.now() - shiftStart;
      const hours = Math.floor(diff / 3_600_000);
      const mins = Math.floor((diff % 3_600_000) / 60_000);
      setShiftDuration(`${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`);
    }, 60_000);
    return () => clearInterval(id);
  }, [isOnline, shiftStart]);

  // ── Battery monitoring ────────────────────────────────────────
  useEffect(() => {
    Battery.getBatteryLevelAsync().then((level) => setBatteryLevel(Math.round(level * 100)));
    const sub = Battery.addBatteryLevelListener(({ batteryLevel: lvl }) => setBatteryLevel(Math.round(lvl * 100)));
    return () => sub.remove();
  }, []);

  // ── Data sync ─────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    if (isFetching.current) return;
    isFetching.current = true;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15_000);

    try {
      const token = await getToken();
      if (!token) return;

      const res = await fetch(`${API_URL}/api/v1/orders/my-orders`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'ngrok-skip-browser-warning': 'true',
          'localtunnel-skip-clearing-house': 'true'
        },
        signal: controller.signal,
      });

      if (res.ok) {
        const orders = await res.json();
        const pending = orders.filter((o: any) => o.status === 'PENDING');
        const active = orders.filter((o: any) => ['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY', 'ARRIVED'].includes(o.status));
        const history = orders.filter((o: any) => ['DELIVERED', 'CANCELLED'].includes(o.status));

        // Rooms are cheap to hold but not free — socketService.activeRooms is
        // replayed in full on every reconnect (including a server ownership
        // lookup per room). Without this, every order a rider has ever
        // touched this session stays queued forever, since joinOrder() is
        // never paired with a leaveOrder() once an order finishes. Diff
        // against the previous active list and drop anything that's no
        // longer in flight.
        const stillActiveIds = new Set(active.map((o: any) => o._id));
        activeOrdersRef.current.forEach((o: any) => {
          if (!stillActiveIds.has(o._id)) socketService.leaveOrder(o._id);
        });

        setPendingOrders(pending);
        setActiveOrders(active);
        setHistoryOrders(history);
        active.forEach((o: any) => socketService.joinOrder(o._id));
      }

      const profileRes = await fetch(`${API_URL}/api/v1/user/me`, {
        headers: { 
          Authorization: `Bearer ${token}`, 
          'ngrok-skip-browser-warning': 'true',
          'localtunnel-skip-clearing-house': 'true'
        },
      });
      if (profileRes.ok) {
        const u = await profileRes.json();
        setRiderProfile(u.riderProfile);
        const status = u.riderProfile?.onboardingStatus || 'PENDING_DATA';
        setOnboardingStatus(status);
        if (status === 'PENDING_DATA') setShowOnboarding(true);
        else setShowOnboarding(false);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        console.info('📡 [fetchData] Re-establishing uplink (Timeout)');
      } else {
        console.error('[fetchData]', err?.message);
      }
    } finally {
      clearTimeout(timeoutId);
      isFetching.current = false;
      setIsLoading(false);
    }
  }, [getToken]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, [fetchData]);

  const handleOnboardingSubmit = async (data: any) => {
    const token = await getToken();
    if (!token) throw new Error('Authentication required');

    const res = await fetch(`${API_URL}/api/v1/user/rider-onboarding`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        'localtunnel-skip-clearing-house': 'true'
      },
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to submit onboarding data');
    }

    await fetchData();
  };

  // ── Location update handler ───────────────────────────────────
  const handleLocationUpdate = useCallback(
    (lat: number, lng: number, spd: number | null) => {
      if (lastPosition.current) {
        const distSinceLast = calculateDistance(lastPosition.current.lat, lastPosition.current.lng, lat, lng);
        if (distSinceLast > 2) {
          setBearing(calculateBearing(lastPosition.current.lat, lastPosition.current.lng, lat, lng));
          lastPosition.current = { lat, lng };
        }
      } else {
        lastPosition.current = { lat, lng };
      }

      setCurrentPosition({ lat, lng });
      // spd is already in km/h from locationService
      if (spd !== null) setSpeed(Math.round(spd));

      if (mapRef.current && isOnline && headingLocked) {
        const now = Date.now();
        const throttleLimit = (spd ?? 0) > 10 ? 800 : 1500;
        if (now - lastCameraAt.current > throttleLimit) {
          lastCameraAt.current = now;
          const isDriving = (spd ?? 0) > 1.5;
          mapRef.current.animateCamera({
            center: { latitude: lat, longitude: lng },
            heading: isDriving ? calculateBearing(lastPosition.current?.lat ?? lat, lastPosition.current?.lng ?? lng, lat, lng) : undefined,
            pitch: isDriving ? 80 : 0,
            zoom: isDriving ? 19.2 : 18.2,
          }, { duration: isDriving ? 2800 : 1200 });
        }
      }

      if (isOnline) {
        const order = activeOrdersRef.current.find((o) => o._id === focusedOrderId) ?? activeOrdersRef.current[0];
        if (order && ['ACCEPTED', 'IN_TRANSIT'].includes(order.status)) {
          const pickingUp = order.status === 'ACCEPTED';
          const coords = pickingUp ? (order.pickupAddress?.location?.coordinates ?? order.pickupAddress?.coordinates) : (order.deliveryAddress?.location?.coordinates ?? order.deliveryAddress?.coordinates);
          const radius = pickingUp ? GEOFENCE_RADIUS_PICKUP : GEOFENCE_RADIUS_DELIVERY;
          if (coords) {
            const dist = calculateDistance(lat, lng, coords[1], coords[0]);
            const autoKey = `${order._id}-${order.status}`;
            if (dist <= radius && lastAutoArrived.current !== autoKey) {
              lastAutoArrived.current = autoKey;
              const nextStatus = pickingUp ? 'ARRIVED_PICKUP' : 'ARRIVED_DELIVERY';
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              handleUpdateStatus(nextStatus, undefined, undefined, order._id);
            }
          }
        }
        // ✅ Send live location — socket is connected at this point
        socketService.sendLocation({
          orderId: order?._id ?? 'global',
          lat, 
          lng, 
          battery: batteryLevel, 
          speed: Math.round(spd ?? 0),
          riderName: user?.fullName ?? (global as any).riderName ?? 'Rider',
          riderPhone: user?.primaryPhoneNumber?.phoneNumber ?? '',
        });
      }
    },
    [isOnline, batteryLevel, user, focusedOrderId, headingLocked]
  );

  // ── Road routing ──────────────────────────────────────────────
  const fetchRoadRoute = useCallback(async (from: any, to: any) => {
    try {
      const orsKey = process.env.EXPO_PUBLIC_ORS_API_KEY || 'eyJvcmciOiI1YjNjZTM1OTc4NTExMTAwMDFjZjYyNDgiLCJpZCI6ImU2MDYyYWJmMWU5NjRlNjViMDc2ZmI1YjhjODc3YzcwIiwiaCI6Im11cm11cjY0In0=';
      const orsUrl = `https://api.openrouteservice.org/v2/directions/driving-car?api_key=${orsKey}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}`;
      const res = await fetch(orsUrl);
      const data = await res.json();
      if (data.features?.[0]) {
        const feat = data.features[0];
        return {
          coords: feat.geometry.coordinates.map(([lng, lat]: any) => ({ latitude: lat, longitude: lng })),
          distance: feat.properties.summary.distance,
          duration: feat.properties.summary.duration,
        };
      }
    } catch {}
    return { coords: [{ latitude: from.lat, longitude: from.lng }, { latitude: to.lat, longitude: to.lng }], distance: calculateDistance(from.lat, from.lng, to.lat, to.lng), duration: 0 };
  }, []);

  const posRouteKey = currentPosition ? `${currentPosition.lat.toFixed(3)},${currentPosition.lng.toFixed(3)}` : null;

  useEffect(() => {
    if (!currentPosition || !focusedOrder) {
      setRouteToPickup([]); setRouteCoords([]); setRouteMeta(null);
      return;
    }
    const o = focusedOrder;
    const pu = o.pickupAddress?.location?.coordinates || o.pickupAddress?.coordinates;
    const dl = o.deliveryAddress?.location?.coordinates || o.deliveryAddress?.coordinates;
    if (!pu || !dl) return;

    let cancelled = false;
    (async () => {
      if (!isPickedUp) {
        const [r1, r2] = await Promise.all([fetchRoadRoute(currentPosition, { lat: pu[1], lng: pu[0] }), fetchRoadRoute({ lat: pu[1], lng: pu[0] }, { lat: dl[1], lng: dl[0] })]);
        if (cancelled) return;
        setRouteToPickup(r1.coords); setRouteCoords(r2.coords); setRouteMeta({ distance: r1.distance, duration: r1.duration });
      } else {
        const r = await fetchRoadRoute(currentPosition, { lat: dl[1], lng: dl[0] });
        if (cancelled) return;
        setRouteToPickup([]); setRouteCoords(r.coords); setRouteMeta({ distance: r.distance, duration: r.duration });
      }
    })();
    return () => { cancelled = true; };
  }, [posRouteKey, focusedOrder?._id, focusedOrder?.status, isPickedUp]);

  const [isNetConnected, setIsNetConnected] = useState(true);
  useEffect(() => {
    const unsub = NetInfo.addEventListener(state => {
      setIsNetConnected(state.isConnected ?? true);
      if (state.isConnected) fetchData();
    });
    return unsub;
  }, [fetchData]);

  useEffect(() => {
    if (isOnline && focusedOrder) {
      const isPickup = !['PICKED_UP', 'IN_TRANSIT', 'ARRIVED', 'DELIVERED'].includes(focusedOrder.status);
      const addr = isPickup ? focusedOrder.pickupAddress : focusedOrder.deliveryAddress;
      const coords = addr?.location?.coordinates ?? addr?.coordinates;
      if (coords) startLocationTracking(handleLocationUpdate, { orderId: focusedOrder._id, lat: coords[1], lng: coords[0], isPickup });
    }
  }, [isOnline, focusedOrder?._id, focusedOrder?.status, handleLocationUpdate]);

  const initApp = useCallback(async () => {
    if (isInitialized.current) return;
    isInitialized.current = true;
    setIsLoading(true);
    try {
      const token = await getToken();
      if (!token) { setIsLoading(false); return; }
      const meRes = await fetch(`${API_URL}/api/user/me`, { 
        headers: { 
          Authorization: `Bearer ${token}`,
          'localtunnel-skip-clearing-house': 'true'
        } 
      });
      if (meRes.ok) {
        const me = await meRes.json();
        const status = me.riderProfile?.onboardingStatus || 'APPROVED';
        setOnboardingStatus(status);
        setRiderProfile(me.riderProfile || null);
        if (status === 'PENDING_DATA') setShowOnboarding(true);
        // ✅ Store rider name globally for background location task
        (global as any).riderName = me.fullName || user?.fullName || 'Rider';
      }

      socketService.connect(getToken);
      const savedOnline = await SecureStore.getItemAsync('rider_online_state');
      if (savedOnline !== null) setIsOnline(savedOnline === 'true');

      const unsubs = [
        socketService.onNewOrder((order: any) => {
          const p = preferencesRef.current;
          if (p?.autoAccept && activeOrdersRef.current.length > 0) {
            handleAcceptOrder(order._id); return;
          }
          if (p?.sound) soundObject.current?.replayAsync().catch(() => {});
          if (p?.haptics) Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPendingOrders(prev => prev.find(o => o._id === order._id) ? prev : [order, ...prev]);
          setNewOrder(order);
          if (p?.notifications !== false) {
            setShowNewOrderModal(true);
            
            // Present local notification tray banner if app is not in the foreground
            if (AppState.currentState !== 'active') {
              Notifications.scheduleNotificationAsync({
                content: {
                  title: '🚀 New Mission Available!',
                  body: `New pickup at ${order.pickupAddress?.addressText || 'nearby'}. Earning: ETB ${order.priceInfo?.amount ?? ''}`,
                  data: { type: 'NEW_ORDER', orderId: order._id },
                  sound: true,
                },
                trigger: null,
              }).catch(() => {});
            }
          }
        }),
        // ── Instant order removal when merchant deletes an order ──────────
        // Removes it from ALL local state lists without waiting for a full refetch.
        socketService.onOrderDeleted(({ orderId }) => {
          setPendingOrders(prev => prev.filter(o => o._id !== orderId));
          setActiveOrders(prev => prev.filter(o => o._id !== orderId));
          setHistoryOrders(prev => prev.filter(o => o._id !== orderId));
          // If the deleted order is currently focused, clear it
          setFocusedOrderId(prev => prev === orderId ? null : prev);
          socketService.leaveOrder(orderId);
        }),
        socketService.onOrderCancelled(({ orderId }) => {
          // Also remove immediately on generic cancellation
          setPendingOrders(prev => prev.filter(o => o._id !== orderId));
          setActiveOrders(prev => prev.filter(o => o._id !== orderId));
          setFocusedOrderId(prev => prev === orderId ? null : prev);
          socketService.leaveOrder(orderId);
          fetchData(); // sync full state
        }),
        // ── Account reactivated by merchant ────────────────────────────────
        socketService.onAccountReactivated(() => {
          // Re-check our verification status — this will transition away from DEACTIVATED
          fetchData();
        }),
        socketService.onNotification((data) => {
          setNotifications(prev => [
            { 
              id: Date.now().toString(), 
              ...data, 
              timestamp: new Date(),
              timeStr: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
            }, 
            ...prev
          ]);
          if (preferencesRef.current?.sound) soundObject.current?.replayAsync().catch(() => {});
          
          // Present local notification tray banner if app is not in the foreground
          if (AppState.currentState !== 'active') {
            Notifications.scheduleNotificationAsync({
              content: {
                title: data.title || 'Mission Control Update',
                body: data.body || 'New update received.',
                data: data,
                sound: true,
              },
              trigger: null,
            }).catch(() => {});
          }
          
          if (data.title.includes('Success') || data.title.includes('Delivered')) {
            Alert.alert(
              "🏆 Mission Accomplished!",
              `Exceptional work! ${data.body}\n\nYour earnings have been updated in your wallet.`,
              [{ text: "Awesome!", onPress: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success) }]
            );
          }
        }),
        socketService.onOrderStatusChanged(() => fetchData()),
        socketService.onProfileUpdate((data) => {
          if (data.rating !== undefined) {
            setRiderProfile((prev: any) => prev ? { ...prev, rating: data.rating } : prev);
          }
        }),
      ];

      registerForPushNotificationsAsync().then(t => {
        if (t) fetch(`${API_URL}/api/user/push-token`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }, body: JSON.stringify({ token: t }) }).catch(() => {});
      });
      fetchData();
      
      // ✅ Wait for socket to connect (up to 3s) before starting location tracking
      // This prevents the "Offline — buffering" flood on startup
      const startTrackingWhenReady = async () => {
        const has = await requestLocationPermissions();
        if (!has) return;
        
        // Give socket time to authenticate
        let waited = 0;
        while (!socketService.isConnected() && waited < 3000) {
          await new Promise(r => setTimeout(r, 200));
          waited += 200;
        }
        
        if (socketService.isConnected()) {
          console.info('✅ [Init] Socket ready — starting location tracking');
        } else {
          console.warn('⚠️ [Init] Socket not ready yet — starting tracking anyway (will buffer)');
        }
        
        startLocationTracking(handleLocationUpdate);
        const l = await getCurrentLocation();
        if (l) setCurrentPosition(l);
      };
      startTrackingWhenReady();

      return () => { unsubs.forEach(fn => fn?.()); socketService.disconnect(); stopLocationTracking(); };
    } catch (err) { console.error(err); } finally { setIsLoading(false); }
  }, [getToken, fetchData, handleLocationUpdate]);

  useEffect(() => {
    let cu: any;
    initApp().then(fn => cu = fn);
    return () => cu?.();
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (next) => {
      if (next === 'active') {
        fetchData();
        if (currentPosition && mapRef.current) {
          setHeadingLocked(true);
          mapRef.current.animateCamera({ center: { latitude: currentPosition.lat, longitude: currentPosition.lng }, pitch: 70, heading: bearing, zoom: 19.0 }, { duration: 1000 });
        }
      }
    });
    return () => sub.remove();
  }, [currentPosition?.lat, bearing]);

  const handleToggleOnline = useCallback(async (v: boolean) => {
    setIsOnline(v);
    SecureStore.setItemAsync('rider_online_state', String(v));
    
    if (v) {
      console.info('🛰️ [Tracking] Activating Live Feed...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        startLocationTracking(handleLocationUpdate);
      } else {
        Alert.alert('Permission Denied', 'We need location access to track your deliveries.');
        setIsOnline(false);
      }
    } else {
      console.info('🛑 [Tracking] Deactivating Live Feed...');
      (async () => {
        try {
          const isStarted = await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => false);
          if (isStarted) {
            await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME).catch(() => {});
          }
        } catch (e) { }
      })();
      stopLocationTracking();
    }
  }, [handleLocationUpdate]);

  const handleAcceptOrder = useCallback(async (id: string) => {
    try {
      const t = await getToken();
      const res = await fetch(`${API_URL}/api/v1/orders/${id}/accept`, { 
        method: 'POST', 
        headers: { 
          Authorization: `Bearer ${t}`, 
          'ngrok-skip-browser-warning': 'true',
          'localtunnel-skip-clearing-house': 'true'
        } 
      });
      if (res.ok) {
        setShowNewOrderModal(false);
        socketService.joinOrder(id);
        await fetchData();
        setActiveTab('ACTIVE');
        setFocusedOrderId(id);
        snapSheet('bottom');
      } else {
        const body = await res.json().catch(() => ({}));
        const reason = body?.error || body?.message || `Server error (${res.status})`;
        console.error('[Accept Order] Failed:', reason);
        Alert.alert('Could Not Accept', reason, [{ text: 'OK' }]);
        setShowNewOrderModal(false);
      }
    } catch (err: any) {
      console.error('[Accept Order] Network error:', err);
      Alert.alert('Network Error', 'Could not reach the server. Check your connection.', [{ text: 'OK' }]);
      setShowNewOrderModal(false);
    }
  }, [getToken, fetchData]);

  const handleUpdateStatus = useCallback(async (status: string, verificationCode?: string, photoBase64?: string, targetOrderId?: string) => {
    const id = targetOrderId || selectedOrder?._id;
    if (!id) return;

    if (status === 'ACCEPTED') {
      return handleAcceptOrder(id);
    }

    try {
      const t = await getToken();
      const res = await fetch(`${API_URL}/api/v1/orders/${id}/status`, {
        method: 'PATCH',
        headers: { 
        'Content-Type': 'application/json', 
        Authorization: `Bearer ${t}`, 
        'ngrok-skip-browser-warning': 'true',
        'localtunnel-skip-clearing-house': 'true'
      },
        body: JSON.stringify({ status, verificationCode, photoBase64 }),
      });
      if (res.ok) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (status === 'DELIVERED') { setSelectedOrder(null); Alert.alert('Done!', 'Mission Accomplished.'); }
        fetchData();
      }
    } catch (err) { console.error(err); }
  }, [getToken, fetchData, selectedOrder]);

  const handleToggleHeadingLock = useCallback(() => {
    const n = !headingLocked;
    setHeadingLocked(n);
    if (n && mapRef.current && currentPosition) {
      mapRef.current.animateCamera({ center: { latitude: currentPosition.lat, longitude: currentPosition.lng }, zoom: 19.0, pitch: 72, heading: bearing }, { duration: 700 });
    }
  }, [headingLocked, currentPosition, bearing]);

  const handleSOS = useCallback(async (description: string) => {
    try {
      const t = await getToken();
      const res = await fetch(`${API_URL}/api/incidents`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json', 
          'Authorization': `Bearer ${t}`,
          'ngrok-skip-browser-warning': 'true',
          'localtunnel-skip-clearing-house': 'true'
        },
        body: JSON.stringify({
          type: 'SOS',
          description,
          location: currentPosition ? { lat: currentPosition.lat, lng: currentPosition.lng } : undefined
        }),
      });
      return res.ok;
    } catch (err) {
      console.error('SOS failed', err);
      return false;
    }
  }, [getToken, currentPosition]);

  const snapSheet = useCallback((t: 'middle' | 'bottom') => {
    const val = t === 'bottom' ? height * 0.22 : 0;
    lastGestureY.current = val;
    Animated.spring(sheetTranslateY, { toValue: val, useNativeDriver: true, tension: 40, friction: 8 }).start();
  }, [sheetTranslateY]);

  // ── Notification tap → correct in-app destination ─────────────────
  // Push payloads come from services/api/src/lib/notifications.ts:
  //   NEW_ORDER              -> { type: 'NEW_ORDER', orderId }
  //   SETTLEMENT_APPROVED/REJECTED -> { type, amount }  (no orderId)
  //   everything else that carries an orderId -> treat as "show me that order"
  const handleNotificationTap = useCallback(async (data: any) => {
    if (!data) return;
    const { type, orderId } = data;

    try {
      if (type === 'NEW_ORDER' && orderId) {
        // Pull the order fresh rather than trusting stale notification data —
        // it may have already been accepted by another rider by the time this is tapped.
        const t = await getToken();
        const res = await fetch(`${API_URL}/api/v1/orders/${orderId}`, {
          headers: { Authorization: `Bearer ${t}`, 'ngrok-skip-browser-warning': 'true' },
        });
        if (res.ok) {
          const order = await res.json();
          if (order.status === 'PENDING') {
            setNewOrder(order);
            setShowNewOrderModal(true);
            return;
          }
        }
        // Already taken / gone — just refresh the lists instead of showing a stale modal.
        await fetchData();
        return;
      }

      if (type === 'SETTLEMENT_APPROVED' || type === 'SETTLEMENT_REJECTED') {
        router.push('/profile/earnings');
        return;
      }

      if (orderId) {
        // Status-change or other order-scoped push — jump to it in the Active tab.
        await fetchData();
        setActiveTab('ACTIVE');
        setFocusedOrderId(orderId);
        snapSheet('bottom');
      }
    } catch (err) {
      console.error('[Notification Tap] Failed to navigate:', err);
    }
  }, [getToken, fetchData, router, snapSheet]);

  useEffect(() => {
    // Cold start: the app was fully closed/killed and the user tapped a push
    // to launch it. This won't fire the listener below since that's only
    // attached once the JS runtime is already up, so it's checked separately.
    Notifications.getLastNotificationResponseAsync().then((response) => {
      const data = response?.notification?.request?.content?.data;
      if (data) handleNotificationTap(data);
      // Avoid re-firing this same navigation every time the app re-foregrounds.
      Notifications.clearLastNotificationResponseAsync();
    });

    // Warm start: app already running (foreground or backgrounded) when tapped.
    const sub = Notifications.addNotificationResponseReceivedListener((response) => {
      handleNotificationTap(response.notification.request.content.data);
    });

    return () => sub.remove();
  }, [handleNotificationTap]);

  if (isLoading) return <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.loadingText}>{t('home.collecting_intel')}</Text></View>;

  return (
    <View style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} translucent={true} />
      {/* CONNECTIVITY BANNER */}
      {!isNetConnected && (
        <View style={{ position: 'absolute', top: insets.top + 70, left: 24, right: 24, zIndex: 100, backgroundColor: '#f43f5e', borderRadius: 12, paddingVertical: 8, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10, elevation: 15 }}>
           <Feather name="wifi-off" size={14} color="white" />
           <Text style={{ color: 'white', fontWeight: '900', fontSize: 10, marginLeft: 8, textTransform: 'uppercase', letterSpacing: 1.5 }}>{t('home.searching_signal')} ({t('home.establishing_uplink')})</Text>
        </View>
      )}
      {/* HEADER */}
      <View style={[styles.headerContainer, { paddingTop: insets.top + 10 }]}>
        <BlurView intensity={80} tint={preferences?.darkMode ? "dark" : "light"} style={styles.glassHeader}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.pilotInfo} onPress={() => router.push('/two')}>
              <View style={styles.avatar}>
                {user?.imageUrl ? <Image source={{ uri: user.imageUrl }} style={styles.avatarImage} /> : <Ionicons name="person" size={18} color="#4f46e5" />}
              </View>
              <Text style={styles.pilotName} numberOfLines={1}>
                {user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Guzo Rider'}
              </Text>
            </TouchableOpacity>

            <View style={styles.headerRightCenter}>
              <TouchableOpacity onPress={() => setShowNotifications(true)} style={styles.iconButtonMicro}>
                <Feather name="bell" size={16} color="#4f46e5" />
                {notifications.length > 0 && <View style={styles.badgeMicro} />}
              </TouchableOpacity>
              <View style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}>
                <Switch 
                  value={isOnline} 
                  onValueChange={handleToggleOnline} 
                  trackColor={{ false: '#cbd5e1', true: '#4f46e5' }} 
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>
        </BlurView>
        
        {/* 🚀 TIER 2: VERTICAL TACTICAL STRIP (Left Side) */}
        <Animated.View style={[styles.tacticalStrip, { top: insets.top + 80 }]}>
            {/* Mission Stats */}
            {routeMeta && (
              <View style={styles.stripSection}>
                <View style={styles.pillStat}>
                  <Text style={styles.pillValue}>{Math.ceil(routeMeta.duration / 60)}</Text>
                  <Text style={styles.pillLabel}>MIN</Text>
                </View>
                <View style={styles.pillDivider} />
                <View style={styles.pillStat}>
                  <Text style={styles.pillValue}>{(routeMeta.distance / 1000).toFixed(1)}</Text>
                  <Text style={styles.pillLabel}>KM</Text>
                </View>
                <View style={[styles.pillDivider, { width: 24, height: 2, marginVertical: 12, backgroundColor: 'rgba(79, 70, 229, 0.4)' }]} />
              </View>
            )}

            {/* Vital Stats */}
            <View style={styles.stripSection}>
              <View style={styles.pillStat}>
                <Text style={[styles.pillValue, { color: isDark ? '#fff' : '#0f172a' }]}>{speed}</Text>
                <Text style={styles.pillLabel}>KM/H</Text>
              </View>
              <View style={styles.pillDivider} />
              <View style={styles.pillStat}>
                <MaterialCommunityIcons name={batteryLevel > 20 ? 'battery-high' : 'battery-low'} size={16} color={batteryLevel > 20 ? '#10b981' : '#f43f5e'} />
                <Text style={[styles.pillLabel, { marginTop: 2 }]}>{batteryLevel}%</Text>
              </View>
            </View>
        </Animated.View>
      </View>

      {/* MAP */}
      {currentPosition ? (
        <View style={{ flex: 1 }}>
          <LiveRiderMap mapRef={mapRef} currentPosition={currentPosition} focusedOrder={focusedOrder} routeToPickup={routeToPickup} routeCoords={routeCoords} bearing={bearing} routeMeta={routeMeta} isPickedUp={isPickedUp} isDark={preferences?.darkMode} />
          
          <View style={[styles.mapControls, { top: insets.top + 90 }]}>
            <TouchableOpacity style={styles.mapBtn} onPress={() => { setIsSheetCollapsed(!isSheetCollapsed); snapSheet(isSheetCollapsed ? 'middle' : 'bottom'); }}><MaterialCommunityIcons name={isSheetCollapsed ? 'arrow-expand-all' : 'arrow-collapse-all'} size={20} color="#4f46e5" /></TouchableOpacity>
            <TouchableOpacity 
              style={[styles.mapBtn, { marginTop: 10, borderColor: headingLocked ? '#4f46e5' : '#f1f5f9', borderWidth: headingLocked ? 2 : 1 }]} 
              onPress={() => { 
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                setHeadingLocked(true); 
                mapRef.current?.animateCamera({ 
                  center: { latitude: currentPosition.lat, longitude: currentPosition.lng}, 
                  zoom: 19.5, 
                  pitch: 75, 
                  heading: bearing 
                }, { duration: 1000 }); 
              }}
            >
              <MaterialCommunityIcons 
                name={headingLocked ? "navigation" : "crosshairs-gps"} 
                size={22} 
                color={headingLocked ? "#4f46e5" : "#94a3b8"} 
              />
            </TouchableOpacity>
            <TouchableOpacity style={[styles.mapBtn, { marginTop: 10, backgroundColor: headingLocked ? '#4f46e5' : 'white' }]} onPress={handleToggleHeadingLock}><MaterialCommunityIcons name={headingLocked ? 'compass' : 'compass-off'} size={20} color={headingLocked ? 'white' : '#94a3b8'} /></TouchableOpacity>
          </View>

          <SOSButton onPress={handleSOS} />

          {focusedOrder && (
            <Animated.View style={[styles.compactCard, { 
              bottom: (height * 0.22) + (insets.bottom > 20 ? insets.bottom + 58 : 118),
              transform: [{ translateY: sheetTranslateY }],
              height: 64, // Sleek, small height
              paddingHorizontal: 16,
              borderRadius: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              backgroundColor: isDark ? 'rgba(15, 23, 42, 0.98)' : 'rgba(255, 255, 255, 0.98)',
              borderWidth: 1.5,
              borderColor: isDark ? 'rgba(79, 70, 229, 0.4)' : 'rgba(79, 70, 229, 0.15)',
            }]}>
              {/* Identity Hub */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 }}>
                <View style={{ backgroundColor: isPickedUp ? '#10b981' : '#4f46e5', width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
                  <MaterialCommunityIcons name={isPickedUp ? "truck-fast" : "package-variant-closed"} size={16} color="white" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 7, fontWeight: '900', color: isPickedUp ? '#10b981' : '#4f46e5', textTransform: 'uppercase', letterSpacing: 0.5 }}>{isPickedUp ? 'DELIVERY' : 'PICKUP'}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#f1f5f9' : '#0f172a' }} numberOfLines={1}>
                    {isPickedUp ? focusedOrder.deliveryAddress?.addressText : focusedOrder.pickupAddress?.addressText}
                  </Text>
                </View>
              </View>

              {/* Side-by-Side Action Pills */}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                {focusedOrder.status === 'ACCEPTED' ? (
                  <TouchableOpacity 
                    style={{ backgroundColor: '#4f46e5', paddingHorizontal: 12, height: 36, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                    onPress={() => handleUpdateStatus('ARRIVED_PICKUP', undefined, undefined, focusedOrder._id)}
                  >
                    <MaterialCommunityIcons name="map-marker-check" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>ARRIVE</Text>
                  </TouchableOpacity>
                ) : focusedOrder.status === 'ARRIVED_PICKUP' ? (
                  <TouchableOpacity 
                    style={{ backgroundColor: '#10b981', paddingHorizontal: 12, height: 36, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                    onPress={() => handleUpdateStatus('PICKED_UP', undefined, undefined, focusedOrder._id)}
                  >
                    <MaterialCommunityIcons name="package-variant-closed" size={16} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>PICKUP</Text>
                  </TouchableOpacity>
                ) : (focusedOrder.status === 'PICKED_UP' || focusedOrder.status === 'ARRIVED_DELIVERY') ? (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                     {focusedOrder.status === 'PICKED_UP' && (
                        <TouchableOpacity 
                          style={{ backgroundColor: '#f59e0b', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }} 
                          onPress={() => handleUpdateStatus('ARRIVED_DELIVERY', undefined, undefined, focusedOrder._id)}
                        >
                          <MaterialCommunityIcons name="map-marker-radius" size={18} color="white" />
                        </TouchableOpacity>
                     )}
                     <TouchableOpacity 
                        style={{ backgroundColor: '#4f46e5', paddingHorizontal: 12, height: 36, borderRadius: 12, flexDirection: 'row', alignItems: 'center', gap: 6 }} 
                        onPress={() => { setSelectedOrder(focusedOrder); setShowDetailModal(true); }}
                      >
                        <MaterialCommunityIcons name="shield-check" size={16} color="white" />
                        <Text style={{ color: 'white', fontWeight: '900', fontSize: 10 }}>VERIFY</Text>
                      </TouchableOpacity>
                  </View>
                ) : (
                   <TouchableOpacity 
                    style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9', width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' }} 
                    onPress={() => { setSelectedOrder(focusedOrder); setShowDetailModal(true); }}
                  >
                    <Feather name="chevron-right" size={18} color="#4f46e5" />
                  </TouchableOpacity>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      ) : <View style={styles.noGps}><ActivityIndicator size="large" color="#4f46e5" /><Text style={styles.noGpsText}>{t('home.acquiring_signal')}</Text></View>}

      {/* BOTTOM PANEL */}
      {isOnline ? (
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }], paddingBottom: Math.max(insets.bottom, 20) + 10 }]} {...sheetPanResponder.panHandlers}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 6, position: 'relative', width: '100%', height: 24 }}>
            <View style={styles.dragger} />
            <TouchableOpacity 
              style={{ 
                position: 'absolute', 
                right: 20, 
                top: -4,
                width: 32, 
                height: 32, 
                borderRadius: 16, 
                backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)', 
                alignItems: 'center', 
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                zIndex: 100
              }}
              onPress={() => {
                const nextState = !isSheetCollapsed;
                setIsSheetCollapsed(nextState);
                snapSheet(nextState ? 'bottom' : 'middle');
              }}
            >
              <Feather 
                name={isSheetCollapsed ? "chevron-up" : "chevron-down"} 
                size={16} 
                color={isDark ? '#cbd5e1' : '#475569'} 
              />
            </TouchableOpacity>
          </View>
          <View style={styles.tabs}>
            {[
              { id: 'PENDING', label: t('tabs.pending') },
              { id: 'ACTIVE', label: t('tabs.active') },
              { id: 'HISTORY', label: t('tabs.history') }
            ].map(tab => (
              <TouchableOpacity key={tab.id} style={[styles.tab, activeTab === tab.id && styles.tabActive]} onPress={() => setActiveTab(tab.id as any)}>
                <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <ScrollView style={styles.scroll}>
            <View style={styles.listPad}>
              {(activeTab === 'ACTIVE' ? activeOrders : activeTab === 'PENDING' ? pendingOrders : historyOrders).map(order => (
                <OrderCard 
                  key={order._id} 
                  order={order} 
                  isActive={order._id === focusedOrderId} 
                  onPress={(o) => { 
                    if (activeTab === 'ACTIVE') { 
                      setFocusedOrderId(o._id); 
                      snapSheet('bottom'); 
                    } else { 
                      setSelectedOrder(o); 
                      setShowDetailModal(true); 
                    } 
                  }} 
                  onLongPress={(o) => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    setSelectedOrder(o);
                    setShowDetailModal(true);
                  }}
                />
              ))}
              {(activeTab === 'ACTIVE' && activeOrders.length === 0) && <EmptyState icon="leaf-outline" text={t('home.mission_ready')} />}
            </View>
          </ScrollView>
        </Animated.View>
      ) : (
        <View style={[styles.offlinePanel, { paddingBottom: Math.max(insets.bottom, 20) + 15 }]}>
          <View style={styles.offlineCenter}>
            <Text style={styles.offlineTitle}>{t('home.go_offline')}</Text>
            <Text style={styles.offlineSub}>{t('home.go_online')}</Text>
          </View>
          <View style={styles.sliderTrack}>
            <Animated.View style={[styles.sliderHandle, { transform: [{ translateX: slideX }] }]} {...sliderPanResponder.panHandlers}>
              <MaterialCommunityIcons name="power" size={24} color="white" />
            </Animated.View>
          </View>
        </View>
      )}

      {/* MODALS */}
      <NewOrderModal visible={showNewOrderModal} order={newOrder} onAccept={handleAcceptOrder} onDecline={() => setShowNewOrderModal(false)} />
      <OrderDetailModal visible={showDetailModal} order={selectedOrder} onClose={() => setShowDetailModal(false)} onUpdateStatus={handleUpdateStatus} routeMeta={routeMeta} riderLocation={currentPosition} />
      <NotificationsModal visible={showNotifications} notifications={notifications} onClose={() => setShowNotifications(false)} onClear={() => setNotifications([])} />
      <OnboardingModal visible={showOnboarding} initialData={riderProfile} getToken={getToken} onComplete={handleOnboardingSubmit} />
    </View>
  );
}
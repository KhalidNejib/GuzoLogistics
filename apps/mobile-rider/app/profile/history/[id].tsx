import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Image, StyleSheet, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { settingService, RiderSettings } from '../../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  DELIVERED: { label: 'Delivered', color: '#10b981', icon: 'checkmark-circle' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', icon: 'close-circle' },
  PENDING: { label: 'Pending', color: '#f59e0b', icon: 'time' },
  ACCEPTED: { label: 'Accepted', color: '#6366f1', icon: 'paper-plane' },
  IN_TRANSIT: { label: 'In Transit', color: '#3b82f6', icon: 'bicycle' },
};

function metaFor(status: string) {
  return STATUS_META[status] || { label: status.replace(/_/g, ' '), color: '#64748b', icon: 'ellipse' };
}

export default function MissionDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { getToken } = useAuth();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  
  const [order, setOrder] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const fetchOrderDetail = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/orders/${id}`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      if (res.ok) {
        const data = await res.json();
        setOrder(data);
      } else {
        setError('Could not locate mission records.');
      }
    } catch (err) {
      console.error('Detail fetch error:', err);
      setError('Connection failure.');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [id, getToken]);

  useEffect(() => {
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrderDetail();
  }, [fetchOrderDetail]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#a855f7" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !order) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Mission Details</Text>
        </View>
        <View style={styles.errorBox}>
          <Feather name="alert-triangle" size={48} color="#ef4444" style={{ marginBottom: 16 }} />
          <Text style={styles.errorText}>{error || 'Mission details unavailable.'}</Text>
          <TouchableOpacity onPress={fetchOrderDetail} style={styles.retryBtn}>
            <Text style={styles.retryBtnText}>Retry Fetch</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const meta = metaFor(order.status);
  const formattedDate = new Date(order.deliveredAt || order.updatedAt || order.createdAt).toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission #{order._id.slice(-6).toUpperCase()}</Text>
      </View>

      <ScrollView
        style={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e2e8f0' : '#0f172a'} />}
      >
        {/* Status Banner */}
        <View style={[styles.card, styles.statusCard, { borderColor: meta.color + '30' }]}>
          <View style={styles.statusHeader}>
            <Ionicons name={meta.icon} size={20} color={meta.color} />
            <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate}</Text>
          {order.verificationCode && (
            <View style={styles.podCodeBox}>
              <Text style={styles.podCodeLabel}>Verification POD Code</Text>
              <Text style={styles.podCodeValue}>{order.verificationCode}</Text>
            </View>
          )}
        </View>

        {/* Route Details Card */}
        <Text style={styles.sectionTitle}>Delivery Route</Text>
        <View style={styles.card}>
          <View style={styles.routeItem}>
            <View style={[styles.dotWrapper, { backgroundColor: '#10b981' }]}>
              <View style={styles.innerDot} />
            </View>
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Pickup Point</Text>
              <Text style={styles.routeText}>{order.pickupAddress?.addressText || 'Unnamed Pickup'}</Text>
            </View>
          </View>
          
          <View style={styles.routeLine} />

          <View style={styles.routeItem}>
            <View style={[styles.dotWrapper, { backgroundColor: '#ef4444' }]}>
              <View style={styles.innerDot} />
            </View>
            <View style={styles.routeTextContainer}>
              <Text style={styles.routeLabel}>Dropoff Destination</Text>
              <Text style={styles.routeText}>{order.deliveryAddress?.addressText || 'Unnamed Dropoff'}</Text>
            </View>
          </View>
        </View>

        {/* Cargo & Recipient Card */}
        <Text style={styles.sectionTitle}>Shipment Details</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Item Name</Text>
              <Text style={styles.metaValue}>{order.itemDetails?.name || 'Standard Package'}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.metaLabel}>Weight & Qty</Text>
              <Text style={styles.metaValue}>
                {order.itemDetails?.weight || 0}kg · {order.itemDetails?.quantity || 1} units
              </Text>
            </View>
          </View>
          <View style={styles.divider} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaLabel}>Recipient</Text>
              <Text style={styles.metaValue}>{order.recipientName || order.customerName || 'Consignee'}</Text>
            </View>
            <View style={{ flex: 1, paddingLeft: 12 }}>
              <Text style={styles.metaLabel}>Contact Phone</Text>
              <Text style={styles.metaValue}>{order.recipientPhone || order.customerPhone || 'N/A'}</Text>
            </View>
          </View>
        </View>

        {/* Financial Reciept Card */}
        <Text style={styles.sectionTitle}>Financial Breakdown</Text>
        <View style={styles.card}>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Item Price Collection</Text>
            <Text style={styles.receiptValue}>{order.priceInfo?.itemPrice?.toLocaleString() || 0} ETB</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Delivery Fare</Text>
            <Text style={styles.receiptValue}>{order.priceInfo?.amount?.toLocaleString() || 0} ETB</Text>
          </View>
          <View style={styles.receiptRow}>
            <Text style={styles.receiptLabel}>Payment Mode</Text>
            <Text style={[styles.receiptValue, { color: '#6366f1' }]}>{order.paymentMethod || 'C.O.D.'}</Text>
          </View>
          <View style={styles.divider} />
          <View style={[styles.receiptRow, { marginTop: 4 }]}>
            <Text style={styles.receiptTotalLabel}>Total Cash to Collect</Text>
            <Text style={styles.receiptTotalValue}>
              {((order.priceInfo?.itemPrice || 0) + (order.priceInfo?.amount || 0)).toLocaleString()} ETB
            </Text>
          </View>
        </View>

        {/* Proof of Delivery Image */}
        {order.podImageUrl && (
          <View style={{ marginBottom: 20 }}>
            <Text style={styles.sectionTitle}>Proof of Delivery (POD)</Text>
            <View style={[styles.card, { padding: 8 }]}>
              <Image 
                source={{ uri: order.podImageUrl }} 
                style={styles.podImage}
                resizeMode="cover"
              />
            </View>
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#020617' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? 'white' : '#0f172a', marginLeft: 16 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorBox: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errorText: { fontSize: 14, fontWeight: '700', color: '#64748b', textAlign: 'center', marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 16, backgroundColor: '#a855f7' },
  retryBtnText: { color: 'white', fontWeight: '900', fontSize: 11, textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', padding: 20, marginBottom: 20 },
  statusCard: { borderLeftWidth: 4, display: 'flex', flexDirection: 'column' },
  statusHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusLabel: { fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: -0.2 },
  dateText: { fontSize: 12, color: '#94a3b8', fontWeight: '700', marginTop: 4 },
  sectionTitle: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 10, marginLeft: 4 },
  podCodeBox: { marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: isDark ? '#1e293b' : '#f1f5f9' },
  podCodeLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  podCodeValue: { fontSize: 20, fontWeight: '900', color: isDark ? 'white' : '#0f172a', letterSpacing: 4, marginTop: 4, fontFamily: 'SpaceMono' },
  routeItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  dotWrapper: { width: 14, height: 14, borderRadius: 7, alignItems: 'center', justifyContent: 'center', marginTop: 3 },
  innerDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'white' },
  routeTextContainer: { flex: 1 },
  routeLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  routeText: { fontSize: 13, fontWeight: '700', color: isDark ? '#e2e8f0' : '#0f172a', marginTop: 2 },
  routeLine: { width: 2, height: 24, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', marginLeft: 6, marginVertical: 4 },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  divider: { height: 1, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', marginVertical: 14 },
  metaLabel: { fontSize: 9, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  metaValue: { fontSize: 13, fontWeight: '700', color: isDark ? '#e2e8f0' : '#0f172a' },
  receiptRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  receiptLabel: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  receiptValue: { fontSize: 13, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a' },
  receiptTotalLabel: { fontSize: 13, fontWeight: '900', color: isDark ? 'white' : '#0f172a' },
  receiptTotalValue: { fontSize: 18, fontWeight: '900', color: '#10b981' },
  podImage: { width: '100%', height: 240, borderRadius: 16 },
});

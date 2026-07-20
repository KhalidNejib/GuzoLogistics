import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { settingService, RiderSettings } from '../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

const STATUS_META: Record<string, { label: string; color: string; icon: any }> = {
  DELIVERED: { label: 'Delivered', color: '#10b981', icon: 'check-circle' },
  CANCELLED: { label: 'Cancelled', color: '#ef4444', icon: 'x-circle' },
  PENDING: { label: 'Pending', color: '#f59e0b', icon: 'clock' },
  ACCEPTED: { label: 'Accepted', color: '#6366f1', icon: 'navigation' },
  IN_TRANSIT: { label: 'In Transit', color: '#6366f1', icon: 'navigation' },
};

function metaFor(status: string) {
  return STATUS_META[status] || { label: status.replace(/_/g, ' '), color: '#64748b', icon: 'circle' };
}

export default function HistoryScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'ALL' | 'DELIVERED' | 'CANCELLED'>('ALL');

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const fetchOrders = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/orders/my-orders`, {
        headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
      });
      const data = res.ok ? await res.json() : [];
      // "History" means missions that have concluded one way or another —
      // not still-open PENDING/ACCEPTED/IN_TRANSIT ones (those live on the map tab).
      const concluded = Array.isArray(data)
        ? data.filter((o: any) => o.status === 'DELIVERED' || o.status === 'CANCELLED')
        : [];
      setOrders(concluded);
    } catch (err) {
      console.error('History fetch error:', err);
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const filtered = filter === 'ALL' ? orders : orders.filter((o) => o.status === filter);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mission History</Text>
      </View>

      <View style={styles.filterRow}>
        {(['ALL', 'DELIVERED', 'CANCELLED'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            onPress={() => setFilter(f)}
            style={[styles.filterPill, filter === f && styles.filterPillActive]}
            accessibilityRole="button"
          >
            <Text style={[styles.filterPillText, filter === f && styles.filterPillTextActive]}>
              {f === 'ALL' ? 'All' : f.charAt(0) + f.slice(1).toLowerCase()}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {isLoading ? (
        <View style={styles.loadingBox}><ActivityIndicator color="#a855f7" /></View>
      ) : (
        <ScrollView
          style={styles.scroll}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={isDark ? '#e2e8f0' : '#0f172a'} />}
        >
          {filtered.length === 0 ? (
            <View style={styles.emptyState}>
              <Feather name="inbox" size={32} color={isDark ? '#334155' : '#cbd5e1'} />
              <Text style={styles.emptyText}>No missions here yet.</Text>
            </View>
          ) : (
            <View style={styles.list}>
              {filtered.map((order) => {
                const meta = metaFor(order.status);
                return (
                  <TouchableOpacity
                    key={order._id}
                    style={styles.card}
                    onPress={() => router.push(`/profile/history/${order._id}` as any)}
                    accessibilityRole="button"
                    accessibilityLabel={`Mission ${order._id.slice(-6).toUpperCase()}, ${meta.label}`}
                  >
                    <View style={[styles.iconBox, { backgroundColor: isDark ? '#1e1b3a' : '#faf5ff' }]}>
                      <Feather name={meta.icon} size={16} color={meta.color} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.cardTitle} numberOfLines={1}>
                        {order.deliveryAddress?.addressText || `Mission #${order._id.slice(-6).toUpperCase()}`}
                      </Text>
                      <Text style={styles.cardSub}>
                        {new Date(order.deliveredAt || order.updatedAt).toLocaleDateString()} · {order.priceInfo?.amount?.toLocaleString() || 0} ETB
                      </Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderColor: meta.color + '40' }]}>
                      <Text style={[styles.statusText, { color: meta.color }]}>{meta.label}</Text>
                    </View>
                    <Feather name="chevron-right" size={16} color={isDark ? '#334155' : '#cbd5e1'} style={{ marginLeft: 8 }} />
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
          <View style={{ height: 60 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#020617' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? 'white' : '#0f172a', marginLeft: 16 },
  filterRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingTop: 16 },
  filterPill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 14, backgroundColor: isDark ? '#0f172a' : 'white', borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  filterPillActive: { backgroundColor: '#a855f7', borderColor: '#a855f7' },
  filterPillText: { fontSize: 11, fontWeight: '900', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 },
  filterPillTextActive: { color: 'white' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 16 },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', borderStyle: 'dashed' },
  emptyText: { color: '#64748b', marginTop: 12, fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  list: { gap: 10, marginBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 13, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  cardSub: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
});

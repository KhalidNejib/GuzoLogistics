/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { socketService } from '../../services/socketService';
import { settingService, RiderSettings } from '../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export default function EarningsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState({ balance: 0, cashHeld: 0, totalEarned: 0 });
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  // ── LIVE FINANCE SYNC ───────────────────────────────────────────
  useEffect(() => {
    const unsub = socketService.onFinanceUpdate((data) => {
      setStats((prev) => ({
        balance: data.balance ?? prev.balance,
        cashHeld: data.cashHeld ?? prev.cashHeld,
        totalEarned: (data as any).totalEarned ?? prev.totalEarned,
      }));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const token = await getToken();
        if (!token) return;

        const [profileRes, orderRes, transRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/user/me`, {
            headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
          }),
          fetch(`${API_URL}/api/v1/orders/my-orders`, {
            headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
          }),
          fetch(`${API_URL}/api/v1/merchant/finance/history`, {
            headers: { Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' }
          })
        ]);

        const [profileData, orders, transData] = await Promise.all([
          profileRes.json(),
          orderRes.json(),
          transRes.json()
        ]);

        setProfile(profileData);
        setStats({
          balance: profileData.finance?.balance || 0,
          cashHeld: profileData.finance?.cashHeld || 0,
          totalEarned: profileData.finance?.totalEarned || 0,
        });
        const deliveredOrders = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'DELIVERED') : [];

        const merged = [
          ...deliveredOrders.map((o: any) => ({
            id: o._id,
            type: 'EARNING',
            amount: o.priceInfo?.amount || 0,
            date: o.deliveredAt || o.updatedAt,
            title: `Mission #${o._id.slice(-6).toUpperCase()}`,
            status: 'COMPLETED'
          })),
          ...(transData.transactions || []).map((t: any) => ({
            id: t._id,
            type: t.type,
            amount: t.amount,
            date: t.createdAt,
            title: t.type === 'SETTLEMENT' ? 'Repayment Verification' : (t.description || 'Transaction'),
            status: t.status,
            ref: t.referenceId
          }))
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        setHistory(merged as any);
      } catch (e) {
        console.error(e);
      } finally {
        setIsLoading(false);
      }
    };
    fetchHistory();
  }, [getToken]);

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="chevron-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 16 }}>
          <Text style={styles.headerLabel}>Pilot Intelligence</Text>
          <Text style={styles.headerTitle}>Ledger & Commissions</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* TOTAL PERFORMANCE CARD */}
        <View style={styles.performanceCard}>
            <View style={styles.perfHeader}>
               <Text style={styles.perfLabel}>Lifetime Commission</Text>
               <Ionicons name="stats-chart" size={16} color="white" />
            </View>
            <View style={styles.balanceRow}>
               <Text style={styles.balanceText}>
                 {stats.totalEarned.toLocaleString()}
               </Text>
               <Text style={styles.balanceUnit}>ETB</Text>
            </View>
            <Text style={styles.perfSub}>Total revenue share processed</Text>
        </View>

        {/* LIQUIDITY SPLIT */}
        <View style={styles.statGrid}>
          <View style={styles.statItem}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#064e3b' : '#f0fdf4' }]}>
              <MaterialCommunityIcons name="wallet-outline" size={18} color="#10b981" />
            </View>
            <Text style={styles.statLabel}>Wallet Balance</Text>
            <View style={styles.statValueRow}>
               <Text style={styles.statValue}>{stats.balance.toLocaleString()}</Text>
               <Text style={[styles.statUnit, { color: '#10b981' }]}>ETB</Text>
            </View>
          </View>

          <View style={styles.statItem}>
            <View style={[styles.iconBox, { backgroundColor: isDark ? '#451a03' : '#fffbeb' }]}>
              <Feather name="shield-off" size={18} color="#f59e0b" />
            </View>
            <Text style={styles.statLabel}>Cash Debt</Text>
            <View style={styles.statValueRow}>
               <Text style={styles.statValue}>{stats.cashHeld.toLocaleString()}</Text>
               <Text style={[styles.statUnit, { color: '#f59e0b' }]}>ETB</Text>
            </View>
          </View>
        </View>

        {/* TRANSACTION FEED */}
        <Text style={styles.sectionLabel}>Financial Ledger</Text>

        {isLoading ? (
          <View style={{ paddingVertical: 60 }}><ActivityIndicator color="#4f46e5" /></View>
        ) : history.length === 0 ? (
          <View style={styles.emptyState}>
             <Feather name="inbox" size={32} color={isDark ? '#334155' : "#cbd5e1"} />
             <Text style={styles.emptyText}>No activity detected.</Text>
          </View>
        ) : (
          <View style={styles.historyList}>
            {history.slice(0, 30).map((item: any, idx) => (
              <View key={idx} style={styles.transactionCard}>
                <View style={styles.transLeft}>
                  <View style={[styles.transIconBox, { 
                    backgroundColor: item.type === 'EARNING' ? (isDark ? '#064e3b' : '#f0fdf4') : item.type === 'SETTLEMENT' ? (isDark ? '#312e81' : '#f5f3ff') : (isDark ? '#451a03' : '#fffbeb'),
                  }]}>
                    <Feather
                      name={item.type === 'EARNING' ? "trending-up" : item.type === 'SETTLEMENT' ? "check-circle" : "upload-cloud"}
                      size={16}
                      color={item.type === 'EARNING' ? "#10b981" : item.type === 'SETTLEMENT' ? "#818cf8" : "#f59e0b"}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.transTitle} numberOfLines={1}>{item.title}</Text>
                    <Text style={styles.transDate}>{new Date(item.date).toLocaleDateString()}</Text>
                  </View>
                </View>
                
                <View style={styles.transRight}>
                  <Text style={[styles.transAmount, { color: item.type === 'EARNING' ? '#10b981' : (isDark ? '#818cf8' : '#4f46e5') }]}>
                    {item.type === 'EARNING' ? '+' : ''}{item.amount.toLocaleString()}
                  </Text>
                  {item.status !== 'COMPLETED' && (
                    <View style={styles.statusBadge}>
                      <Text style={styles.statusText}>{item.status}</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#020617' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  headerLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5 },
  headerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? 'white' : '#0f172a', marginTop: 2 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  performanceCard: { backgroundColor: '#4f46e5', borderRadius: 28, padding: 24, shadowColor: '#4f46e5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12, marginBottom: 20 },
  perfHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  perfLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 9 },
  perfSub: { color: 'rgba(255,255,255,0.5)', fontSize: 10, fontWeight: '600', marginTop: 8 },
  balanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 4 },
  balanceText: { color: 'white', fontSize: 32, fontWeight: '900', letterSpacing: -1 },
  balanceUnit: { color: 'white', fontWeight: '900', fontSize: 12 },
  statGrid: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statItem: { flex: 1, backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, padding: 16, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  iconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  statValueRow: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  statValue: { fontSize: 18, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  statUnit: { fontSize: 8, fontWeight: '900' },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', borderStyle: 'dashed' },
  emptyText: { color: '#64748b', marginTop: 12, fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  historyList: { marginBottom: 40, gap: 10 },
  transactionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  transLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  transIconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  transTitle: { fontSize: 14, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  transDate: { fontSize: 10, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
  transRight: { alignItems: 'flex-end' },
  transAmount: { fontWeight: '900', fontSize: 15 },
  statusBadge: { backgroundColor: isDark ? '#1e293b' : '#fffbeb', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, marginTop: 4 },
  statusText: { fontSize: 8, fontWeight: '900', color: '#f59e0b', textTransform: 'uppercase' },
});

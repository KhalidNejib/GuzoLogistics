import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import { settingService, RiderSettings } from '../../services/settingService';
import { activityService, ActivityEntry } from '../../services/activityService';

function iconForNotification(entry: ActivityEntry): { name: any; color: string; bg: (isDark: boolean) => string } {
  const type = (entry.data?.type as string) || '';
  if (type.includes('SETTLEMENT_APPROVED')) return { name: 'check-circle', color: '#10b981', bg: (d) => d ? '#064e3b' : '#f0fdf4' };
  if (type.includes('SETTLEMENT_REJECTED')) return { name: 'x-circle', color: '#ef4444', bg: (d) => d ? '#450a0a' : '#fef2f2' };
  if (type.includes('FLEET_SWITCH') || type.includes('DEACTIVAT') || type.includes('REVOKED')) return { name: 'alert-triangle', color: '#f59e0b', bg: (d) => d ? '#451a03' : '#fffbeb' };
  if (type.includes('ORDER') || type.includes('MISSION')) return { name: 'package', color: '#6366f1', bg: (d) => d ? '#312e81' : '#eef2ff' };
  return { name: 'bell', color: '#64748b', bg: (d) => d ? '#1e293b' : '#f8fafc' };
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString();
}

export default function ActivityScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  useEffect(() => {
    return activityService.subscribe(setEntries);
  }, []);

  // Mark everything read once the rider actually views the list.
  useFocusEffect(
    useCallback(() => {
      activityService.markAllRead();
    }, [])
  );

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {entries.length === 0 ? (
          <View style={styles.emptyState}>
            <Feather name="bell-off" size={32} color={isDark ? '#334155' : '#cbd5e1'} />
            <Text style={styles.emptyTitle}>No activity yet</Text>
            <Text style={styles.emptyDesc}>
              Notifications about your missions, settlements, and account will show up here as they arrive.
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {entries.map((entry) => {
              const icon = iconForNotification(entry);
              return (
                <View key={entry.id} style={[styles.card, !entry.read && styles.cardUnread]}>
                  <View style={[styles.iconBox, { backgroundColor: icon.bg(isDark) }]}>
                    <Feather name={icon.name} size={16} color={icon.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>{entry.title}</Text>
                    {!!entry.body && <Text style={styles.cardBody}>{entry.body}</Text>}
                    <Text style={styles.cardTime}>{timeAgo(entry.receivedAt)}</Text>
                  </View>
                  {!entry.read && <View style={styles.unreadDot} />}
                </View>
              );
            })}
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
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  emptyState: { padding: 40, alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', borderStyle: 'dashed', marginTop: 20 },
  emptyTitle: { color: isDark ? '#e2e8f0' : '#0f172a', marginTop: 14, fontWeight: '900', fontSize: 14 },
  emptyDesc: { color: '#94a3b8', marginTop: 6, fontWeight: '600', fontSize: 12, textAlign: 'center', lineHeight: 18 },
  list: { gap: 10, marginBottom: 40 },
  card: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  cardUnread: { borderColor: isDark ? '#4338ca' : '#c7d2fe' },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 14, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  cardBody: { fontSize: 12, color: '#94a3b8', fontWeight: '600', marginTop: 2, lineHeight: 17 },
  cardTime: { fontSize: 10, color: '#64748b', fontWeight: '700', marginTop: 6, textTransform: 'uppercase', letterSpacing: 0.5 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#6366f1', marginTop: 4, marginLeft: 8 },
});

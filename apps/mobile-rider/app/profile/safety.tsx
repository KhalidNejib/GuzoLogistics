import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { settingService, RiderSettings } from '../../services/settingService';

export default function SafetyScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const safetyItems = [
    { title: 'Emergency SOS', desc: 'Instantly alert dispatch', icon: 'alert-triangle', color: isDark ? '#450a0a' : '#fef2f2', iconColor: '#ef4444', route: '/profile/safety/emergency' },
    { title: 'Community Guidelines', desc: 'Rules for interactions', icon: 'book', color: isDark ? '#1e3a8a' : '#eff6ff', iconColor: '#3b82f6', route: '/profile/safety/guidelines' },
    { title: 'Incident Report', desc: 'Log a delivery issue', icon: 'file-text', color: isDark ? '#451a03' : '#fffbeb', iconColor: '#f59e0b', route: '/profile/safety/incident' },
    { title: 'Data Privacy', desc: 'Telemetry protections', icon: 'lock', color: isDark ? '#1e293b' : '#f8fafc', iconColor: '#64748b', route: '/profile/safety/privacy' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trust & Safety</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.shieldHalo}>
            <Feather name="shield" size={28} color="white" />
          </View>
          <Text style={styles.heroTitle}>Safety is Priority</Text>
          <Text style={styles.heroSub}>
            Guzo strictly monitors telemetry to ensure all pilots are driving safely and securely.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Safety Tools</Text>
        
        <View style={styles.toolList}>
          {safetyItems.map((item, idx) => (
            <TouchableOpacity 
              key={idx} 
              onPress={() => router.push(item.route as any)}
              style={styles.toolCard}
            >
              <View style={styles.toolLeft}>
                <View style={[styles.iconBox, { backgroundColor: item.color }]}>
                  <Feather name={item.icon as any} size={18} color={item.iconColor} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.toolTitle}>{item.title}</Text>
                  <Text style={styles.toolDesc}>{item.desc}</Text>
                </View>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? '#334155' : "#cbd5e1"} />
            </TouchableOpacity>
          ))}
        </View>
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
  heroCard: { backgroundColor: '#2563eb', padding: 24, borderRadius: 28, alignItems: 'center', marginBottom: 24, shadowColor: '#2563eb', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  shieldHalo: { backgroundColor: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.7)', textAlign: 'center', fontWeight: '600', fontSize: 11, lineHeight: 16 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  toolList: { gap: 10, marginBottom: 40 },
  toolCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  toolLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  toolTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  toolDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
});

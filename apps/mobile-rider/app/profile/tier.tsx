import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5 } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { settingService, RiderSettings } from '../../services/settingService';

export default function TierScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const benefits = [
    { title: 'Priority Dispatch', desc: 'Get mission pings 5s earlier', unlocked: true },
    { title: 'Premium Support', desc: 'Direct line to operators', unlocked: true },
    { title: 'Fuel Bonus', desc: '2% extra payout on long trips', unlocked: false },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Pilot Tier</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.rankCard}>
          <View style={styles.rankDecoration}>
            <FontAwesome5 name="medal" size={120} color="white" />
          </View>
          
          <Text style={styles.rankLabel}>Current Rank</Text>
          <Text style={styles.rankTitle}>GOLD</Text>
          
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: '82%' }]} />
          </View>
          <View style={styles.progressInfo}>
            <Text style={styles.progressText}>1,248 PTS</Text>
            <Text style={styles.progressText}>1,500 TO PLATINUM</Text>
          </View>
        </View>

        <Text style={styles.sectionLabel}>Tier Benefits</Text>
        
        <View style={styles.benefitList}>
          {benefits.map((item, idx) => (
            <View key={idx} style={[styles.benefitCard, !item.unlocked && { opacity: 0.6 }]}>
              <View style={styles.benefitLeft}>
                <View style={[styles.iconBox, { backgroundColor: item.unlocked ? (isDark ? '#451a03' : '#fef3c7') : (isDark ? '#1e293b' : '#f8fafc') }]}>
                  <Feather name={item.unlocked ? "check" : "lock"} size={16} color={item.unlocked ? "#f59e0b" : "#64748b"} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.benefitTitle, item.unlocked && { color: isDark ? '#fbbf24' : '#b45309' }]}>{item.title}</Text>
                  <Text style={styles.benefitDesc}>{item.desc}</Text>
                </View>
              </View>
            </View>
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
  rankCard: { backgroundColor: '#f59e0b', padding: 24, borderRadius: 32, alignItems: 'center', position: 'relative', overflow: 'hidden', shadowColor: '#f59e0b', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, marginBottom: 24 },
  rankDecoration: { position: 'absolute', right: -30, top: -20, opacity: 0.15 },
  rankLabel: { color: 'rgba(255,255,255,0.7)', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, fontSize: 9, marginBottom: 4 },
  rankTitle: { color: 'white', fontSize: 36, fontWeight: '900', marginBottom: 20 },
  progressTrack: { width: '100%', backgroundColor: 'rgba(255,255,255,0.2)', height: 6, borderRadius: 3, marginBottom: 10 },
  progressFill: { backgroundColor: 'white', height: 6, borderRadius: 3 },
  progressInfo: { width: '100%', flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { color: 'white', fontSize: 9, fontWeight: '900' },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  benefitList: { gap: 10, marginBottom: 40 },
  benefitCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  benefitLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  benefitTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  benefitDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },
});

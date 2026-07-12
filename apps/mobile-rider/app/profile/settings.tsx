import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { settingService, RiderSettings } from '../../services/settingService';

export default function SettingsScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const toggleSwitch = async (key: keyof RiderSettings) => {
    if (!preferences) return;
    Haptics.selectionAsync();
    const next = await settingService.updateSettings({ [key]: !preferences[key] });
    setPreferences(next);
  };

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const SettingRow = ({
    title, desc, icon, configKey, accentColor = '#6366f1',
  }: {
    title: string; desc: string; icon: any; configKey: keyof RiderSettings; accentColor?: string;
  }) => (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={[styles.iconBox, { backgroundColor: isDark ? (accentColor + '20') : (accentColor + '10') }]}>
          <Feather name={icon} size={18} color={isDark ? accentColor : accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardDesc}>{desc}</Text>
        </View>
      </View>
      {preferences ? (
        <Switch
          trackColor={{ false: isDark ? '#1e293b' : '#cbd5e1', true: accentColor }}
          thumbColor={'#ffffff'}
          ios_backgroundColor={isDark ? '#1e293b' : '#cbd5e1'}
          value={preferences[configKey] as boolean}
          onValueChange={() => toggleSwitch(configKey)}
        />
      ) : (
        <ActivityIndicator size="small" color="#6366f1" />
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terminal Settings</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Appearance</Text>
        <SettingRow title="Night Operations Mode" desc="Dark map & UI — protects vision" icon="moon" configKey="darkMode" accentColor="#818cf8" />
        <SettingRow title="Dark Tactical Map" desc="Dark tiles even outside Night Mode" icon="map" configKey="darkMap" accentColor="#8b5cf6" />

        <Text style={styles.sectionLabel}>Alerts & Hardware</Text>
        <SettingRow title="Mission Pings" desc="Push notifications for orders" icon="bell" configKey="notifications" accentColor="#10b981" />
        <SettingRow title="Audio Alerts" desc="Play sound for new missions" icon="volume-2" configKey="sound" accentColor="#f59e0b" />
        <SettingRow title="Haptic Feedback" desc="Vibrate on status changes" icon="smartphone" configKey="haptics" accentColor="#ec4899" />

        <Text style={styles.sectionLabel}>Advanced</Text>
        <SettingRow title="Auto-Accept Stack" desc="Automatically accept queued orders" icon="zap" configKey="autoAccept" accentColor="#f97316" />

        <View style={styles.infoBox}>
          <Feather name="info" size={14} color="#6366f1" />
          <Text style={styles.infoText}>
            Settings take effect immediately. Night Mode synchronizes across all terminal modules in real-time.
          </Text>
        </View>

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
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginTop: 12, marginLeft: 4 },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', marginBottom: 10 },
  cardLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, paddingRight: 12 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  cardDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 1 },
  infoBox: { marginTop: 16, backgroundColor: isDark ? '#0f172a' : '#eff6ff', padding: 16, borderRadius: 20, flexDirection: 'row', gap: 12, borderWidth: 1, borderColor: isDark ? '#1e3a8a' : '#dbeafe' },
  infoText: { fontSize: 11, color: isDark ? '#93c5fd' : '#1e40af', flex: 1, lineHeight: 16, fontWeight: '700' },
});

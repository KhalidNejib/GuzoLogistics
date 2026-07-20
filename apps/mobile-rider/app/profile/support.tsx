import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { settingService, RiderSettings } from '../../services/settingService';

const FAQS = [
  {
    q: 'My cash balance looks wrong. What do I do?',
    a: 'Open Profile > Earning Analytics to see the full transaction history. If a delivery still looks incorrect after checking there, submit a report below and fleet command will review it within 24 hours.',
  },
  {
    q: 'The app lost GPS signal mid-delivery.',
    a: 'Step outside or away from tall buildings, toggle Airplane Mode on/off, and confirm Location permission is set to "Always" in your phone settings. Your last known position is still visible to dispatch.',
  },
  {
    q: 'A customer or merchant was unsafe or abusive.',
    a: 'Use the Emergency SOS button on the map first if you feel unsafe right now. Otherwise, file an Incident Report under Trust & Safety so fleet command has a record.',
  },
  {
    q: 'How is my Rider Tier calculated?',
    a: 'Tier points are based on completed deliveries, on-time rate, and customer ratings over a rolling 30-day window. See Profile > Rider Tier for your current progress.',
  },
];

export default function SupportScreen() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const toggleFaq = (idx: number) => {
    Haptics.selectionAsync();
    setOpenFaq(prev => (prev === idx ? null : idx));
  };

  const contactOptions = [
    { icon: 'phone-call', label: 'Call Fleet Support', sub: '+251 90 000 0000 • 24/7', action: () => Linking.openURL('tel:+251900000000'), color: '#10b981' },
    { icon: 'message-circle', label: 'Chat with Dispatch', sub: 'Typical reply under 5 min', action: () => Linking.openURL('sms:+251900000000'), color: '#6366f1' },
    { icon: 'mail', label: 'Email Fleet Command', sub: 'support@guzo.et', action: () => Linking.openURL('mailto:support@guzo.et'), color: '#f59e0b' },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Support</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <View style={styles.heroHalo}>
            <MaterialCommunityIcons name="lifebuoy" size={28} color="white" />
          </View>
          <Text style={styles.heroTitle}>We've Got Your Back</Text>
          <Text style={styles.heroSub}>
            Stuck on a mission or have a question? Reach fleet command directly or check the answers below.
          </Text>
        </View>

        <Text style={styles.sectionLabel}>Contact Fleet Command</Text>
        <View style={styles.list}>
          {contactOptions.map((item, idx) => (
            <TouchableOpacity key={idx} onPress={item.action} style={styles.contactCard}>
              <View style={[styles.iconBox, { backgroundColor: isDark ? item.color + '22' : item.color + '15' }]}>
                <Feather name={item.icon as any} size={18} color={item.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{item.label}</Text>
                <Text style={styles.cardDesc}>{item.sub}</Text>
              </View>
              <Feather name="chevron-right" size={16} color={isDark ? '#334155' : '#cbd5e1'} />
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionLabel}>Frequently Asked</Text>
        <View style={styles.list}>
          {FAQS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <TouchableOpacity key={idx} onPress={() => toggleFaq(idx)} activeOpacity={0.8} style={styles.faqCard}>
                <View style={styles.faqHeaderRow}>
                  <Text style={styles.faqQuestion}>{item.q}</Text>
                  <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color={isDark ? '#94a3b8' : '#64748b'} />
                </View>
                {isOpen && <Text style={styles.faqAnswer}>{item.a}</Text>}
              </TouchableOpacity>
            );
          })}
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

  heroCard: { backgroundColor: '#0ea5a3', padding: 24, borderRadius: 28, alignItems: 'center', marginBottom: 24, shadowColor: '#0ea5a3', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.3, shadowRadius: 20, elevation: 12 },
  heroHalo: { backgroundColor: 'rgba(255,255,255,0.2)', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  heroTitle: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 6 },
  heroSub: { color: 'rgba(255,255,255,0.85)', textAlign: 'center', fontWeight: '600', fontSize: 11, lineHeight: 16 },

  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4, marginTop: 4 },
  list: { gap: 10, marginBottom: 24 },

  contactCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : 'white', padding: 12, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  iconBox: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardTitle: { fontSize: 15, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.2 },
  cardDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '700', marginTop: 2 },

  faqCard: { backgroundColor: isDark ? '#0f172a' : 'white', padding: 16, borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  faqHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  faqQuestion: { flex: 1, fontSize: 13, fontWeight: '800', color: isDark ? '#e2e8f0' : '#0f172a', letterSpacing: -0.1 },
  faqAnswer: { fontSize: 12, color: '#94a3b8', fontWeight: '600', lineHeight: 18, marginTop: 10 },
});

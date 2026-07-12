import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { BlurView } from 'expo-blur';
import { premiumKit as kit } from '../../../theme/premium-kit';
import { getCurrentLocation } from '../../../services/locationService';

export default function EmergencyScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [sosActive, setSosActive] = useState(false);

  const triggerSOS = () => {
    Alert.alert(
      'Initialize SOS Sequence?',
      'This will broadcast your live coordinates and biometric data to the security command center.',
      [
        { text: 'ABORT', style: 'cancel' },
        { 
          text: 'ACTIVATE', 
          style: 'destructive',
          onPress: async () => {
            setSosActive(true);
            try {
              const token = await getToken();
              // Get the rider's real position. We don't block the SOS on this —
              // if GPS can't resolve in time (denied permission, cold fix, etc.)
              // we still send the alert immediately without location rather than
              // risk delaying or failing an emergency broadcast.
              const location = await getCurrentLocation();
              await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/incidents`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`,
                  'ngrok-skip-browser-warning': 'true'
                },
                body: JSON.stringify({ 
                  type: 'SOS', 
                  description: 'Emergency SOS Triggered by Rider - TACTICAL ALERT',
                  ...(location ? { location } : {})
                })
              });
              Alert.alert('BEACON ACTIVE', 'Security teams have been notified.');
            } catch (err) {
              Alert.alert('FAILURE', 'Comms failure. Use local lines.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[kit.safeArea, { backgroundColor: '#020617' }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 16 }}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Feather name="chevron-left" size={24} color="white" />
            </TouchableOpacity>
            <View>
                <Text style={styles.headerLabel}>Security Protocol</Text>
                <Text style={styles.headerTitle}>Command SOS</Text>
            </View>
        </View>
        <View style={styles.shieldBadge}>
            <Ionicons name="shield-checkmark" size={18} color="#f43f5e" />
        </View>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 32, paddingTop: 40 }} showsVerticalScrollIndicator={false}>
        <View style={styles.warningCard}>
            <Text style={styles.warningLabel}>Tactical Warning</Text>
            <Text style={styles.warningText}>
                Activating the SOS beacon initiates an immediate multi-departmental response. Use ONLY in physical danger.
            </Text>
            <View style={styles.commsBadge}>
                <Feather name="alert-octagon" size={14} color="#f43f5e" />
                <Text style={styles.commsText}>Priority Comms Enabled</Text>
            </View>
        </View>

        {/* SOS Button */}
        <View style={styles.sosContainer}>
          <TouchableOpacity 
            onPress={triggerSOS}
            activeOpacity={0.8}
            style={[styles.sosBtn, sosActive && { backgroundColor: '#450a0a', borderColor: '#e11d48' }]}
          >
            <View style={[styles.sosInner, sosActive && { borderColor: '#f43f5e', backgroundColor: '#7f1d1d' }]}>
               {sosActive ? (
                 <View style={{ alignItems: 'center' }}>
                    <ActivityIndicator color="white" size="large" />
                    <Text style={styles.sosLabel}>ACTIVE</Text>
                 </View>
               ) : (
                 <View style={{ alignItems: 'center' }}>
                    <FontAwesome5 name="skull-crossbones" size={48} color="white" />
                    <Text style={styles.sosMainText}>SOS</Text>
                 </View>
               )}
            </View>
          </TouchableOpacity>
        </View>

        {sosActive && (
          <View style={styles.intelCard}>
            <View style={styles.intelHeader}>
              <View style={styles.intelPulse} />
              <Text style={styles.intelLabel}>Transmission Active</Text>
            </View>
            <Text style={styles.intelTitle}>Live Telemetry Synchronized</Text>
            <Text style={styles.intelSub}>
              Protocol ALPHA-9 is active. Security hub is monitoring your location. Stay at your location if safe.
            </Text>
          </View>
        )}

        <View style={{ alignItems: 'center', marginBottom: 120 }}>
             <Text style={styles.footerText}>Guzo Security Command</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 24, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { width: 48, height: 48, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  headerLabel: { fontSize: 9, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 3 },
  headerTitle: { fontSize: 20, fontWeight: '900', color: 'white' },
  shieldBadge: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(244,63,94,0.1)', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(244,63,94,0.2)' },
  warningCard: { backgroundColor: 'rgba(255,255,255,0.05)', padding: 32, borderRadius: 40, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', marginBottom: 48 },
  warningLabel: { fontSize: 10, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 16 },
  warningText: { color: '#cbd5e1', fontSize: 14, fontWeight: '600', lineHeight: 22, marginBottom: 24 },
  commsBadge: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(244,63,94,0.15)', padding: 12, borderRadius: 16 },
  commsText: { color: '#fb7185', fontWeight: '900', fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  sosContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 40, marginBottom: 64 },
  sosBtn: { width: 256, height: 256, borderRadius: 128, backgroundColor: '#e11d48', borderWidth: 10, borderColor: 'rgba(69,10,10,0.4)', alignItems: 'center', justifyContent: 'center', elevation: 20, shadowColor: '#f43f5e', shadowOpacity: 0.5, shadowRadius: 32 },
  sosInner: { width: 192, height: 192, borderRadius: 96, backgroundColor: '#e11d48', borderWidth: 4, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  sosLabel: { color: 'white', fontWeight: '900', fontSize: 13, marginTop: 16, letterSpacing: 6 },
  sosMainText: { color: 'white', fontWeight: '900', fontSize: 24, marginTop: 12, letterSpacing: 8 },
  intelCard: { backgroundColor: '#0f172a', padding: 32, borderRadius: 40, borderWidth: 1, borderColor: '#f43f5e', marginBottom: 80 },
  intelHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 24 },
  intelPulse: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#f43f5e' },
  intelLabel: { fontSize: 10, fontWeight: '900', color: '#f43f5e', textTransform: 'uppercase', letterSpacing: 2 },
  intelTitle: { color: 'white', fontSize: 18, fontWeight: '900', marginBottom: 8 },
  intelSub: { color: '#94a3b8', fontSize: 12, fontWeight: '600', lineHeight: 20 },
  footerText: { color: '#475569', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 4 }
});

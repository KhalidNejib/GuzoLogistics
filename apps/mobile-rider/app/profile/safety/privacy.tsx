import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { premiumKit as kit } from '../../../theme/premium-kit';

export default function PrivacyScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={[kit.safeArea, kit.bgLight]}>
      <View style={[kit.header, kit.headerLight]}>
        <TouchableOpacity onPress={() => router.back()} style={kit.backBtn}>
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={kit.headerTitle}>Data Privacy</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <View style={[kit.card, { backgroundColor: '#1e293b', padding: 24, marginBottom: 32 }]}>
          <Feather name="lock" size={24} color="#38bdf8" style={{ marginBottom: 16 }} />
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 8 }}>End-to-End Encryption</Text>
          <Text style={{ color: '#94a3b8', fontSize: 14, lineHeight: 20 }}>
            Your location telemetry, delivery statistics, and personal information are securely encrypted and protected in accordance with international data laws.
          </Text>
        </View>

        <Text style={[kit.label, { marginBottom: 16 }]}>What we collect</Text>
        
        <View style={[kit.card, kit.cardLight, { padding: 24, marginBottom: 40 }]}>
          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Feather name="map-pin" size={18} color="#64748b" style={{ marginTop: 2, marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={kit.title}>Live Telemetry (GPS)</Text>
              <Text style={[kit.subTitle, { marginTop: 4 }]}>We only track your exact location when you are marked as 'Active Patrol' and have an assigned mission.</Text>
            </View>
          </View>
          
          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 24 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: 24 }}>
            <Feather name="smartphone" size={18} color="#64748b" style={{ marginTop: 2, marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={kit.title}>Device Telemetry</Text>
              <Text style={[kit.subTitle, { marginTop: 4 }]}>We monitor battery levels and network strength to assign missions to pilots with stable connections.</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: '#f1f5f9', marginBottom: 24 }} />

          <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <Feather name="dollar-sign" size={18} color="#64748b" style={{ marginTop: 2, marginRight: 16 }} />
            <View style={{ flex: 1 }}>
              <Text style={kit.title}>Financial Data</Text>
              <Text style={[kit.subTitle, { marginTop: 4 }]}>Your payout details are securely routed to our FinTech partner. Guzo does not store raw banking credentials.</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

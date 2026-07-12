import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { premiumKit as kit } from '../../../theme/premium-kit';

export default function GuidelinesScreen() {
  const router = useRouter();

  const rules = [
    { title: 'Zero Tolerance for Altercations', desc: 'Maintain a professional demeanor with merchants and customers at all times. Any physical or verbal altercations will result in immediate termination of the pilot contract.' },
    { title: 'Package Integrity', desc: 'Never open or tamper with a sealed package. If a package appears damaged upon pickup, photograph it and report it immediately before accepting the mission.' },
    { title: 'Traffic Compliance', desc: 'All pilots must adhere strictly to local traffic laws. Running red lights or driving on sidewalks to meet an ETA is strictly prohibited.' },
    { title: 'Proof of Delivery (P.O.D)', desc: 'You must never mark a package as delivered without entering the correct 4-digit code provided by the recipient.' },
  ];

  return (
    <SafeAreaView style={[kit.safeArea, kit.bgLight]}>
      <View style={[kit.header, kit.headerLight]}>
        <TouchableOpacity onPress={() => router.back()} style={kit.backBtn}>
          <Feather name="arrow-left" size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={kit.headerTitle}>Guidelines</Text>
      </View>

      <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
        <View style={[kit.card, { backgroundColor: '#2563eb', padding: 24, marginBottom: 32 }]}>
          <Feather name="book-open" size={24} color="white" style={{ marginBottom: 16 }} />
          <Text style={{ color: 'white', fontSize: 20, fontWeight: '900', marginBottom: 8 }}>Pilot Handbook</Text>
          <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 20 }}>
            By operating on the Guzo network, you agree to uphold the highest standards of safety and professionalism.
          </Text>
        </View>

        <Text style={[kit.label, { marginBottom: 16 }]}>Core Principles</Text>

        <View style={{ gap: 16, marginBottom: 40 }}>
          {rules.map((rule, idx) => (
            <View key={idx} style={[kit.card, kit.cardLight, { padding: 20 }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                <View style={{ backgroundColor: '#eff6ff', width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                  <Text style={{ color: '#2563eb', fontWeight: '900', fontSize: 12 }}>{idx + 1}</Text>
                </View>
                <Text style={[kit.title, { flex: 1 }]}>{rule.title}</Text>
              </View>
              <Text style={[kit.subTitle, { paddingLeft: 44, fontSize: 13, lineHeight: 20 }]}>{rule.desc}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

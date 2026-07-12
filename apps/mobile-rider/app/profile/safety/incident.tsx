import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, KeyboardAvoidingView, Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import { premiumKit as kit } from '../../../theme/premium-kit';

export default function IncidentScreen() {
  const router = useRouter();
  const [type, setType] = useState('');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { getToken } = useAuth();
  const types = ['Traffic Accident', 'Merchant Dispute', 'App Malfunction', 'Other'];

  const submitReport = async () => {
    if (!type || !desc) {
      Alert.alert('Missing Info', 'Please select an incident type and provide a description.');
      return;
    }
    setSubmitting(true);
    
    try {
      const token = await getToken();
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000'}/api/v1/incidents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ type, description: desc })
      });

      if (!response.ok) throw new Error('Failed to submit');

      Alert.alert('Report Filed', 'Your incident report has been securely transmitted to the dispatch team.', [
        { text: 'Understood', onPress: () => router.back() }
      ]);
    } catch (error) {
      Alert.alert('Transmission Failed', 'Could not send the report to the server.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[kit.safeArea, kit.bgLight]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <View style={[kit.header, kit.headerLight]}>
          <TouchableOpacity onPress={() => router.back()} style={kit.backBtn}>
            <Feather name="arrow-left" size={20} color="#0f172a" />
          </TouchableOpacity>
          <Text style={kit.headerTitle}>Incident Report</Text>
        </View>

        <ScrollView style={{ flex: 1, paddingHorizontal: 24, paddingTop: 24 }}>
          <Text style={[kit.label, { marginBottom: 16 }]}>Incident Type</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 }}>
            {types.map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setType(t)}
                style={[
                  styles.chip,
                  type === t ? { backgroundColor: '#fef3c7', borderColor: '#fcd34d' } : { backgroundColor: 'white', borderColor: '#e2e8f0' }
                ]}
              >
                <Text style={[styles.chipText, type === t ? { color: '#b45309' } : { color: '#64748b' }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={[kit.label, { marginBottom: 16 }]}>Description</Text>
          <View style={[kit.card, kit.cardLight, { padding: 20, marginBottom: 32 }]}>
            <TextInput
              style={styles.textArea}
              placeholder="Provide a detailed description..."
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              value={desc}
              onChangeText={setDesc}
            />
          </View>

          <TouchableOpacity
            onPress={submitReport}
            disabled={submitting}
            style={[styles.submitBtn, submitting && { backgroundColor: '#fcd34d' }]}
          >
            <Text style={styles.submitBtnText}>
              {submitting ? 'Transmitting...' : 'Submit Report'}
            </Text>
            {!submitting && <Feather name="send" size={16} color="white" />}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  chip: { borderRadius: 100, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
  textArea: { fontSize: 16, fontWeight: '600', color: '#0f172a', minHeight: 180 },
  submitBtn: { width: '100%', height: 64, borderRadius: 32, backgroundColor: '#f59e0b', flexDirection: 'row', justifyContent: 'center', alignItems: 'center', shadowColor: '#f59e0b', shadowOpacity: 0.3, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 8, marginBottom: 40 },
  submitBtnText: { color: 'white', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 2, marginRight: 12 }
});

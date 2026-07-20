import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { settingService, RiderSettings } from '../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

type DocKey = 'licensePhotoUrl' | 'faydaIdPhotoUrl' | 'vehiclePhotoUrl';

const DOC_DEFS: { key: DocKey; uploadType: string; title: string; desc: string; icon: any }[] = [
  { key: 'licensePhotoUrl', uploadType: 'license', title: 'Driving License', desc: 'Valid driving license photo', icon: 'credit-card' },
  { key: 'faydaIdPhotoUrl', uploadType: 'national-id', title: 'National ID (Fayda)', desc: 'Government-issued ID', icon: 'user-check' },
  { key: 'vehiclePhotoUrl', uploadType: 'vehicle', title: 'Vehicle Photo', desc: 'Clear photo of your vehicle', icon: 'truck' },
];

export default function DocumentsScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [docs, setDocs] = useState<Record<DocKey, string | null>>({
    licensePhotoUrl: null,
    faydaIdPhotoUrl: null,
    vehiclePhotoUrl: null,
  });
  const [onboardingStatus, setOnboardingStatus] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);
  const [uploadingKey, setUploadingKey] = useState<DocKey | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/user/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setDocs({
          licensePhotoUrl: data.riderProfile?.licensePhotoUrl || null,
          faydaIdPhotoUrl: data.riderProfile?.faydaIdPhotoUrl || null,
          vehiclePhotoUrl: data.riderProfile?.vehiclePhotoUrl || null,
        });
        setOnboardingStatus(data.riderProfile?.onboardingStatus || null);
        setRejectionReason(data.riderProfile?.rejectionReason || null);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const reupload = async (key: DocKey, uploadType: string, source: 'camera' | 'gallery') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to update this document.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (result.canceled || !result.assets[0]?.base64) return;

    try {
      setUploadingKey(key);
      Haptics.selectionAsync();
      const token = await getToken();

      const uploadRes = await fetch(`${API_URL}/api/v1/merchant/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ imageBase64: result.assets[0].base64, documentType: uploadType }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');

      const patchRes = await fetch(`${API_URL}/api/v1/user/documents`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ [key]: uploadData.url }),
      });
      const patchData = await patchRes.json().catch(() => ({}));
      if (!patchRes.ok) throw new Error(patchData.error || 'Failed to submit document');

      setDocs((prev) => ({ ...prev, [key]: uploadData.url }));
      setOnboardingStatus('IN_REVIEW');
      setRejectionReason(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Submitted', 'Your document was submitted for review.');
    } catch (err: any) {
      console.error('Document reupload error:', err);
      Alert.alert('Error', err.message || 'Could not submit document.');
    } finally {
      setUploadingKey(null);
    }
  };

  const confirmReupload = (key: DocKey, uploadType: string, title: string) => {
    Alert.alert(title, 'Choose a source', [
      { text: 'Camera', onPress: () => reupload(key, uploadType, 'camera') },
      { text: 'Photo Library', onPress: () => reupload(key, uploadType, 'gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}><ActivityIndicator color="#0284c7" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
          <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Documents</Text>
      </View>

      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {onboardingStatus === 'REJECTED' && rejectionReason && (
          <View style={styles.rejectionBox}>
            <Feather name="alert-triangle" size={14} color="#ef4444" />
            <View style={{ flex: 1 }}>
              <Text style={styles.rejectionTitle}>Application Rejected</Text>
              <Text style={styles.rejectionText}>{rejectionReason}</Text>
            </View>
          </View>
        )}

        {onboardingStatus === 'IN_REVIEW' && (
          <View style={styles.infoBox}>
            <Feather name="clock" size={14} color="#6366f1" />
            <Text style={styles.infoText}>Your documents are under review by fleet command.</Text>
          </View>
        )}

        <Text style={styles.sectionLabel}>Compliance Documents</Text>
        <Text style={styles.sectionDesc}>
          Re-submitting a document sends it back for review. You'll stay approved to drive while it's reviewed unless fleet command flags an issue.
        </Text>

        <View style={styles.list}>
          {DOC_DEFS.map((def) => {
            const url = docs[def.key];
            const isUploading = uploadingKey === def.key;
            return (
              <View key={def.key} style={styles.card}>
                <View style={styles.cardTop}>
                  {url ? (
                    <Image source={{ uri: url }} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty]}>
                      <Feather name={def.icon} size={20} color={isDark ? '#334155' : '#cbd5e1'} />
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{def.title}</Text>
                    <Text style={styles.cardDesc}>{def.desc}</Text>
                    <View style={[styles.statusPill, url ? styles.statusPillActive : styles.statusPillMissing]}>
                      <Text style={[styles.statusPillText, url ? styles.statusPillTextActive : styles.statusPillTextMissing]}>
                        {url ? 'On File' : 'Missing'}
                      </Text>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.reuploadBtn}
                  onPress={() => confirmReupload(def.key, def.uploadType, def.title)}
                  disabled={isUploading}
                  accessibilityRole="button"
                  accessibilityLabel={`Re-upload ${def.title}`}
                >
                  {isUploading ? (
                    <ActivityIndicator size="small" color="#0284c7" />
                  ) : (
                    <>
                      <Feather name="upload" size={13} color="#0284c7" />
                      <Text style={styles.reuploadText}>{url ? 'Re-upload' : 'Upload'}</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
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
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#020617' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? 'white' : '#0f172a', marginLeft: 16 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 20 },
  rejectionBox: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: isDark ? '#450a0a' : '#fef2f2', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#ef444440' },
  rejectionTitle: { fontSize: 12, fontWeight: '900', color: '#ef4444', marginBottom: 2 },
  rejectionText: { fontSize: 11, color: isDark ? '#fca5a5' : '#991b1b', fontWeight: '600', lineHeight: 16 },
  infoBox: { flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: isDark ? '#1e1b4b' : '#eef2ff', borderRadius: 16, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: '#6366f140' },
  infoText: { fontSize: 11, color: isDark ? '#c7d2fe' : '#4338ca', fontWeight: '700', flex: 1 },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 6, marginLeft: 4 },
  sectionDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '600', lineHeight: 16, marginBottom: 16, marginLeft: 4 },
  list: { gap: 12, marginBottom: 40 },
  card: { backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', padding: 14 },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  thumb: { width: 56, height: 56, borderRadius: 14, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
  thumbEmpty: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#e2e8f0', borderStyle: 'dashed' },
  cardTitle: { fontSize: 13, fontWeight: '900', color: isDark ? '#e2e8f0' : '#0f172a' },
  cardDesc: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2, marginBottom: 6 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusPillActive: { backgroundColor: isDark ? '#064e3b' : '#f0fdf4' },
  statusPillMissing: { backgroundColor: isDark ? '#451a03' : '#fffbeb' },
  statusPillText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase' },
  statusPillTextActive: { color: '#10b981' },
  statusPillTextMissing: { color: '#f59e0b' },
  reuploadBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: isDark ? '#0c4a6e33' : '#f0f9ff', borderRadius: 12, paddingVertical: 10, borderWidth: 1, borderColor: '#0284c740' },
  reuploadText: { fontSize: 11, fontWeight: '900', color: '#0284c7', textTransform: 'uppercase', letterSpacing: 0.5 },
});

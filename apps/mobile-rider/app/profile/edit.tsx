import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, TextInput, ActivityIndicator, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { settingService, RiderSettings } from '../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

export default function EditProfileScreen() {
  const router = useRouter();
  const { getToken } = useAuth();
  const { user } = useUser();
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const [hasInitialized, setHasInitialized] = useState(false);

  const fetchProfile = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/v1/user/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setFullName(data.fullName || '');
        setPhoneNumber(data.phoneNumber || '');
        setPhotoUrl(data.riderProfile?.profilePhotoUrl || null);
        setEmergencyName(data.riderProfile?.emergencyContact?.name || '');
        setEmergencyPhone(data.riderProfile?.emergencyContact?.phone || '');
        setEmergencyRelationship(data.riderProfile?.emergencyContact?.relationship || '');
      }
    } catch (err) {
      console.error('Failed to load profile:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!hasInitialized) {
      fetchProfile();
      setHasInitialized(true);
    }
  }, [fetchProfile, hasInitialized]);

  const pickPhoto = async (source: 'camera' | 'gallery') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to change your photo.');
      return;
    }
    const result = source === 'camera'
      ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7, allowsEditing: true, aspect: [1, 1] })
      : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets[0]?.base64) return;

    try {
      setIsUploadingPhoto(true);
      Haptics.selectionAsync();
      const token = await getToken();
      const uploadRes = await fetch(`${API_URL}/api/v1/merchant/upload-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ imageBase64: result.assets[0].base64, documentType: 'profile' }),
      });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error || 'Upload failed');
      setPhotoUrl(uploadData.url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err) {
      console.error('Photo upload error:', err);
      Alert.alert('Error', 'Could not upload photo. Please try again.');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const choosePhotoSource = () => {
    Alert.alert('Change Photo', 'Choose a source', [
      { text: 'Camera', onPress: () => pickPhoto('camera') },
      { text: 'Photo Library', onPress: () => pickPhoto('gallery') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      Alert.alert('Name required', 'Please enter your full name.');
      return;
    }
    try {
      setIsSaving(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({
          fullName: fullName.trim(),
          phoneNumber: phoneNumber.trim(),
          profilePhotoUrl: photoUrl || undefined,
          emergencyContact: {
            name: emergencyName.trim(),
            phone: emergencyPhone.trim(),
            relationship: emergencyRelationship.trim(),
          },
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to save');
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Saved', 'Your profile has been updated.', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (err: any) {
      console.error('Save profile error:', err);
      Alert.alert('Error', err.message || 'Could not save your changes.');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingBox}><ActivityIndicator color="#6366f1" /></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} accessibilityLabel="Go back" accessibilityRole="button">
            <Feather name="arrow-left" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
        </View>

        <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.avatarSection}>
            <TouchableOpacity
              style={styles.avatarWrap}
              onPress={choosePhotoSource}
              disabled={isUploadingPhoto}
              accessibilityLabel="Change profile photo"
              accessibilityRole="button"
            >
              <Image
                source={{ uri: photoUrl || user?.imageUrl || 'https://via.placeholder.com/150' }}
                style={styles.avatar}
              />
              <View style={styles.avatarBadge}>
                {isUploadingPhoto ? <ActivityIndicator size="small" color="white" /> : <Feather name="camera" size={16} color="white" />}
              </View>
            </TouchableOpacity>
            <Text style={styles.avatarHint}>Tap to change photo</Text>
          </View>

          <Text style={styles.sectionLabel}>Basic Info</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Full Name</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
            />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Phone Number</Text>
            <TextInput
              style={styles.input}
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              placeholder="09XXXXXXXX"
              placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
              keyboardType="phone-pad"
            />
          </View>

          <Text style={styles.sectionLabel}>Emergency Contact</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Contact Name</Text>
            <TextInput
              style={styles.input}
              value={emergencyName}
              onChangeText={setEmergencyName}
              placeholder="Full name"
              placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
            />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Contact Phone</Text>
            <TextInput
              style={styles.input}
              value={emergencyPhone}
              onChangeText={setEmergencyPhone}
              placeholder="09XXXXXXXX"
              placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
              keyboardType="phone-pad"
            />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Relationship</Text>
            <TextInput
              style={styles.input}
              value={emergencyRelationship}
              onChangeText={setEmergencyRelationship}
              placeholder="e.g. Spouse, Parent, Sibling"
              placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
            />
          </View>

          <TouchableOpacity
            style={[styles.saveBtn, isSaving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={isSaving}
            accessibilityRole="button"
            accessibilityLabel="Save profile changes"
          >
            {isSaving ? <ActivityIndicator size="small" color="white" /> : <Text style={styles.saveBtnText}>Save Changes</Text>}
          </TouchableOpacity>

          <View style={{ height: 60 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, backgroundColor: isDark ? '#020617' : 'white', borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  backBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  headerTitle: { fontSize: 18, fontWeight: '900', color: isDark ? 'white' : '#0f172a', marginLeft: 16 },
  scroll: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  avatarSection: { alignItems: 'center', marginBottom: 28 },
  avatarWrap: { position: 'relative' },
  avatar: { width: 96, height: 96, borderRadius: 48, borderWidth: 3, borderColor: isDark ? '#1e293b' : 'white' },
  avatarBadge: { position: 'absolute', right: -2, bottom: -2, width: 32, height: 32, borderRadius: 16, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: isDark ? '#020617' : '#f8fafc' },
  avatarHint: { marginTop: 10, fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  sectionLabel: { fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 2, marginBottom: 12, marginLeft: 4 },
  card: { backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 20, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9', padding: 16, marginBottom: 24 },
  fieldLabel: { fontSize: 10, fontWeight: '900', color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
  input: { fontSize: 14, fontWeight: '700', color: isDark ? '#e2e8f0' : '#0f172a', paddingVertical: 6 },
  divider: { height: 1, backgroundColor: isDark ? '#1e293b' : '#f1f5f9', marginVertical: 12 },
  saveBtn: { backgroundColor: '#6366f1', paddingVertical: 16, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: 'white', fontWeight: '900', fontSize: 13, textTransform: 'uppercase', letterSpacing: 1.5 },
});

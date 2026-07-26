/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  StyleSheet,
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { settingService, RiderSettings } from '../../services/settingService';

export default function RegisterScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const onSignUpPress = async () => {
    if (!isLoaded) return;
    if (!firstName.trim() || !emailAddress.trim() || !password.trim()) {
      Alert.alert('Missing Info', 'Please fill in all core fields.');
      return;
    }
    setLoading(true);
    try {
      await signUp.create({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        emailAddress,
        password,
        unsafeMetadata: { role: 'RIDER' },
      });
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      setPendingVerification(true);
    } catch (err: any) {
      Alert.alert('Registration Failed', err.errors?.[0]?.message || 'Check your details.');
    } finally {
      setLoading(false);
    }
  };

  const onPressVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);
    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({ code });
      await setActive({ session: completeSignUp.createdSessionId });
      Alert.alert('Account Created', 'Welcome to the fleet!', [
        { text: 'Continue', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      Alert.alert('Verification Failed', 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => {
              if (pendingVerification) {
                setPendingVerification(false);
              } else {
                router.push('/(auth)/login' as any);
              }
            }}
            style={styles.backBtn}
          >
            <Ionicons name="arrow-back" size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {pendingVerification ? 'Verify Email' : 'Join the Fleet'}
          </Text>
          <Text style={styles.subTitle}>
            {pendingVerification
              ? 'Enter the code we sent to your email.'
              : 'Create your rider account to start delivering.'}
          </Text>
        </View>

        <View style={styles.content}>
          {!pendingVerification ? (
            <View style={{ gap: 14 }}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>First Name *</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <TextInput
                      autoCapitalize="words"
                      value={firstName}
                      placeholder="Abebe"
                      placeholderTextColor={isDark ? '#4b5563' : '#64748b'}
                      style={styles.inputText}
                      onChangeText={setFirstName}
                    />
                  </View>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Last Name</Text>
                  <View style={styles.inputBox}>
                    <Ionicons name="person-outline" size={16} color="#64748b" />
                    <TextInput
                      autoCapitalize="words"
                      value={lastName}
                      placeholder="Kebede"
                      placeholderTextColor={isDark ? '#4b5563' : '#64748b'}
                      style={styles.inputText}
                      onChangeText={setLastName}
                    />
                  </View>
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Email Address</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail-outline" size={16} color="#64748b" />
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={emailAddress}
                    placeholder="rider@ethio-logistics.com"
                    placeholderTextColor={isDark ? '#4b5563' : '#64748b'}
                    style={styles.inputText}
                    onChangeText={setEmailAddress}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Create Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed-outline" size={16} color="#64748b" />
                  <TextInput
                    value={password}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? '#4b5563' : '#64748b'}
                    secureTextEntry
                    style={styles.inputText}
                    onChangeText={setPassword}
                  />
                </View>
              </View>

              <TouchableOpacity
                onPress={onSignUpPress}
                disabled={loading}
                style={[
                  styles.primaryBtn,
                  loading && { backgroundColor: isDark ? '#334155' : '#94a3b8' },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryBtnText}>Create Account</Text>
                )}
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 20 }}>
              <View>
                <Text style={styles.inputLabel}>Verification Code</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="#64748b" />
                  <TextInput
                    value={code}
                    placeholder="123456"
                    keyboardType="number-pad"
                    placeholderTextColor={isDark ? '#4b5563' : '#64748b'}
                    style={[
                      styles.inputText,
                      { letterSpacing: 8, fontWeight: '900', fontSize: 20 },
                    ]}
                    onChangeText={setCode}
                  />
                </View>
                <Text style={styles.codeHint}>We sent a code to {emailAddress}</Text>
              </View>

              <TouchableOpacity
                onPress={onPressVerify}
                disabled={loading}
                style={[
                  styles.primaryBtn,
                  { backgroundColor: '#10b981' },
                  loading && { backgroundColor: '#94a3b8' },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.primaryBtnText}>Verify Email</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.footer}>
            <Text
              style={{ color: isDark ? '#64748b' : '#64748b', fontSize: 13, fontWeight: '600' }}
            >
              Already a rider?{' '}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login' as any)}>
              <Text style={{ color: '#2563eb', fontWeight: '900', fontSize: 13 }}>Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDark: boolean) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
    header: { paddingHorizontal: 24, paddingTop: 48, marginBottom: 24 },
    backBtn: {
      width: 40,
      height: 40,
      borderRadius: 12,
      backgroundColor: isDark ? '#0f172a' : 'white',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      borderWidth: 1,
      borderColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    title: {
      fontSize: 28,
      fontWeight: '900',
      color: isDark ? '#f8fafc' : '#0f172a',
      letterSpacing: -0.5,
    },
    subTitle: { fontSize: 14, color: '#64748b', marginTop: 4, fontWeight: '600' },
    content: { paddingHorizontal: 24 },
    inputLabel: {
      fontSize: 9,
      fontWeight: '900',
      color: isDark ? '#64748b' : '#94a3b8',
      textTransform: 'uppercase',
      letterSpacing: 1.5,
      marginBottom: 6,
      marginLeft: 4,
    },
    inputBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: isDark ? '#0f172a' : 'white',
      borderRadius: 14,
      paddingHorizontal: 12,
      height: 50,
      borderWidth: 1,
      borderColor: isDark ? '#1e293b' : '#f1f5f9',
    },
    inputText: {
      flex: 1,
      marginLeft: 10,
      fontSize: 14,
      fontWeight: '700',
      color: isDark ? '#f8fafc' : '#0f172a',
    },
    primaryBtn: {
      height: 56,
      backgroundColor: '#2563eb',
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 12,
      shadowColor: '#2563eb',
      shadowOpacity: 0.25,
      shadowRadius: 15,
      shadowOffset: { width: 0, height: 6 },
      elevation: 4,
    },
    primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 16 },
    codeHint: {
      fontSize: 11,
      color: '#94a3b8',
      textAlign: 'center',
      marginTop: 12,
      fontWeight: '600',
    },
    footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 40, paddingVertical: 24 },
  });

const styles = StyleSheet.create({
  backBtn: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  title: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -0.5 },
  subTitle: { fontSize: 16, color: '#64748b', marginTop: 8, fontWeight: '500' },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 60,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  inputText: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  primaryBtn: {
    height: 64,
    backgroundColor: '#2563eb',
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    shadowColor: '#2563eb',
    shadowOpacity: 0.2,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 18 },
  codeHint: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    marginTop: 12,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 'auto',
    paddingVertical: 40,
  },
});

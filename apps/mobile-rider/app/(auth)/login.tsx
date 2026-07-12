/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
  Keyboard,
  StyleSheet,
  Dimensions
} from 'react-native';
import { useSignIn, useOAuth, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';
import { settingService, RiderSettings } from '../../services/settingService';

const { width } = Dimensions.get('window');

WebBrowser.maybeCompleteAuthSession();

function useWarmUpBrowser() {
  useEffect(() => {
    void WebBrowser.warmUpAsync();
    return () => {
      void WebBrowser.coolDownAsync();
    };
  }, []);
}

export default function LoginScreen() {
  useWarmUpBrowser();
  const { signIn, setActive, isLoaded } = useSignIn();
  const { startOAuthFlow } = useOAuth({ strategy: 'oauth_google' });
  const { isSignedIn } = useAuth();
  const router = useRouter();

  const passwordRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preferences, setPreferences] = useState<RiderSettings | null>(null);

  useEffect(() => {
    return settingService.subscribe(setPreferences);
  }, []);

  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn]);

  const handleSuccess = async (sessionId: string, setFunc: any) => {
    try {
      if (setFunc) {
        await setFunc({ session: sessionId });
        Alert.alert(
          'Identity Verified', 
          'Welcome back! Mission parameters synchronized.',
          [{ text: 'Launch Terminal', onPress: () => router.replace('/(tabs)') }]
        );
      }
    } catch (err) {
      setLoading(false);
    }
  };

  const onSignInPress = async () => {
    if (!isLoaded || loading) return;
    if (!emailAddress || !password) {
      Alert.alert('Missing Info', 'Please enter your email and password.');
      return;
    }

    Keyboard.dismiss();
    setLoading(true);

    try {
      const result = await signIn.create({
        identifier: emailAddress.trim().toLowerCase(),
        password: password,
      });

      if (result.status === 'complete') {
        await handleSuccess(result.createdSessionId!, setActive);
      } else {
        setLoading(false);
        Alert.alert('Incomplete Sign-In', `Status: ${result.status}`);
      }
    } catch (err: any) {
      Alert.alert('Access Denied', 'Invalid credentials or fleet key.');
      setLoading(false);
    }
  };

  const onGoogleSignInPress = useCallback(async () => {
    if (loading) return;
    Keyboard.dismiss();
    setLoading(true);

    try {
      const { createdSessionId, setActive: setOAuthActive } = await startOAuthFlow({
        redirectUrl: Linking.createURL('/', { scheme: 'mobilerider' }),
      });

      if (createdSessionId && setOAuthActive) {
        await handleSuccess(createdSessionId, setOAuthActive);
      } else {
        setLoading(false);
      }
    } catch (err: any) {
      setLoading(false);
    }
  }, [startOAuthFlow, loading]);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Brand Identity */}
          <View style={styles.brand}>
            <View style={styles.logoBox}>
              <Ionicons name="flash" size={28} color="white" />
            </View>
            <Text style={styles.brandTitle}>
              Guzo<Text style={{ color: '#2563eb' }}>Rider</Text>
            </Text>
            <View style={styles.badge}>
              <View style={styles.badgeDot} />
              <Text style={styles.badgeText}>Fleet Active</Text>
            </View>
          </View>

          {/* Login Interface */}
          <View style={styles.card}>
            <Text style={styles.welcomeTitle}>Welcome Back</Text>
            <Text style={styles.welcomeSub}>Sign in to start your shift</Text>

            <View style={{ gap: 14 }}>
              <View>
                <Text style={styles.inputLabel}>Fleet Email</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="mail" size={16} color="#2563eb" />
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={emailAddress}
                    placeholder="rider@guzo.app"
                    placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
                    style={styles.inputText}
                    onChangeText={setEmailAddress}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                  />
                </View>
              </View>

              <View>
                <Text style={styles.inputLabel}>Fleet Password</Text>
                <View style={styles.inputBox}>
                  <Ionicons name="lock-closed" size={16} color="#2563eb" />
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    placeholder="••••••••"
                    placeholderTextColor={isDark ? "#4b5563" : "#94a3b8"}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    style={styles.inputText}
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={onSignInPress}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={{ padding: 8 }}>
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onSignInPress}
              disabled={loading}
              style={[styles.primaryBtn, loading && { backgroundColor: isDark ? '#334155' : '#94a3b8' }]}
            >
              {loading ? <ActivityIndicator color="white" /> : (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={styles.primaryBtnText}>Go Online</Text>
                  <Ionicons name="chevron-forward" size={16} color="white" />
                </View>
              )}
            </TouchableOpacity>

            <View style={styles.divider}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>Security</Text>
              <View style={styles.line} />
            </View>

            <TouchableOpacity
              onPress={onGoogleSignInPress}
              disabled={loading}
              style={styles.googleBtn}
            >
              <Ionicons name="logo-google" size={16} color="#EA4335" />
              <Text style={styles.googleBtnText}>Google Access</Text>
            </TouchableOpacity>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ color: isDark ? '#64748b' : '#64748b', fontSize: 13, fontWeight: '600' }}>New rider? </Text>
              <TouchableOpacity onPress={() => router.push('/(auth)/register' as any)}>
                <Text style={{ color: '#2563eb', fontWeight: '900' }}>Create Account →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.versionText}>Guzo Fleet v1.0 • Rider App</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const getStyles = (isDark: boolean) => StyleSheet.create({
  container: { flex: 1, backgroundColor: isDark ? '#020617' : '#f8fafc' },
  content: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  brand: { alignItems: 'center', marginBottom: 32 },
  logoBox: { width: 56, height: 56, backgroundColor: '#2563eb', borderRadius: 18, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  brandTitle: { fontSize: 28, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', letterSpacing: -1, marginTop: 12 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#1e3a8a30' : '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginTop: 8, borderWidth: 1, borderColor: isDark ? '#1e40af50' : 'transparent' },
  badgeDot: { width: 5, height: 5, backgroundColor: '#3b82f6', borderRadius: 3, marginRight: 6 },
  badgeText: { fontSize: 9, fontWeight: '900', color: '#3b82f6', textTransform: 'uppercase', letterSpacing: 1 },
  card: { backgroundColor: isDark ? '#0f172a' : 'white', padding: 24, borderRadius: 32, shadowColor: '#000', shadowOpacity: isDark ? 0.4 : 0.05, shadowRadius: 20, shadowOffset: { width: 0, height: 10 }, elevation: 8, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  welcomeTitle: { fontSize: 22, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a', marginBottom: 2 },
  welcomeSub: { fontSize: 13, color: '#64748b', marginBottom: 24, fontWeight: '700' },
  inputLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8, marginLeft: 4 },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#020617' : '#f1f5f9', borderRadius: 16, paddingLeft: 16, paddingRight: 8, height: 52, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#f1f5f9' },
  inputText: { flex: 1, marginLeft: 10, fontSize: 14, fontWeight: '700', color: isDark ? '#f8fafc' : '#0f172a' },
  primaryBtn: { height: 56, backgroundColor: '#2563eb', borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginTop: 24, shadowColor: '#2563eb', shadowOpacity: 0.35, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 15, textTransform: 'uppercase', letterSpacing: 1, marginRight: 6 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
  line: { flex: 1, height: 1, backgroundColor: isDark ? '#1e293b' : '#f1f5f9' },
  dividerText: { marginHorizontal: 16, fontSize: 9, fontWeight: '900', color: isDark ? '#334155' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 },
  googleBtn: { height: 52, backgroundColor: isDark ? '#020617' : 'white', borderRadius: 16, borderWidth: 1, borderColor: isDark ? '#1e293b' : '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleBtnText: { marginLeft: 10, fontSize: 13, fontWeight: '900', color: isDark ? '#94a3b8' : '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { alignItems: 'center', marginTop: 32 },
  versionText: { fontSize: 9, fontWeight: '900', color: isDark ? '#1e293b' : '#cbd5e1', textTransform: 'uppercase', letterSpacing: 1 }
});

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24, justifyContent: 'center', paddingVertical: 40 },
  brand: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 64, height: 64, backgroundColor: '#2563eb', borderRadius: 22, alignItems: 'center', justifyContent: 'center', shadowColor: '#2563eb', shadowOpacity: 0.4, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  brandTitle: { fontSize: 32, fontWeight: '900', color: '#0f172a', letterSpacing: -1, marginTop: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100, marginTop: 8 },
  badgeDot: { width: 6, height: 6, backgroundColor: '#3b82f6', borderRadius: 3, marginRight: 8 },
  badgeText: { fontSize: 10, fontWeight: '900', color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: 1 },
  welcomeTitle: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  welcomeSub: { fontSize: 14, color: '#64748b', marginBottom: 32, fontWeight: '600' },
  inputBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 16, paddingLeft: 16, paddingRight: 8, height: 60, borderWidth: 1, borderColor: '#f1f5f9' },
  inputText: { flex: 1, marginLeft: 12, fontSize: 16, fontWeight: '600', color: '#0f172a' },
  primaryBtn: { height: 64, backgroundColor: '#2563eb', borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginTop: 40, shadowColor: '#2563eb', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 10 }, elevation: 8 },
  primaryBtnText: { color: 'white', fontWeight: '900', fontSize: 16, textTransform: 'uppercase', letterSpacing: 1, marginRight: 8 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 32 },
  line: { flex: 1, height: 1, backgroundColor: '#f1f5f9' },
  dividerText: { marginHorizontal: 16, fontSize: 10, fontWeight: '900', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 3 },
  googleBtn: { height: 60, backgroundColor: 'white', borderRadius: 20, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  googleBtnText: { marginLeft: 12, fontSize: 14, fontWeight: '900', color: '#334155', textTransform: 'uppercase', letterSpacing: 0.5 },
  footer: { alignItems: 'center', marginTop: 40 },
  versionText: { fontSize: 9, fontWeight: '800', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, opacity: 0.6 }
});

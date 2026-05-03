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
} from 'react-native';
import { useSignIn, useOAuth, useAuth } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { StatusBar } from 'expo-status-bar';

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

  // Refs for smooth keyboard flow
  const passwordRef = useRef<TextInput>(null);

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  // 1. Guard: If already signed in, don't show login
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/');
    }
  }, [isLoaded, isSignedIn]);

  // 2. Optimized Navigation Helper
  const handleSuccess = async (sessionId: string, setFunc: any) => {
    try {
      if (setFunc) {
        await setFunc({ session: sessionId });
        // Maintain loading until Dashboard mounts
        router.replace('/');
      }
    } catch (err) {
      console.error('Finalizing session failed', err);
      setLoading(false);
    }
  };

  // 3. Email/Password Login
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
        console.warn('Sign in incomplete status:', result.status);
        setLoading(false);
      }
    } catch (err: any) {
      // Production Error Parsing
      const msg =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        'Login failed. Please check your credentials.';
      Alert.alert('Login Error', msg);
      setLoading(false);
    }
  };

  // 4. Google OAuth Sign In
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
      console.error('OAuth error', err);
      if (err.code === 'already_signed_in') {
        router.replace('/');
      } else {
        Alert.alert('Google Login Failed', 'Please try again or use email login.');
        setLoading(false);
      }
    }
  }, [startOAuthFlow, loading]);

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-slate-50"
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View className="flex-1 justify-center py-8">
          {/* Brand Identity */}
          <View className="mb-10 items-center">
            <View className="w-16 h-16 bg-blue-600 rounded-[22px] items-center justify-center shadow-2xl shadow-blue-400 mb-4">
              <Ionicons name="flash" size={32} color="white" />
            </View>
            <Text className="text-3xl font-black text-slate-900 tracking-tighter">
              Rider<Text className="text-blue-600">Terminal</Text>
            </Text>
            <View className="flex-row items-center mt-2 bg-blue-50 px-3 py-1 rounded-full">
              <View className="w-1.5 h-1.5 bg-blue-500 rounded-full mr-2" />
              <Text className="text-blue-700 font-bold text-[10px] uppercase tracking-widest">
                Fleet Active
              </Text>
            </View>
          </View>

          {/* Login Interface */}
          <View className="bg-white rounded-[32px] p-7 shadow-xl shadow-slate-200 border border-slate-100">
            <Text className="text-2xl font-black text-slate-800 mb-1">Welcome Back</Text>
            <Text className="text-slate-500 text-sm mb-8 font-medium">
              Sign in to start your shift
            </Text>

            <View className="space-y-5">
              {/* Email Input */}
              <View>
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                  Fleet Email
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-2xl pl-6 pr-4 py-4 border border-slate-100 focus:border-blue-500">
                  <Ionicons name="mail" size={18} color="#3b82f6" />
                  <TextInput
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={emailAddress}
                    placeholder="rider@ethio-logistics.com"
                    placeholderTextColor="#94a3b8"
                    className="flex-1 ml-3 text-slate-900 font-semibold text-base h-12"
                    onChangeText={setEmailAddress}
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    blurOnSubmit={false}
                  />
                </View>
              </View>

              {/* Password Input */}
              <View className="mt-5">
                <Text className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2.5 ml-1">
                  Fleet Password
                </Text>
                <View className="flex-row items-center bg-slate-50 rounded-2xl pl-6 pr-4 py-4 border border-slate-100">
                  <Ionicons name="lock-closed" size={18} color="#3b82f6" />
                  <TextInput
                    ref={passwordRef}
                    value={password}
                    placeholder="••••••••"
                    placeholderTextColor="#94a3b8"
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    className="flex-1 ml-3 text-slate-900 font-semibold text-base h-12"
                    onChangeText={setPassword}
                    returnKeyType="go"
                    onSubmitEditing={onSignInPress}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-2">
                    <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={20} color="#64748b" />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Login Action */}
            <TouchableOpacity
              onPress={onSignInPress}
              disabled={loading}
              className={`rounded-2xl py-5 mt-10 flex-row items-center justify-center shadow-lg ${loading ? 'bg-blue-400' : 'bg-blue-600 shadow-blue-200'}`}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <>
                  <Text className="text-white font-black text-base mr-2 uppercase tracking-widest">
                    Go Online
                  </Text>
                  <Ionicons name="chevron-forward" size={18} color="white" />
                </>
              )}
            </TouchableOpacity>

            <View className="flex-row items-center my-9">
              <View className="flex-1 h-[1px] bg-slate-100" />
              <Text className="px-5 text-slate-400 text-[10px] font-black uppercase tracking-[3px]">
                Security
              </Text>
              <View className="flex-1 h-[1px] bg-slate-100" />
            </View>

            {/* Google OAuth Action */}
            <TouchableOpacity
              onPress={onGoogleSignInPress}
              disabled={loading}
              className={`flex-row items-center justify-center bg-white border border-slate-200 rounded-2xl py-5 shadow-sm active:bg-slate-50 ${loading ? 'opacity-50' : ''}`}
            >
              {loading ? (
                <ActivityIndicator color="#64748b" />
              ) : (
                <>
                  <Ionicons name="logo-google" size={18} color="#EA4335" />
                  <Text className="text-slate-700 font-extrabold ml-3.5 text-sm uppercase tracking-wide">
                    Google Access
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Version Footer */}
          <View className="mt-10 items-center">
            <Text className="text-slate-400 text-[10px] font-bold tracking-widest uppercase opacity-60">
              Fleet Systems v1.0.4 • Ethio Logistics Group
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

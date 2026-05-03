/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState } from 'react';
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
} from 'react-native';
import { useSignUp } from '@clerk/clerk-expo';
import { useRouter, Link } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function RegisterScreen() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();

  const [emailAddress, setEmailAddress] = useState('');
  const [password, setPassword] = useState('');
  const [pendingVerification, setPendingVerification] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);

  // Start the sign up process
  const onSignUpPress = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      await signUp.create({
        emailAddress,
        password,
      });

      // Send the email verification code
      await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });

      // Change the UI to our verification screen
      setPendingVerification(true);
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Registration Failed', err.errors?.[0]?.message || 'Check your details.');
    } finally {
      setLoading(false);
    }
  };

  // Verify the email code
  const onPressVerify = async () => {
    if (!isLoaded) return;
    setLoading(true);

    try {
      const completeSignUp = await signUp.attemptEmailAddressVerification({
        code,
      });

      await setActive({ session: completeSignUp.createdSessionId });
      router.replace('/(tabs)');
    } catch (err: any) {
      console.error(JSON.stringify(err, null, 2));
      Alert.alert('Verification Failed', err.errors?.[0]?.message || 'Invalid code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        className="px-6 pt-16 pb-8"
        keyboardShouldPersistTaps="handled"
      >
        <View className="mb-10">
          <TouchableOpacity onPress={() => router.back()} className="mb-6">
            <Ionicons name="arrow-back" size={28} color="#1e293b" />
          </TouchableOpacity>
          <Text className="text-3xl font-bold text-slate-900">Join the Fleet</Text>
          <Text className="text-slate-500 mt-2 text-lg">
            Create your rider account to start delivering.
          </Text>
        </View>

        {!pendingVerification ? (
          <View className="space-y-5">
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">Email Address</Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4 border border-slate-100">
                <Ionicons name="mail-outline" size={20} color="#64748b" />
                <TextInput
                  autoCapitalize="none"
                  keyboardType="email-address"
                  value={emailAddress}
                  placeholder="rider@ethio-logistics.com"
                  className="flex-1 ml-3 text-slate-900 text-base"
                  onChangeText={setEmailAddress}
                />
              </View>
            </View>

            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">
                Create Password
              </Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4 border border-slate-100">
                <Ionicons name="lock-closed-outline" size={20} color="#64748b" />
                <TextInput
                  value={password}
                  placeholder="••••••••"
                  secureTextEntry
                  className="flex-1 ml-3 text-slate-900 text-base"
                  onChangeText={setPassword}
                />
              </View>
            </View>

            <TouchableOpacity
              className={`rounded-2xl py-5 mt-6 shadow-lg ${loading ? 'bg-blue-400' : 'bg-blue-600 shadow-blue-200'}`}
              onPress={onSignUpPress}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold text-lg">Create Account</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <View className="space-y-5">
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2 ml-1">
                Verification Code
              </Text>
              <View className="flex-row items-center bg-slate-50 rounded-2xl px-4 py-4 border border-slate-100">
                <Ionicons name="shield-checkmark-outline" size={20} color="#64748b" />
                <TextInput
                  value={code}
                  placeholder="123456"
                  keyboardType="number-pad"
                  className="flex-1 ml-3 text-slate-900 text-base tracking-[10px] font-bold"
                  onChangeText={setCode}
                />
              </View>
              <Text className="text-slate-500 mt-4 text-center">
                We sent a code to {emailAddress}
              </Text>
            </View>

            <TouchableOpacity
              className={`rounded-2xl py-5 mt-6 shadow-lg ${loading ? 'bg-blue-400' : 'bg-blue-600 shadow-blue-200'}`}
              onPress={onPressVerify}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-white text-center font-bold text-lg">Verify Email</Text>
              )}
            </TouchableOpacity>
          </View>
        )}

        <View className="flex-row justify-center mt-auto pt-10">
          <Text className="text-slate-500 text-base">Already a rider? </Text>
          <Link href={'/login' as any} asChild>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold text-base">Sign In</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

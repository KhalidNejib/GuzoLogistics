import React from 'react';
import { TouchableOpacity, Text, View, ScrollView, Image } from 'react-native';
import { useAuth, useUser } from '@clerk/clerk-expo';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function ProfileScreen() {
  const { signOut } = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace('/(auth)/login');
    } catch (err) {
      console.error('Sign out error', err);
    }
  };

  // Get the real display name (Full name or Email)
  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || 'Active Rider';
  const clerkId = user?.id || 'NO-ID-FOUND';

  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-8 shadow-sm border-b border-slate-100 items-center">
        <View className="relative">
          <View className="w-24 h-24 bg-blue-100 rounded-[32px] items-center justify-center border-4 border-white shadow-sm overflow-hidden">
            {user?.imageUrl ? (
              <Image source={{ uri: user.imageUrl }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <Ionicons name="person" size={60} color="#2563eb" />
            )}
          </View>
          <TouchableOpacity className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full border-2 border-white items-center justify-center">
            <Ionicons name="camera" size={16} color="white" />
          </TouchableOpacity>
        </View>
        <Text className="text-xl font-black text-slate-900 mt-4 text-center px-4">
          {displayName}
        </Text>
        <View className="bg-slate-100 px-4 py-1.5 rounded-full mt-3">
          <Text className="text-slate-500 font-bold text-[9px] uppercase tracking-widest text-center">
            Clerk ID: {clerkId}
          </Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Quick Stats */}
        <View className="flex-row justify-between mb-8">
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-slate-900">4.9</Text>
            <Text className="text-slate-400 text-[10px] font-black uppercase">Rating</Text>
          </View>
          <View className="w-[1px] h-8 bg-slate-200" />
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-slate-900">1.2k</Text>
            <Text className="text-slate-400 text-[10px] font-black uppercase">Trips</Text>
          </View>
          <View className="w-[1px] h-8 bg-slate-200" />
          <View className="items-center flex-1">
            <Text className="text-xl font-black text-slate-900">2 yrs</Text>
            <Text className="text-slate-400 text-[10px] font-black uppercase">Exp</Text>
          </View>
        </View>

        {/* Settings Groups */}
        <View className="space-y-6 mb-10">
          <View>
            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">
              Account Settings
            </Text>
            <View className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
              <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-50">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-blue-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="person-outline" size={18} color="#2563eb" />
                  </View>
                  <Text className="font-bold text-slate-700">Personal Information</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-50">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-purple-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="wallet-outline" size={18} color="#9333ea" />
                  </View>
                  <Text className="font-bold text-slate-700">Payout Methods</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-emerald-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="shield-checkmark-outline" size={18} color="#059669" />
                  </View>
                  <Text className="font-bold text-slate-700">Security & Privacy</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          </View>

          <View>
            <Text className="text-slate-400 text-[10px] font-black uppercase tracking-[2px] mb-4 ml-1">
              Fleet Support
            </Text>
            <View className="bg-white rounded-[24px] overflow-hidden border border-slate-100 shadow-sm">
              <TouchableOpacity className="flex-row items-center justify-between p-4 border-b border-slate-50">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-orange-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="help-circle-outline" size={18} color="#ea580c" />
                  </View>
                  <Text className="font-bold text-slate-700">Help Center</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>

              <TouchableOpacity className="flex-row items-center justify-between p-4">
                <View className="flex-row items-center">
                  <View className="w-8 h-8 bg-slate-50 rounded-lg items-center justify-center mr-3">
                    <Ionicons name="information-circle-outline" size={18} color="#475569" />
                  </View>
                  <Text className="font-bold text-slate-700">About App</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#cbd5e1" />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          className="flex-row bg-red-50 py-5 rounded-[24px] items-center justify-center mb-12 border border-red-100 shadow-sm shadow-red-100"
          onPress={handleSignOut}
        >
          <Ionicons name="log-out" size={20} color="#ef4444" className="mr-2" />
          <Text className="text-red-500 font-black text-base ml-2">Sign Out of Shift</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

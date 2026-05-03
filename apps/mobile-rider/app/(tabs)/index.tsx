import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function DashboardScreen() {
  return (
    <View className="flex-1 bg-slate-50">
      <StatusBar style="dark" />

      {/* Header */}
      <View className="bg-white px-6 pt-14 pb-6 shadow-sm border-b border-slate-100">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-slate-400 text-xs font-black uppercase tracking-widest">
              Active Shift
            </Text>
            <Text className="text-2xl font-black text-slate-900">Rider Dashboard</Text>
          </View>
          <TouchableOpacity className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center">
            <Ionicons name="notifications" size={24} color="#2563eb" />
            <View className="absolute top-2 right-2 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
          </TouchableOpacity>
        </View>

        {/* Status Toggle */}
        <View className="mt-6 bg-slate-100 p-1.5 rounded-2xl flex-row">
          <TouchableOpacity className="flex-1 bg-white py-3 rounded-xl items-center justify-center shadow-sm">
            <View className="flex-row items-center">
              <View className="w-2 h-2 bg-green-500 rounded-full mr-2" />
              <Text className="font-bold text-slate-900">Online</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 py-3 rounded-xl items-center justify-center">
            <Text className="font-bold text-slate-400">Offline</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        {/* Stats Grid */}
        <View className="flex-row flex-wrap justify-between">
          <View className="w-[48%] bg-white p-5 rounded-[24px] mb-4 shadow-sm border border-slate-100">
            <View className="w-10 h-10 bg-blue-50 rounded-xl items-center justify-center mb-3">
              <Ionicons name="cube" size={20} color="#2563eb" />
            </View>
            <Text className="text-2xl font-black text-slate-900">12</Text>
            <Text className="text-slate-400 text-xs font-bold uppercase">Orders</Text>
          </View>

          <View className="w-[48%] bg-white p-5 rounded-[24px] mb-4 shadow-sm border border-slate-100">
            <View className="w-10 h-10 bg-emerald-50 rounded-xl items-center justify-center mb-3">
              <Ionicons name="navigate" size={20} color="#10b981" />
            </View>
            <Text className="text-2xl font-black text-slate-900">42.5</Text>
            <Text className="text-slate-400 text-xs font-bold uppercase">KM Traveled</Text>
          </View>

          <View className="w-full bg-blue-600 p-6 rounded-[24px] mb-6 shadow-xl shadow-blue-200 flex-row justify-between items-center">
            <View>
              <Text className="text-blue-100 text-xs font-bold uppercase tracking-widest mb-1">
                Today's Earnings
              </Text>
              <Text className="text-3xl font-black text-white">ETB 1,450.00</Text>
            </View>
            <View className="bg-blue-500 p-3 rounded-2xl">
              <Ionicons name="trending-up" size={28} color="white" />
            </View>
          </View>
        </View>

        {/* Map Placeholder */}
        <View className="mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-black text-slate-900">Live Coverage</Text>
            <TouchableOpacity>
              <Text className="text-blue-600 font-bold">Fullscreen</Text>
            </TouchableOpacity>
          </View>
          <View className="h-48 bg-slate-200 rounded-[32px] overflow-hidden items-center justify-center border border-slate-200">
            <Ionicons name="map" size={48} color="#94a3b8" />
            <Text className="text-slate-500 font-bold mt-2">Initialize GPS Map</Text>
            {/* Subtle overlay to simulate a map */}
            <View className="absolute inset-0 bg-blue-500 opacity-5" />
          </View>
        </View>

        {/* Recent Task */}
        <View className="mb-10">
          <Text className="text-lg font-black text-slate-900 mb-4">Active Task</Text>
          <View className="bg-white p-5 rounded-[24px] border-l-4 border-l-blue-600 shadow-sm border border-slate-100">
            <View className="flex-row justify-between items-start mb-4">
              <View>
                <Text className="text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  Order #ETH-9283
                </Text>
                <Text className="text-base font-bold text-slate-900">Pick up from Bole</Text>
              </View>
              <View className="bg-blue-50 px-3 py-1 rounded-full">
                <Text className="text-blue-600 text-[10px] font-black uppercase">En Route</Text>
              </View>
            </View>
            <View className="flex-row items-center">
              <Ionicons name="time" size={16} color="#64748b" />
              <Text className="text-slate-500 text-xs ml-1 font-medium">Est. Arrival: 12 mins</Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

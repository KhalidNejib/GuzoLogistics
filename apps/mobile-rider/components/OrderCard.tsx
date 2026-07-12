/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLanguage } from '../services/i18n';
import { settingService } from '../services/settingService';

interface OrderCardProps {
  order: any;
  onPress: (order: any) => void;
  onLongPress?: (order: any) => void;
  isActive?: boolean;
}

export const OrderCard = ({ order, onPress, onLongPress, isActive }: OrderCardProps) => {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    return settingService.subscribe(s => setIsDark(s.darkMode));
  }, []);

  const getStatusColors = (status: string) => {
    if (isDark) {
      switch (status) {
        case 'PENDING': return { bg: '#451a03', text: '#fcd34d', border: '#78350f' };
        case 'ACCEPTED': return { bg: '#1e3a8a', text: '#93c5fd', border: '#1e40af' };
        case 'ARRIVED_PICKUP':
        case 'ARRIVED_DELIVERY':
        case 'ARRIVED': return { bg: '#312e81', text: '#a5b4fc', border: '#3730a3' };
        case 'PICKED_UP': return { bg: '#4c1d95', text: '#d8b4fe', border: '#5b21b6' };
        case 'IN_TRANSIT': return { bg: '#0c4a6e', text: '#7dd3fc', border: '#075985' };
        case 'DELIVERED': return { bg: '#064e3b', text: '#6ee7b7', border: '#065f46' };
        default: return { bg: '#1e293b', text: '#94a3b8', border: '#334155' };
      }
    }
    switch (status) {
      case 'PENDING': return { bg: '#fffbeb', text: '#b45309', border: '#fef3c7' };
      case 'ACCEPTED': return { bg: '#eff6ff', text: '#1d4ed8', border: '#dbeafe' };
      case 'ARRIVED_PICKUP':
      case 'ARRIVED_DELIVERY':
      case 'ARRIVED': return { bg: '#eef2ff', text: '#4338ca', border: '#e0e7ff' };
      case 'PICKED_UP': return { bg: '#f5f3ff', text: '#6d28d9', border: '#ede9fe' };
      case 'IN_TRANSIT': return { bg: '#f0f9ff', text: '#0369a1', border: '#e0f2fe' };
      case 'DELIVERED': return { bg: '#ecfdf5', text: '#047857', border: '#d1fae5' };
      default: return { bg: '#f8fafc', text: '#475569', border: '#f1f5f9' };
    }
  };

  const statusColors = getStatusColors(order.status);
  const s = getStyles(isDark);

  return (
    <TouchableOpacity
      style={[
        s.card,
        isActive ? { borderColor: '#4f46e5', borderWidth: 2 } : {}
      ]}
      onPress={() => onPress(order)}
      onLongPress={() => onLongPress?.(order)}
      activeOpacity={0.8}
    >
      {/* TOP: MISSION ID & STATUS */}
      <View style={s.header}>
        <View style={s.idBadge}>
           <Text style={s.idLabel}>Mission</Text>
           <Text style={s.idValue}>#{order._id.slice(-8).toUpperCase()}</Text>
        </View>
        <View style={[s.statusBadge, { backgroundColor: statusColors.bg, borderColor: statusColors.border }]}>
           <Text style={[s.statusText, { color: statusColors.text }]}>{order.status.replace('_', ' ')}</Text>
        </View>
      </View>

      {/* MID: STRATEGIC ROUTE */}
      <View style={s.routeSection}>
         <View style={s.routeLineContainer}>
            <View style={[s.routeDot, { backgroundColor: '#4f46e5' }]} />
            <View style={[s.routeLine, { backgroundColor: isDark ? '#334155' : '#f1f5f9' }]} />
            <View style={[s.routeDot, { backgroundColor: '#10b981' }]} />
         </View>
         <View style={{ flex: 1, marginLeft: 12, justifyContent: 'space-between', height: 38 }}>
            <Text style={s.addrText} numberOfLines={1}>{order.pickupAddress.addressText}</Text>
            <Text style={s.addrText} numberOfLines={1}>{order.deliveryAddress.addressText}</Text>
         </View>
      </View>

      {/* FOOTER: INTEL & REWARD */}
      <View style={s.footer}>
         <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={s.intelChip}>
               <Feather name="package" size={12} color={isDark ? '#94a3b8' : '#64748b'} />
               <Text style={s.intelText}>{order.itemDetails?.description?.slice(0, 10) || 'Parcel'}</Text>
            </View>
            <View style={[s.intelChip, { backgroundColor: order.paymentMethod === 'CASH' ? (isDark ? '#451a03' : '#fffbeb') : (isDark ? '#064e3b' : '#ecfdf5') }]}>
               <MaterialCommunityIcons 
                 name={order.paymentMethod === 'CASH' ? 'cash-marker' : 'credit-card-check-outline'} 
                 size={12} 
                 color={order.paymentMethod === 'CASH' ? (isDark ? '#fbbf24' : '#f59e0b') : (isDark ? '#34d399' : '#10b981')} 
               />
               <Text style={[s.intelText, { color: order.paymentMethod === 'CASH' ? (isDark ? '#fcd34d' : '#b45309') : (isDark ? '#6ee7b7' : '#047857') }]}>
                  {order.paymentMethod === 'CASH' ? t('order.collect_cash') : 'Paid'}
               </Text>
            </View>
         </View>

         <View style={s.earningBadge}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 4 }}>
               <Text style={s.earningLabel}>Earn</Text>
               <Text style={s.earningValue}>
                 {(
                   order.financeSnapshot?.riderEarning !== undefined
                     ? order.financeSnapshot.riderEarning
                     : Math.floor((order.priceInfo?.amount || 0) * 0.8)
                 ).toLocaleString()}
               </Text>
               <Text style={s.earningUnit}>ETB</Text>
            </View>
         </View>
      </View>
    </TouchableOpacity>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  card: { backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: 12, padding: 8, marginBottom: 8, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 4, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  idBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: isDark ? '#0f172a' : '#f8fafc', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  idLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginRight: 6 },
  idValue: { fontSize: 11, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, borderWidth: 1 },
  statusText: { fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0.5 },
  routeSection: { flexDirection: 'row', marginBottom: 6 },
  routeLineContainer: { alignItems: 'center', width: 24, paddingTop: 2 },
  routeDot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, borderColor: isDark ? '#1e293b' : 'white' },
  routeLine: { width: 1, height: 12, marginVertical: 2 },
  addrLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 2 },
  addrText: { fontSize: 13, fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 6, borderTopWidth: 1, borderTopColor: isDark ? '#334155' : '#f8fafc' },
  intelChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isDark ? '#0f172a' : '#f8fafc', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  intelText: { fontSize: 10, fontWeight: '800', color: isDark ? '#cbd5e1' : '#64748b' },
  earningBadge: { backgroundColor: isDark ? '#312e81' : '#eef2ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 16 },
  earningLabel: { fontSize: 8, fontWeight: '900', color: isDark ? '#818cf8' : '#4f46e5', textTransform: 'uppercase' },
  earningValue: { fontSize: 16, fontWeight: '900', color: isDark ? '#e0e7ff' : '#312e81' },
  earningUnit: { fontSize: 8, fontWeight: '900', color: isDark ? '#818cf8' : '#4f46e5' }
});

/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { View, Text, Modal, TouchableOpacity, StyleSheet, Dimensions, ActivityIndicator } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../services/i18n';
import { settingService } from '../services/settingService';

const { width } = Dimensions.get('window');

interface NewOrderModalProps {
  visible: boolean;
  order: any;
  onAccept: (orderId: string) => Promise<void>;
  onDecline: () => void;
}

const COLORS = {
  primary: '#4F46E5',
  emerald: '#10B981',
  slate: '#64748B',
  indigo: '#6366F1',
};

export const NewOrderModal: React.FC<NewOrderModalProps> = ({ visible, order, onAccept, onDecline }) => {
  const { t } = useLanguage();
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [timeLeft, setTimeLeft] = React.useState(30);
  const [isDark, setIsDark] = React.useState(false);

  React.useEffect(() => {
    return settingService.subscribe(s => setIsDark(s.darkMode));
  }, []);

  React.useEffect(() => {
    if (!visible) {
      setTimeLeft(30);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  // Logic for auto-expire (outside of render/setState)
  React.useEffect(() => {
    if (visible && timeLeft === 0 && !isProcessing) {
      onDecline();
    }
  }, [timeLeft, visible, isProcessing, onDecline]);

  const handleAccept = async () => {
    setIsProcessing(true);
    try {
      await onAccept(order._id || order.orderId);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!order) return null;

  const s = getStyles(isDark);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <BlurView intensity={isDark ? 60 : 20} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
        
        <View style={s.container}>
          <View style={s.card}>
            {/* Urgency Progress Bar */}
            <View style={s.timerContainer}>
              <View style={[s.timerBar, { width: `${(timeLeft / 30) * 100}%` }]} />
            </View>

            {/* Header */}
            <View style={s.header}>
              <View>
                 <View style={s.priorityBadge}>
                  <MaterialCommunityIcons name="lightning-bolt" size={12} color="white" />
                  <Text style={s.priorityText}>{t('safety.warning')}</Text>
                </View>
                <Text style={s.title}>{t('order.new_order')}</Text>
              </View>
              <View style={s.timerCircle}>
                <Text style={s.timerText}>{timeLeft}</Text>
              </View>
            </View>

            {/* Customer & Payment Info */}
            <View style={s.infoRow}>
              <View style={s.infoBox}>
                <Feather name="user" size={14} color={isDark ? '#94a3b8' : COLORS.slate} />
                <Text style={s.infoValue}>{order.customerName || 'Anonymous'}</Text>
              </View>
              <View style={[s.infoBox, order.paymentMethod === 'CASH' && { backgroundColor: isDark ? '#451a03' : '#FFF7ED', borderColor: isDark ? '#451a03' : '#FFEDD5' }]}>
                <MaterialCommunityIcons 
                  name={order.paymentMethod === 'CASH' ? 'cash-marker' : 'credit-card-outline'} 
                  size={14} 
                  color={order.paymentMethod === 'CASH' ? '#EA580C' : (isDark ? '#94a3b8' : COLORS.slate)} 
                />
                <Text style={[s.infoValue, order.paymentMethod === 'CASH' && { color: isDark ? '#fbbf24' : '#C2410C' }]}>
                  {order.paymentMethod || 'Cash'}
                </Text>
              </View>
            </View>

            {/* Total to Collect Section (Enhanced for Cash) */}
            {order.paymentMethod === 'CASH' && (
              <View style={s.collectionAlert}>
                <View style={s.collectionHeader}>
                  <Text style={s.collectionLabel}>{t('order.collect_cash')}</Text>
                  <MaterialCommunityIcons name="hand-coin" size={16} color={isDark ? '#f59e0b' : "#C2410C"} />
                </View>
                <Text style={s.collectionValue}>
                  ETB {((order.priceInfo?.itemPrice || 0) + (order.priceInfo?.amount || 0)).toLocaleString()}
                </Text>
              </View>
            )}

            {/* Route Map-style Info */}
            <View style={s.routeCard}>
              <View style={s.addressRow}>
                <View style={s.dotContainer}>
                  <View style={[s.dot, { backgroundColor: COLORS.indigo }]} />
                  <View style={s.connector} />
                </View>
                <View style={s.addressContent}>
                  <Text style={s.addressLabel}>{t('order.pickup')}</Text>
                  <Text style={s.addressText} numberOfLines={1}>{order.pickupAddress.addressText}</Text>
                </View>
              </View>
              
              <View style={s.addressRow}>
                <View style={s.dotContainer}>
                  <View style={[s.dot, { backgroundColor: COLORS.emerald }]} />
                </View>
                <View style={s.addressContent}>
                  <Text style={s.addressLabel}>{t('order.delivery')}</Text>
                  <Text style={s.addressText} numberOfLines={1}>{order.deliveryAddress.addressText}</Text>
                </View>
              </View>
            </View>

            {/* Metrics Grid */}
            <View style={s.metricsGrid}>
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>{t('order.rider_earning')}</Text>
                <Text style={s.metricValue}>
                  ETB {Math.floor((order.priceInfo?.amount || 0) * 0.8).toLocaleString()}
                </Text>
              </View>
              <View style={s.divider} />
              <View style={s.metricItem}>
                <Text style={s.metricLabel}>{t('order.distance')}</Text>
                <Text style={s.metricValue}>{order.distanceKm?.toFixed(1) || '0.0'} KM</Text>
              </View>
            </View>

            <View style={s.cargoInfo}>
              <Feather name="package" size={14} color={isDark ? '#94a3b8' : COLORS.slate} />
              <Text style={s.cargoText}>
                {order.itemDetails?.description || 'Parcel'} • {order.itemDetails?.weightKg || '1'} KG
              </Text>
            </View>

            {/* Buttons */}
            <View style={s.buttonRow}>
              <TouchableOpacity
                onPress={onDecline}
                disabled={isProcessing}
                style={s.declineBtn}
              >
                <Text style={s.declineBtnText}>{t('ui.cancel')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleAccept}
                disabled={isProcessing || timeLeft === 0}
                style={[s.acceptBtn, (isProcessing || timeLeft === 0) && { backgroundColor: isDark ? '#475569' : '#94A3B8' }]}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <View style={s.acceptRow}>
                    <Text style={s.acceptBtnText}>{t('order.accept')}</Text>
                    <Feather name="arrow-right" size={18} color="white" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  overlay: { flex: 1, backgroundColor: isDark ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0.4)', justifyContent: 'center', alignItems: 'center' },
  container: { width: width - 24 },
  card: { backgroundColor: isDark ? '#1e293b' : 'white', borderRadius: 28, overflow: 'hidden', shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.3, shadowRadius: 30, elevation: 20 },
  
  timerContainer: { height: 4, backgroundColor: isDark ? '#334155' : '#F1F5F9' },
  timerBar: { height: '100%', backgroundColor: COLORS.primary },

  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F43F5E', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, marginBottom: 8, alignSelf: 'flex-start' },
  priorityText: { fontSize: 8, fontWeight: '900', color: 'white', marginLeft: 4, letterSpacing: 0.5 },
  title: { fontSize: 20, fontWeight: '900', color: isDark ? '#f8fafc' : '#0F172A' },
  timerCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: isDark ? '#312e81' : '#EEF2FF', alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: COLORS.primary },
  timerText: { fontSize: 16, fontWeight: '900', color: isDark ? '#c7d2fe' : COLORS.primary },

  infoRow: { flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginBottom: 16 },
  infoBox: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? '#0f172a' : '#F8FAFC', padding: 8, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#F1F5F9' },
  infoValue: { fontSize: 12, fontWeight: '700', color: isDark ? '#cbd5e1' : '#334155' },

  routeCard: { marginHorizontal: 20, backgroundColor: isDark ? '#0f172a' : '#F8FAFC', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#F1F5F9' },
  addressRow: { flexDirection: 'row', gap: 14 },
  dotContainer: { alignItems: 'center', width: 10 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  connector: { width: 2, flex: 1, backgroundColor: isDark ? '#334155' : '#E2E8F0', marginVertical: 4 },
  addressContent: { flex: 1, paddingBottom: 16 },
  addressLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94A3B8', marginBottom: 2 },
  addressText: { fontSize: 14, fontWeight: '700', color: isDark ? '#e2e8f0' : '#334155' },

  metricsGrid: { 
    flexDirection: 'row', marginHorizontal: 16, backgroundColor: isDark ? '#0f172a' : 'white', borderRadius: 24, paddingVertical: 20, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#334155' : '#E2E8F0',
    shadowColor: isDark ? '#000' : '#4F46E5', shadowOffset: { width: 0, height: 10 }, shadowOpacity: isDark ? 0.3 : 0.08, shadowRadius: 15,
  },
  metricItem: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  divider: { width: 1, backgroundColor: isDark ? '#334155' : '#EDF2F7', height: 32 },
  metricLabel: { fontSize: 8, fontWeight: '900', color: isDark ? '#64748b' : '#94A3B8', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 6 },
  metricValue: { fontSize: 22, fontWeight: '900', color: isDark ? '#f8fafc' : '#0F172A', letterSpacing: -0.5 },

  cargoInfo: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 20, marginBottom: 20, paddingHorizontal: 4 },
  cargoText: { fontSize: 13, fontWeight: '600', color: isDark ? '#94a3b8' : '#64748B' },
  
  collectionAlert: { marginHorizontal: 20, backgroundColor: isDark ? '#451a03' : '#FFF7ED', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: isDark ? '#78350f' : '#FFEDD5', alignItems: 'center' },
  collectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  collectionLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#fbbf24' : '#C2410C', letterSpacing: 0.5 },
  collectionValue: { fontSize: 28, fontWeight: '900', color: isDark ? '#fef3c7' : '#9A3412', letterSpacing: -1 },

  buttonRow: { flexDirection: 'row', gap: 12, padding: 16, paddingTop: 4 },
  declineBtn: { flex: 1, height: 58, borderRadius: 20, backgroundColor: isDark ? '#334155' : '#F1F5F9', alignItems: 'center', justifyContent: 'center' },
  declineBtnText: { fontSize: 13, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748B', textTransform: 'uppercase' },
  acceptBtn: { flex: 2.2, height: 58, borderRadius: 20, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', shadowColor: isDark ? '#000' : COLORS.primary, shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.35, shadowRadius: 20, elevation: 10 },
  acceptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  acceptBtnText: { fontSize: 16, fontWeight: '900', color: 'white', textTransform: 'uppercase', letterSpacing: 0.5 },
});

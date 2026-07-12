/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Linking, TextInput, Alert, Image, ActivityIndicator, StyleSheet, Dimensions } from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import { useLanguage } from '../services/i18n';
import { settingService } from '../services/settingService';

const { height } = Dimensions.get('window');

interface OrderDetailModalProps {
  visible: boolean;
  order: any;
  onClose: () => void;
  onUpdateStatus: (status: string, verificationCode?: string, photoBase64?: string) => Promise<void>;
  routeMeta?: { distance: number; duration: number } | null;
  riderLocation?: { lat: number; lng: number } | null;
}

export const OrderDetailModal: React.FC<OrderDetailModalProps> = ({ visible, order, onClose, onUpdateStatus, routeMeta, riderLocation }) => {
  const { t } = useLanguage();
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeError, setShowCodeError] = useState(false);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    return settingService.subscribe(s => setIsDark(s.darkMode));
  }, []);

  useEffect(() => {
    if (!visible) {
      setVerificationCode('');
      setPhotoUri(null);
      setPhotoBase64(null);
      setShowCodeError(false);
      setIsProcessing(false);
    }
  }, [visible]);

  if (!order) return null;

  const getStatusAction = () => {
    switch (order.status) {
      case 'PENDING': 
        return { label: t('order.accept'), next: 'ACCEPTED', bg: '#4f46e5', icon: 'shield' };
      case 'ACCEPTED': 
        return { label: t('order.arrived'), next: 'ARRIVED_PICKUP', bg: '#4f46e5', icon: 'map-pin' };
      case 'ARRIVED':
      case 'ARRIVED_PICKUP':
      case 'ARRIVED_DELIVERY':
        {
          const isActuallyPickedUp = order.itemDetails?.isPickedUp || order.status === 'ARRIVED_DELIVERY' || order.status === 'IN_TRANSIT';
          const isAtDestination = order.status === 'ARRIVED_DELIVERY' || (order.status === 'ARRIVED' && order.itemDetails?.isPickedUp);
          
          if (isAtDestination) {
            return { label: t('order.submit_delivery'), next: 'DELIVERED', bg: '#10b981', icon: 'check-circle' };
          }
          
          return isActuallyPickedUp 
            ? { label: t('order.submit_delivery'), next: 'DELIVERED', bg: '#10b981', icon: 'check-circle' } 
            : { label: t('order.picked_up'), next: 'PICKED_UP', bg: '#8b5cf6', icon: 'package' };
        }
      case 'PICKED_UP': 
        return { label: t('order.start'), next: 'IN_TRANSIT', bg: '#8b5cf6', icon: 'truck' };
      case 'IN_TRANSIT': 
        return { label: t('order.arrived'), next: 'ARRIVED_DELIVERY', bg: '#10b981', icon: 'flag' };
      default: return null;
    }
  };

  const action = getStatusAction();

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('ui.error'), 'Camera access is required for Proof of Delivery.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.1,
      base64: true,
    });

    if (!result.canceled) {
      try {
        const manipResult = await ImageManipulator.manipulateAsync(
          result.assets[0].uri,
          [{ resize: { height: 800 } }],
          { compress: 0.3, format: ImageManipulator.SaveFormat.JPEG, base64: true }
        );

        setPhotoUri(manipResult.uri);
        setPhotoBase64(manipResult.base64 || null);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (err) {
        console.error('Image processing failed:', err);
        setPhotoUri(result.assets[0].uri);
        setPhotoBase64(result.assets[0].base64 || null);
      }
    }
  };

  const handleAction = async () => {
    const isAtDeliveryDestination = order.status === 'ARRIVED_DELIVERY' || (order.status === 'ARRIVED' && (order.itemDetails?.isPickedUp || false));
    
    if (isAtDeliveryDestination) {
      if (!photoUri) {
        Alert.alert(t('safety.warning'), 'Please take a photo of the delivery to complete the mission.');
        return;
      }
      if (verificationCode.length < 4) {
        setShowCodeError(true);
        return;
      }
    }
    
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setIsProcessing(true);
    
    try {
        await onUpdateStatus(action!.next, isAtDeliveryDestination ? verificationCode : undefined, photoBase64 || undefined);
        onClose();
    } catch (err) {
        console.error('[OrderDetailModal] Action failed:', err);
    } finally {
        setIsProcessing(false);
    }
  };

  const handleNavigate = () => {
    const de = order.deliveryAddress?.location?.coordinates ?? order.deliveryAddress?.coordinates;
    if (!de) return;
    const deLat = de[1];
    const deLng = de[0];
    let url = `https://www.google.com/maps/dir/?api=1&destination=${deLat},${deLng}`;
    if (riderLocation) url += `&origin=${riderLocation.lat},${riderLocation.lng}`;
    Linking.openURL(url).catch(() => Linking.openURL(`google.navigation:q=${deLat},${deLng}&mode=d`));
  };

  const cName = order.customerName || 'Customer';
  const cInit = cName.trim().charAt(0).toUpperCase();
  const s = getStyles(isDark);

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={s.overlay}>
        <BlurView intensity={isDark ? 50 : 20} style={StyleSheet.absoluteFill} tint={isDark ? "dark" : "light"} />
        
        <View style={s.sheet}>
          {/* Header */}
          <View style={s.header}>
            <TouchableOpacity onPress={onClose} disabled={isProcessing} style={s.headerBtn}>
               <Feather name="x" size={18} color={isDark ? '#e2e8f0' : '#0F172A'} />
            </TouchableOpacity>
            <View style={s.idBadge}>
                <Text style={s.idLabel}>Mission ID</Text>
                <Text style={s.idValue}>#{order._id.slice(-8).toUpperCase()}</Text>
            </View>
            <TouchableOpacity style={[s.headerBtn, { backgroundColor: '#4f46e5', borderColor: '#4f46e5' }]} onPress={handleNavigate}>
               <Feather name="navigation" size={18} color="white" />
            </TouchableOpacity>
          </View>

           <ScrollView showsVerticalScrollIndicator={false} style={s.scroll}>
            {/* Status Info */}
            <View style={s.statusSection}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View style={{ width: 4, height: 16, backgroundColor: '#4f46e5', borderRadius: 2 }} />
                    <Text style={s.sectionLabel}>{t('order.transit')}: {order.status.replace('_', ' ')}</Text>
                </View>
                {['ACCEPTED', 'ARRIVED_PICKUP', 'PICKED_UP', 'IN_TRANSIT', 'ARRIVED_DELIVERY'].includes(order.status) && (
                  <View style={s.liveBadge}>
                    <View style={s.liveDot} />
                    <Text style={s.liveText}>{t('home.live')} Sync</Text>
                  </View>
                )}
            </View>

            {/* Distance Info */}
            {order.status === 'PENDING' && routeMeta && (
              <View style={s.metaRow}>
                <View style={s.metaBox}>
                   <MaterialCommunityIcons name="timer-outline" size={16} color={isDark ? '#818cf8' : '#4f46e5'} />
                   <Text style={s.metaText}>{Math.round(routeMeta.duration / 60)} MIN</Text>
                </View>
                <View style={[s.metaBox, { backgroundColor: isDark ? '#312e81' : '#eef2ff', borderColor: isDark ? '#3730a3' : '#e0e7ff' }]}>
                   <MaterialCommunityIcons name="map-marker-distance" size={16} color={isDark ? '#818cf8' : '#4f46e5'} />
                   <Text style={s.metaText}>{(routeMeta.distance / 1000).toFixed(1)} KM</Text>
                </View>
              </View>
            )}
            
            <Text style={s.sectionLabel}>{t('order.item_details')}</Text>
            <View style={[s.card, { padding: 16, borderRadius: 24, flexDirection: 'row', alignItems: 'center', marginBottom: 20 }]}>
                <View style={s.avatar}>
                    <Text style={s.avatarText}>{cInit}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 16 }}>
                    <Text style={s.cardTitle}>{cName}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
                        <MaterialCommunityIcons 
                          name={order.paymentMethod === 'CASH' ? 'cash-marker' : 'credit-card-check-outline'} 
                          size={12} 
                          color={order.paymentMethod === 'CASH' ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#34d399' : '#059669')} 
                        />
                        <Text style={{ fontSize: 10, fontWeight: '900', color: order.paymentMethod === 'CASH' ? (isDark ? '#fbbf24' : '#b45309') : (isDark ? '#34d399' : '#059669') }}>
                            {order.paymentMethod === 'CASH' 
                              ? `${t('order.collect_cash')} ETB ${((order.priceInfo?.itemPrice || 0) + (order.priceInfo?.amount || 0)).toLocaleString()}` 
                              : 'Paid Digitally'}
                        </Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${order.customerPhone}`)} style={s.callBtn}>
                    <Feather name="phone" size={18} color={isDark ? '#818cf8' : '#4f46e5'} />
                </TouchableOpacity>
            </View>

            {/* Addresses */}
            <Text style={s.sectionLabel}>{t('order.pickup')} & {t('order.delivery')}</Text>
            <View style={[s.card, { borderRadius: 24, padding: 20 }]}>
                <View style={s.addrRow}>
                    <View style={s.addrDot} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.addrLabel}>{t('order.pickup')}</Text>
                        <Text style={s.addrText}>{order.pickupAddress.addressText}</Text>
                    </View>
                </View>
                <View style={s.addrLine} />
                <View style={s.addrRow}>
                    <View style={[s.addrDot, { backgroundColor: '#10b981', borderColor: isDark ? '#1e293b' : 'white' }]} />
                    <View style={{ flex: 1 }}>
                        <Text style={s.addrLabel}>{t('order.delivery')}</Text>
                        <Text style={s.addrText}>{order.deliveryAddress.addressText}</Text>
                    </View>
                </View>
            </View>

            {/* POD */}
            {(order.status === 'ARRIVED_DELIVERY' || (order.status === 'ARRIVED' && order.itemDetails?.isPickedUp)) && (
                <View style={{ marginTop: 24 }}>
                    <Text style={s.sectionLabel}>{t('order.pod_photo')}</Text>
                    
                    <TouchableOpacity onPress={handleTakePhoto} style={[s.photoBox, photoUri && { borderColor: '#10b981', backgroundColor: isDark ? '#064e3b' : '#f0fdf4' }]}>
                      {photoUri ? (
                        <Image source={{ uri: photoUri }} style={s.photo} />
                      ) : (
                        <View style={{ alignItems: 'center' }}>
                          <Feather name="camera" size={32} color={isDark ? '#818cf8' : '#4f46e5'} />
                          <Text style={{ fontWeight: '900', fontSize: 11, marginTop: 10, color: isDark ? '#94a3b8' : '#64748b' }}>{t('order.pod_photo')}</Text>
                        </View>
                      )}
                    </TouchableOpacity>

                    <View style={[s.codeBox, showCodeError && { borderColor: '#ef4444', backgroundColor: isDark ? '#450a0a' : '#fef2f2' }]}>
                        <Text style={s.sectionLabel}>{t('order.verification_code')}</Text>
                        <TextInput 
                            style={s.codeInput}
                            placeholder="0000"
                            placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                            keyboardType="number-pad"
                            maxLength={4}
                            value={verificationCode}
                            onChangeText={(val) => { setVerificationCode(val); setShowCodeError(false); }}
                        />
                    </View>
                </View>
            )}
            <View style={{ height: 120 }} />
          </ScrollView>

          {/* Action Button */}
          {order.status !== 'DELIVERED' && action && (
            <View style={s.actionArea}>
                <TouchableOpacity 
                   onPress={handleAction} 
                   disabled={isProcessing} 
                   style={[s.actionBtn, { backgroundColor: isProcessing ? (isDark ? '#475569' : '#cbd5e1') : action.bg }]}
                >
                    {isProcessing ? (
                      <ActivityIndicator color="white" />
                    ) : (
                      <>
                        <Feather name={action.icon as any} size={20} color="white" />
                        <Text style={s.actionLabel}>{action.label}</Text>
                        <Feather name="arrow-right" size={16} color="white" />
                      </>
                    )}
                </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const getStyles = (isDark: boolean) => StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: isDark ? '#0f172a' : 'white', borderTopLeftRadius: 32, borderTopRightRadius: 32, height: height * 0.85, paddingBottom: 24, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: isDark ? '#1e293b' : '#f1f5f9' },
  headerBtn: { width: 40, height: 40, borderRadius: 14, backgroundColor: isDark ? '#1e293b' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  idBadge: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', alignItems: 'center', gap: 6 },
  idLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  idValue: { fontSize: 13, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  scroll: { paddingHorizontal: 24, paddingTop: 16 },
  statusSection: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '800', color: isDark ? '#94a3b8' : '#64748b', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 12 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: isDark ? '#450a0a' : '#fef2f2', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10, borderWidth: 1, borderColor: isDark ? '#7f1d1d' : '#fee2e2' },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#ef4444' },
  liveText: { fontSize: 9, fontWeight: '900', color: '#ef4444', textTransform: 'uppercase' },
  metaRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  metaBox: { flex: 1, height: 56, borderRadius: 16, backgroundColor: isDark ? '#1e293b' : '#f8fafc', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  metaText: { fontSize: 16, fontWeight: '900', color: isDark ? '#f8fafc' : '#0f172a' },
  card: { backgroundColor: isDark ? '#1e293b' : 'white', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 6, shadowOffset: { width: 0, height: 2 }, marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: '800', color: isDark ? '#f8fafc' : '#0f172a' },
  avatar: { width: 64, height: 64, borderRadius: 24, backgroundColor: isDark ? '#312e81' : '#eef2ff', borderColor: isDark ? '#4338ca' : '#e0e7ff', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 26, fontWeight: '900', color: isDark ? '#a5b4fc' : '#4f46e5' },
  callBtn: { width: 44, height: 44, borderRadius: 14, backgroundColor: isDark ? '#0f172a' : '#f8fafc', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9' },
  addrRow: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  addrDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#4f46e5', borderWidth: 2, borderColor: isDark ? '#1e293b' : 'white' },
  addrLabel: { fontSize: 9, fontWeight: '900', color: isDark ? '#64748b' : '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  addrText: { fontSize: 13, fontWeight: '700', color: isDark ? '#e2e8f0' : '#0f172a', marginTop: 2 },
  addrLine: { width: 1, height: 16, backgroundColor: isDark ? '#334155' : '#e2e8f0', marginLeft: 5, marginVertical: 4 },
  photoBox: { height: 140, backgroundColor: isDark ? '#0f172a' : '#f8fafc', borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', borderColor: isDark ? '#334155' : '#e2e8f0', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 20 },
  photo: { width: '100%', height: '100%' },
  codeBox: { backgroundColor: isDark ? '#1e293b' : '#f8fafc', padding: 20, borderRadius: 24, borderWidth: 1, borderColor: isDark ? '#334155' : '#f1f5f9', alignItems: 'center' },
  codeInput: { fontSize: 36, fontWeight: '900', color: isDark ? '#818cf8' : '#4f46e5', letterSpacing: 10, width: '100%', textAlign: 'center' },
  actionArea: { position: 'absolute', bottom: 30, left: 24, right: 24 },
  actionBtn: { height: 60, borderRadius: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12, elevation: 8, shadowColor: '#4f46e5', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 6 } },
  actionLabel: { color: 'white', fontSize: 16, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 }
});

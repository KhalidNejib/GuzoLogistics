import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl, ActivityIndicator, TextInput, Alert, Modal, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, Feather } from '@expo/vector-icons';
import { useAuth, useUser } from '@clerk/clerk-expo';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';
import { socketService } from '../../services/socketService';
import { useLanguage } from '../../services/i18n';
import { settingService, RiderSettings } from '../../services/settingService';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

// Utils & Styles
import getStyles from '../profile.styles';

export default function RiderProfile() {
  const router = useRouter();
  const { signOut, getToken, isSignedIn } = useAuth();
  const { user } = useUser();
  const { t, language, setLanguage } = useLanguage();
  const [stats, setStats] = useState({ deliveries: 0, earnings: 0, todayEarnings: 0, cashHeld: 0, rating: 4.9 });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [preferences, setPreferences] = useState<RiderSettings | null>(null);
  useEffect(() => {
    const unsub = settingService.subscribe(setPreferences);
    return unsub;
  }, []);
  
  const isDark = preferences?.darkMode || false;
  const styles = getStyles(isDark);

  const [showSettleModal, setShowSettleModal] = useState(false);
  const [settleAmount, setSettleAmount] = useState('');
  const [settleRef, setSettleRef] = useState('');
  const [isSettling, setIsSettling] = useState(false);
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [isUploadingProof, setIsUploadingProof] = useState(false);
  const [showProofFullscreen, setShowProofFullscreen] = useState(false);

  const openSettleModal = () => {
    setSettleAmount(stats.cashHeld.toString());
    setSettleRef('');
    setProofImage(null);
    setProofImageUrl(null);
    setShowSettleModal(true);
  };

  useEffect(() => {
    const unsub = socketService.onFinanceUpdate((data) => {
      setStats(prev => ({
        ...prev,
        earnings: data.balance,
        cashHeld: data.cashHeld,
        todayEarnings: data.todayEarnings || prev.todayEarnings
      }));
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = socketService.onProfileUpdate((data) => {
      if (data.rating !== undefined) {
        setStats(prev => ({ ...prev, rating: data.rating! }));
      }
    });
    return unsub;
  }, []);

  const pickProofImage = async (source: 'camera' | 'gallery') => {
    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== 'granted') return;
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 }) : await ImagePicker.launchImageLibraryAsync({ base64: true, quality: 0.7 });
    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];
      setProofImage(asset.uri);
      if (asset.base64) {
        try {
          setIsUploadingProof(true);
          const token = await getToken();
          const uploadRes = await fetch(`${API_URL}/api/v1/merchant/finance/upload-proof`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
            body: JSON.stringify({ imageBase64: asset.base64 }),
          });
          const data = await uploadRes.json();
          if (uploadRes.ok) setProofImageUrl(data.url);
        } catch { Alert.alert('Error', 'Upload failed'); } finally { setIsUploadingProof(false); }
      }
    }
  };

  const handleSettleRequest = async () => {
    if (!settleAmount || !settleRef || !proofImageUrl) return;
    try {
      setIsSettling(true);
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/merchant/finance/settle-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}`, 'ngrok-skip-browser-warning': 'true' },
        body: JSON.stringify({ amount: Number(settleAmount), referenceId: settleRef, method: 'TELEBIRR', proofImageUrl }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        Alert.alert('✅ Submitted!', 'Your settlement request has been sent for review.');
        setShowSettleModal(false);
        router.push('/(tabs)');
      } else {
        Alert.alert('Error', data.error || 'Failed to submit settlement.');
      }
    } catch { Alert.alert('Error', 'Connection failed.'); } finally { setIsSettling(false); }
  };

  const [fullProfile, setFullProfile] = useState<any>(null);

  const fetchProfileData = useCallback(async () => {
    try {
      const token = await getToken();
      if (!token) return;

      const profileRes = await fetch(`${API_URL}/api/v1/user/me`, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        } 
      });

      if (!profileRes.ok) throw new Error(`Profile fetch failed: ${profileRes.status}`);
      const profile = await profileRes.json();
      setFullProfile(profile);
      
      if (profile.role === 'MERCHANT') { setIsLoading(false); setRefreshing(false); return; }

      const orderRes = await fetch(`${API_URL}/api/v1/orders/my-orders`, { 
        headers: { 
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
        } 
      });
      const orders = orderRes.ok ? await orderRes.json() : [];
      const deliveredCount = Array.isArray(orders) ? orders.filter((o: any) => o.status === 'DELIVERED').length : 0;
      setStats({
        deliveries: deliveredCount,
        earnings: profile.finance?.balance || 0,
        todayEarnings: profile.finance?.todayEarnings || 0,
        cashHeld: profile.finance?.cashHeld || 0,
        rating: profile.riderProfile?.rating || 5.0
      });
    } catch (err) { console.error('Profile fetch error:', err); } finally { setIsLoading(false); setRefreshing(false); }
  }, [getToken]);

  useEffect(() => { 
    if (isSignedIn) fetchProfileData(); 
  }, [isSignedIn]); // Only fetch when sign-in status changes, not on every re-render

  const onRefresh = useCallback(() => { setRefreshing(true); fetchProfileData(); }, [fetchProfileData]);

  const menuItems = [
    { icon: 'trending-up', label: 'Earning Analytics', color: '#ecfdf5', iconColor: '#10b981', sub: 'View daily payouts', route: '/profile/earnings' },
    { icon: 'shield', label: 'Trust & Safety', color: '#eff6ff', iconColor: '#3b82f6', sub: 'Guidelines & metrics', route: '/profile/safety' },
    { icon: 'award', label: 'Rider Tier', color: '#fffbeb', iconColor: '#f59e0b', sub: 'Gold status unlocked', route: '/profile/tier' },
    { icon: 'settings', label: 'Terminal Settings', color: '#f8fafc', iconColor: '#64748b', sub: 'Preferences & sound', route: '/profile/settings' },
  ];

  if (isLoading) return <View style={{ flex: 1, backgroundColor: isDark ? '#0f172a' : 'white', alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator size="large" color="#6366f1" /></View>;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTop}>
             <TouchableOpacity onPress={() => router.push('/(tabs)')} style={styles.backBtn}>
                <Feather name="arrow-left" size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
             </TouchableOpacity>

             <TouchableOpacity 
               onPress={() => {
                 setLanguage(language === 'en' ? 'am' : 'en');
                 Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
               }} 
               style={styles.langToggle}
             >
                <Text style={styles.langText}>{language === 'en' ? 'EN' : 'አማ'}</Text>
                <Feather name="refresh-cw" size={12} color="#6366f1" />
             </TouchableOpacity>

             <TouchableOpacity style={styles.backBtn}>
                <Feather name="more-vertical" size={20} color={isDark ? "#f8fafc" : "#0f172a"} />
             </TouchableOpacity>
          </View>

          <View style={styles.profileInfo}>
            <View style={styles.avatarContainer}>
              <View style={styles.avatarWrapper}>
                <Image
                  source={{ uri: fullProfile?.riderProfile?.profilePhotoUrl || user?.imageUrl || 'https://via.placeholder.com/150' }}
                  style={styles.avatar}
                />
              </View>
              <View style={styles.cameraBtn}>
                <Feather name="camera" size={16} color="white" />
              </View>
            </View>
            <Text style={styles.roleText}>Authenticated Pilot</Text>
            <Text style={styles.userName}>{fullProfile?.fullName || user?.fullName || 'Operative'}</Text>
            <View style={styles.verifiedBadge}>
              <View style={styles.verifiedDot} />
              <Text style={styles.verifiedText}>Identity Verified</Text>
            </View>
          </View>
        </View>

        <View style={styles.statsCard}>
          <View>
            <Text style={styles.balanceLabel}>Digital Balance</Text>
            <View style={styles.balanceRow}>
              <Text style={styles.balanceText}>{stats.earnings.toLocaleString()}</Text>
              <Text style={styles.balanceUnit}>ETB</Text>
            </View>
            <Text style={{ fontSize: 9, color: '#94a3b8', fontWeight: '700', marginTop: 2 }}>
              Lifetime commission: ETB {(fullProfile?.finance?.totalEarned || 0).toLocaleString()}
            </Text>
          </View>
          
          {stats.cashHeld > 0 && (
            <View style={styles.cashHeldCard}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <View>
                  <Text style={styles.cashLabel}>Cash On Hand</Text>
                  <Text style={styles.cashValue}>ETB {stats.cashHeld.toLocaleString()}</Text>
                </View>
                <Feather name="pocket" size={18} color="white" />
              </View>
              <TouchableOpacity onPress={openSettleModal} style={styles.settleBtn}>
                <Text style={styles.settleText}>Settle Command</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.metricsRow}>
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Deliveries</Text>
              <Text style={styles.metricValue}>{stats.deliveries}</Text>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metricItem}>
              <Text style={styles.metricLabel}>Pilot Rating</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={styles.metricValue}>{stats.rating}</Text>
                <Ionicons name="star" size={14} color="#fbbf24" style={{ marginLeft: 4 }} />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.menuList}>
          <Text style={styles.menuLabel}>Mission Preferences</Text>
          {menuItems.map((item, index) => (
            <TouchableOpacity key={index} style={styles.menuItem} onPress={() => router.push(item.route as any)}>
              <View style={[styles.menuIconBox, { backgroundColor: item.color }]}>
                <Feather name={item.icon as any} size={22} color={item.iconColor} />
              </View>
              <View style={styles.menuTextContainer}>
                <Text style={styles.menuItemTitle}>{item.label}</Text>
                <Text style={styles.menuItemSub}>{item.sub}</Text>
              </View>
              <View style={styles.chevron}>
                <Feather name="chevron-right" size={18} color="#94a3b8" />
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ paddingHorizontal: 32, marginTop: 40, marginBottom: 80 }}>
          <TouchableOpacity onPress={() => signOut()} style={styles.logoutBtn}>
            <View style={styles.logoutContent}>
              <Feather name="power" size={18} color="#f43f5e" />
              <Text style={styles.logoutText}>Terminate Session</Text>
            </View>
          </TouchableOpacity>
          <Text style={styles.versionText}>Guzo Rider OS • V1.0</Text>
        </View>
      </ScrollView>

      {/* Settle Modal */}
      <Modal visible={showSettleModal} transparent animationType="slide" onRequestClose={() => setShowSettleModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.75)', justifyContent: 'flex-end' }}>
          <View style={{ 
            backgroundColor: isDark ? '#1e293b' : 'white', 
            borderTopLeftRadius: 36, 
            borderTopRightRadius: 36, 
            padding: 24,
            paddingBottom: 40,
            borderWidth: 1,
            borderColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
            maxHeight: Dimensions.get('window').height * 0.9
          }}>
            <ScrollView showsVerticalScrollIndicator={false}>
              
              {/* Header Indicator */}
              <View style={{ alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: isDark ? '#475569' : '#e2e8f0', marginBottom: 20 }} />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <View>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: isDark ? 'white' : '#0f172a', letterSpacing: -0.5 }}>Debt Settlement</Text>
                  <Text style={{ fontSize: 11, color: '#64748b', fontWeight: '700', marginTop: 2 }}>Repay cash debt via Telebirr</Text>
                </View>
                <TouchableOpacity 
                  onPress={() => setShowSettleModal(false)}
                  style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: isDark ? '#0f172a' : '#f1f5f9', alignItems: 'center', justifyContent: 'center' }}
                >
                  <Feather name="x" size={18} color={isDark ? '#cbd5e1' : '#475569'} />
                </TouchableOpacity>
              </View>

              {/* Input for Amount */}
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Settlement Amount (ETB)</Text>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderWidth: 1.5,
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: 16,
                paddingHorizontal: 16,
                height: 54,
                marginBottom: 20
              }}>
                <Feather name="dollar-sign" size={18} color="#6366f1" style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: isDark ? 'white' : '#0f172a', fontSize: 16, fontWeight: '800' }}
                  placeholder="0.00"
                  placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                  keyboardType="numeric"
                  value={settleAmount}
                  onChangeText={setSettleAmount}
                />
              </View>

              {/* Input for Reference ID */}
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Telebirr Transaction ID</Text>
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                borderWidth: 1.5,
                borderColor: isDark ? '#334155' : '#e2e8f0',
                borderRadius: 16,
                paddingHorizontal: 16,
                height: 54,
                marginBottom: 20
              }}>
                <Feather name="hash" size={18} color="#6366f1" style={{ marginRight: 10 }} />
                <TextInput
                  style={{ flex: 1, color: isDark ? 'white' : '#0f172a', fontSize: 16, fontWeight: '800', textTransform: 'uppercase' }}
                  placeholder="e.g. T2026123..."
                  placeholderTextColor={isDark ? '#475569' : '#cbd5e1'}
                  autoCapitalize="characters"
                  value={settleRef}
                  onChangeText={setSettleRef}
                />
              </View>

              {/* Payment Proof Selector */}
              <Text style={{ color: isDark ? '#94a3b8' : '#64748b', fontSize: 9, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: 8 }}>Transaction Proof Screenshot</Text>
              
              <View style={{ marginBottom: 24 }}>
                {proofImage ? (
                  <View style={{ 
                    position: 'relative', 
                    borderRadius: 20, 
                    borderWidth: 1.5, 
                    borderColor: '#6366f1', 
                    overflow: 'hidden',
                    height: 180,
                    width: '100%',
                    justifyContent: 'center',
                    alignItems: 'center',
                    backgroundColor: '#0f172a'
                  }}>
                    <Image source={{ uri: proofImage }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                    <TouchableOpacity 
                      onPress={() => { setProofImage(null); setProofImageUrl(null); }}
                      style={{ 
                        position: 'absolute', 
                        top: 12, 
                        right: 12, 
                        width: 32, 
                        height: 32, 
                        borderRadius: 16, 
                        backgroundColor: 'rgba(15, 23, 42, 0.85)', 
                        alignItems: 'center', 
                        justifyContent: 'center' 
                      }}
                    >
                      <Feather name="trash-2" size={16} color="#f43f5e" />
                    </TouchableOpacity>
                    {isUploadingProof && (
                      <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(15,23,42,0.6)', justifyContent: 'center', alignItems: 'center' }}>
                        <ActivityIndicator size="small" color="#6366f1" />
                        <Text style={{ color: 'white', fontWeight: '800', fontSize: 10, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1.2 }}>Uploading Proof...</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={{ 
                    flexDirection: 'row', 
                    gap: 12
                  }}>
                    <TouchableOpacity 
                      onPress={() => pickProofImage('camera')}
                      style={{ 
                        flex: 1, 
                        height: 90, 
                        borderRadius: 16, 
                        borderWidth: 1.5, 
                        borderColor: isDark ? '#334155' : '#e2e8f0', 
                        borderStyle: 'dashed',
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Feather name="camera" size={24} color="#6366f1" style={{ marginBottom: 6 }} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#cbd5e1' : '#4f46e5' }}>Use Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      onPress={() => pickProofImage('gallery')}
                      style={{ 
                        flex: 1, 
                        height: 90, 
                        borderRadius: 16, 
                        borderWidth: 1.5, 
                        borderColor: isDark ? '#334155' : '#e2e8f0', 
                        borderStyle: 'dashed',
                        backgroundColor: isDark ? '#0f172a' : '#f8fafc',
                        justifyContent: 'center',
                        alignItems: 'center'
                      }}
                    >
                      <Feather name="image" size={24} color="#6366f1" style={{ marginBottom: 6 }} />
                      <Text style={{ fontSize: 11, fontWeight: '800', color: isDark ? '#cbd5e1' : '#4f46e5' }}>Choose Gallery</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              {/* Submit Button */}
              <TouchableOpacity 
                onPress={handleSettleRequest}
                disabled={!settleAmount || !settleRef || !proofImageUrl || isSettling || isUploadingProof}
                style={{ 
                  backgroundColor: (!settleAmount || !settleRef || !proofImageUrl) ? (isDark ? '#334155' : '#e2e8f0') : '#4f46e5', 
                  paddingVertical: 16, 
                  borderRadius: 18, 
                  alignItems: 'center', 
                  flexDirection: 'row', 
                  justifyContent: 'center',
                  gap: 8,
                  opacity: (!settleAmount || !settleRef || !proofImageUrl || isSettling || isUploadingProof) ? 0.6 : 1,
                  shadowColor: '#4f46e5',
                  shadowOffset: { width: 0, height: 10 },
                  shadowOpacity: (!settleAmount || !settleRef || !proofImageUrl) ? 0 : 0.25,
                  shadowRadius: 15,
                  marginBottom: 12
                }}
              >
                {isSettling ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <>
                    <Feather name="check" size={18} color="white" />
                    <Text style={{ color: 'white', fontWeight: '900', fontSize: 13, letterSpacing: 1.2 }}>SUBMIT SETTLEMENT</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

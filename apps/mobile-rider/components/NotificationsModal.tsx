import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, StyleSheet, Dimensions } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { useLanguage } from '../services/i18n';
import { premiumKit as kit } from '../theme/premium-kit';

const { height } = Dimensions.get('window');

interface NotificationsModalProps {
  visible: boolean;
  notifications: any[];
  onClose: () => void;
  onClear: () => void;
}

export const NotificationsModal: React.FC<NotificationsModalProps> = ({ visible, notifications, onClose, onClear }) => {
  const { t } = useLanguage();

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.overlay}>
        <BlurView intensity={30} style={StyleSheet.absoluteFill} tint="dark" />
        
        <View style={styles.sheet}>
          {/* Tactical Drag Handle */}
          <View style={styles.draggerContainer}>
             <View style={styles.dragger} />
          </View>

          {/* Header HUB */}
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.headerLabel}>{t('safety.warning')}</Text>
              <Text style={styles.headerTitle}>{t('tabs.notifications')}</Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 12 }}>
                {notifications.length > 0 && (
                    <TouchableOpacity 
                        onPress={onClear} 
                        style={styles.clearBtn}
                    >
                        <Feather name="trash-2" size={18} color="#ef4444" />
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    onPress={onClose} 
                    style={styles.closeBtn}
                >
                    <Feather name="chevron-down" size={24} color="white" />
                </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            style={{ flex: 1 }} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 24, paddingVertical: 24 }}
          >
            {notifications.length === 0 ? (
              <View style={styles.emptyContainer}>
                <View style={styles.emptyIconBox}>
                    <Feather name="activity" size={36} color="#CBD5E1" />
                </View>
                <Text style={styles.emptyText}>No new alerts</Text>
              </View>
            ) : (
              <View style={{ gap: 16 }}>
                {notifications.map((notif) => (
                  <View key={notif.id} style={[kit.card, kit.cardLight, kit.row, { padding: 20 }]}>
                    <View style={styles.iconBox}>
                        <Feather 
                          name={notif.title.includes('New') ? 'zap' : 'check-circle'} 
                          size={22} 
                          color={notif.title.includes('New') ? '#4f46e5' : '#10b981'} 
                        />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <Text style={[kit.title, { textTransform: 'uppercase', fontSize: 13 }]}>{notif.title}</Text>
                        <Text style={[kit.subTitle, { fontSize: 11 }]}>{notif.timeStr || 'Just now'}</Text>
                      </View>
                      <Text style={[kit.subTitle, { fontSize: 13, color: '#475569', lineHeight: 18 }]}>{notif.body || notif.message}</Text>
                      {notif.orderId && (
                        <View style={{ marginTop: 8, backgroundColor: '#f1f5f9', alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 9, fontWeight: '900', color: '#64748b' }}>#{notif.orderId.slice(-6).toUpperCase()}</Text>
                        </View>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>

          {/* Secure Handshake Indicator */}
          <View style={styles.footer}>
             <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{t('ui.success')}</Text>
             </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', borderTopLeftRadius: 48, borderTopRightRadius: 48, paddingTop: 16, height: height * 0.75, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 20 },
  draggerContainer: { alignItems: 'center', marginBottom: 16 },
  dragger: { width: 56, height: 6, backgroundColor: '#f1f5f9', borderRadius: 3 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', paddingHorizontal: 32, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: '#f8fafc' },
  headerLabel: { fontSize: 10, fontWeight: '900', color: '#4f46e5', textTransform: 'uppercase', letterSpacing: 4, marginBottom: 8 },
  headerTitle: { fontSize: 28, fontWeight: '900', color: '#0f172a', letterSpacing: -1 },
  clearBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#fff1f2', borderWidth: 1, borderColor: '#ffe4e6' },
  closeBtn: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a', elevation: 4 },
  emptyContainer: { justifyContent: 'center', paddingVertical: 120, alignItems: 'center' },
  emptyIconBox: { width: 96, height: 96, borderRadius: 32, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginBottom: 32, borderWidth: 1, borderColor: '#f1f5f9' },
  emptyText: { color: '#94a3b8', fontWeight: '900', textTransform: 'uppercase', letterSpacing: 3, fontSize: 10, textAlign: 'center' },
  iconBox: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#eef2ff', borderWidth: 1, borderColor: '#e0e7ff', alignItems: 'center', justifyContent: 'center', marginRight: 20 },
  footer: { paddingHorizontal: 32, paddingBottom: 48, paddingTop: 24, alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#0f172a', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 100, elevation: 8 },
  statusDot: { width: 8, height: 8, backgroundColor: '#34d399', borderRadius: 4, marginRight: 12 },
  statusText: { color: '#34d399', fontWeight: '900', fontSize: 10, textTransform: 'uppercase', letterSpacing: 1.5 }
});

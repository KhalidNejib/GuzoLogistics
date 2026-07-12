/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, StyleSheet,
} from 'react-native';
import { Feather, Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Order } from '@ethio-logistics/types';
import * as Haptics from 'expo-haptics';

interface MissionActionCardProps {
  order: Order;
  processingStatusId: string | null;
  batteryLevel: number;
  speed: number;
  onUpdateStatus: (status: string, proof?: string, notes?: string, orderId?: string) => void;
  onViewDetails: () => void;
}

// ─── Workflow logic ────────────────────────────────────────────────────────────
// The auto-geofence triggers ARRIVED at 200m. These manual buttons are the fallback.
function getNextAction(order: Order): {
  label: string; nextStatus: string; color: string; icon: string; hint: string;
} | null {
  const { status } = order;
  const isPickedUp = (order as any).itemDetails?.isPickedUp;

  if (status === 'ACCEPTED') return {
    label: 'Arrived at Pickup',
    nextStatus: 'ARRIVED',
    color: '#f59e0b',
    icon: 'map-pin',
    hint: 'Auto-triggers within 200m • tap if not',
  };
  if (status === 'ARRIVED' && !isPickedUp) return {
    label: 'Confirm Pickup',
    nextStatus: 'PICKED_UP',
    color: '#4f46e5',
    icon: 'package',
    hint: 'Confirm you have collected the package',
  };
  if (status === 'PICKED_UP') return {
    label: 'Begin Transit',
    nextStatus: 'IN_TRANSIT',
    color: '#6366f1',
    icon: 'navigation',
    hint: 'Start heading to the delivery address',
  };
  if (status === 'IN_TRANSIT') return {
    label: 'Arrived at Delivery',
    nextStatus: 'ARRIVED',
    color: '#10b981',
    icon: 'map-pin',
    hint: 'Auto-triggers within 200m • tap if not',
  };
  if (status === 'ARRIVED' && isPickedUp) return {
    label: 'Complete Delivery',
    nextStatus: 'DELIVERED',
    color: '#059669',
    icon: 'check-circle',
    hint: 'Confirm handoff with customer',
  };
  return null;
}

function getStatusMeta(order: Order) {
  const { status } = order;
  const isPickedUp = (order as any).itemDetails?.isPickedUp;
  const pickup = (order as any).pickupAddress?.addressText || '';
  const delivery = (order as any).deliveryAddress?.addressText || '';

  if (status === 'ACCEPTED') return { label: 'Heading to Pickup', color: '#f59e0b', address: pickup, icon: 'map-pin' };
  if (status === 'ARRIVED' && !isPickedUp) return { label: 'At Pickup Location', color: '#3b82f6', address: pickup, icon: 'package' };
  if (status === 'PICKED_UP') return { label: 'Package Collected', color: '#4f46e5', address: delivery, icon: 'navigation' };
  if (status === 'IN_TRANSIT') return { label: 'In Transit', color: '#6366f1', address: delivery, icon: 'navigation' };
  if (status === 'ARRIVED' && isPickedUp) return { label: 'Arrived at Destination', color: '#10b981', address: delivery, icon: 'flag' };
  return { label: status, color: '#64748b', address: '', icon: 'circle' };
}

export const MissionActionCard: React.FC<MissionActionCardProps> = ({
  order, processingStatusId, batteryLevel, speed, onUpdateStatus, onViewDetails,
}) => {
  const isProcessing = processingStatusId === order._id;
  const nextAction = getNextAction(order);
  const meta = getStatusMeta(order);
  const orderId = (order as any)._id || '';

  return (
    <View style={styles.card}>
      {/* ── Status Row ─────────────────────────────────── */}
      <View style={styles.statusRow}>
        <View style={[styles.statusBadge, { backgroundColor: meta.color + '18' }]}>
          <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.statusLabel, { color: meta.color }]}>{meta.label}</Text>
        </View>
        <TouchableOpacity style={styles.detailsBtn} onPress={onViewDetails} activeOpacity={0.7}>
          <Feather name="info" size={16} color="#64748b" />
        </TouchableOpacity>
      </View>

      {/* ── Destination Address ────────────────────────── */}
      <View style={styles.addressRow}>
        <Feather name={meta.icon as any} size={14} color={meta.color} />
        <Text style={styles.addressText} numberOfLines={1}>{meta.address || 'Loading address...'}</Text>
      </View>

      {/* ── Primary Action Button ─────────────────────── */}
      {nextAction && (
        <View style={styles.actionSection}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: isProcessing ? '#94a3b8' : nextAction.color },
            ]}
            disabled={isProcessing}
            onPress={() => {
              onUpdateStatus(nextAction.nextStatus, undefined, undefined, orderId);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            }}
            activeOpacity={0.8}
          >
            {isProcessing ? (
              <ActivityIndicator color="white" size="small" />
            ) : (
              <>
                <Feather name={nextAction.icon as any} size={18} color="white" />
                <Text style={styles.actionBtnText}>{nextAction.label}</Text>
              </>
            )}
          </TouchableOpacity>
          {!isProcessing && (
            <Text style={styles.actionHint}>{nextAction.hint}</Text>
          )}
        </View>
      )}

      {/* ── Telemetry Footer ──────────────────────────── */}
      <View style={styles.telemetryRow}>
        <View style={styles.chip}>
          <Ionicons
            name={batteryLevel > 20 ? 'battery-full' : 'battery-dead'}
            size={14}
            color={batteryLevel > 20 ? '#10b981' : '#ef4444'}
          />
          <Text style={styles.chipText}>{batteryLevel}%</Text>
        </View>
        <View style={styles.chipDivider} />
        <View style={styles.chip}>
          <Ionicons name="speedometer-outline" size={14} color="#4f46e5" />
          <Text style={styles.chipText}>{speed} km/h</Text>
        </View>
        <View style={{ flex: 1 }} />
        <Text style={styles.orderId}>#{orderId.slice(-6).toUpperCase()}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 20,
    padding: 16,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 6,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statusRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999, gap: 6,
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusLabel: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailsBtn: {
    width: 36, height: 36, borderRadius: 18, backgroundColor: '#f8fafc',
    alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#e2e8f0',
  },
  addressRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14,
    paddingHorizontal: 4,
  },
  addressText: { fontSize: 13, fontWeight: '700', color: '#334155', flex: 1 },
  actionSection: { marginBottom: 10 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 10, paddingVertical: 15, borderRadius: 16, marginBottom: 6,
  },
  actionBtnText: { color: 'white', fontSize: 15, fontWeight: '900', letterSpacing: 0.3 },
  actionHint: { textAlign: 'center', fontSize: 11, color: '#94a3b8', fontWeight: '600' },
  telemetryRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingTop: 10, borderTopWidth: 1, borderTopColor: '#f1f5f9',
  },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  chipText: { fontSize: 12, fontWeight: '800', color: '#475569' },
  chipDivider: { width: 1, height: 14, backgroundColor: '#e2e8f0' },
  orderId: { fontSize: 11, fontWeight: '700', color: '#cbd5e1', letterSpacing: 1 },
});

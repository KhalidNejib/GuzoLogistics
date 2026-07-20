// Shared tier logic used by both the profile menu (two.tsx) and the Tier
// screen (profile/tier.tsx). A rider's tier is derived from their real
// completed-delivery count — the same number already flowing through the
// app (stats.deliveries in two.tsx, deliveredOrders in earnings.tsx) — so
// every rider sees their own actual rank instead of a hardcoded status.

export interface TierDefinition {
  key: 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM';
  label: string;
  threshold: number; // minimum completed deliveries required
  color: string;
}

export const TIERS: TierDefinition[] = [
  { key: 'BRONZE', label: 'Bronze', threshold: 0, color: '#a16207' },
  { key: 'SILVER', label: 'Silver', threshold: 20, color: '#64748b' },
  { key: 'GOLD', label: 'Gold', threshold: 60, color: '#f59e0b' },
  { key: 'PLATINUM', label: 'Platinum', threshold: 150, color: '#6366f1' },
];

export interface TierBenefit {
  title: string;
  desc: string;
  requiredTier: TierDefinition['key'];
}

export const TIER_BENEFITS: TierBenefit[] = [
  { title: 'Priority Dispatch', desc: 'Get mission pings 5s earlier', requiredTier: 'SILVER' },
  { title: 'Premium Support', desc: 'Direct line to operators', requiredTier: 'GOLD' },
  { title: 'Fuel Bonus', desc: '2% extra payout on long trips', requiredTier: 'PLATINUM' },
];

export interface TierInfo {
  tier: TierDefinition;
  nextTier: TierDefinition | null;
  points: number; // completed deliveries — the rider's real "points"
  progressToNext: number; // 0..1
  deliveriesToNext: number;
  benefits: (TierBenefit & { unlocked: boolean })[];
}

/**
 * Compute the rider's tier from a real completed-delivery count.
 * @param completedDeliveries the number of DELIVERED orders for this rider
 */
export function getTierInfo(completedDeliveries: number): TierInfo {
  const points = Math.max(0, Math.floor(completedDeliveries || 0));

  let current = TIERS[0];
  for (const t of TIERS) {
    if (points >= t.threshold) current = t;
  }

  const currentIndex = TIERS.findIndex((t) => t.key === current.key);
  const nextTier = currentIndex >= 0 && currentIndex < TIERS.length - 1 ? TIERS[currentIndex + 1] : null;

  let progressToNext = 1;
  let deliveriesToNext = 0;
  if (nextTier) {
    const span = nextTier.threshold - current.threshold;
    const into = points - current.threshold;
    progressToNext = span > 0 ? Math.min(1, Math.max(0, into / span)) : 1;
    deliveriesToNext = Math.max(0, nextTier.threshold - points);
  }

  const tierRank = (key: TierDefinition['key']) => TIERS.findIndex((t) => t.key === key);

  const benefits = TIER_BENEFITS.map((b) => ({
    ...b,
    unlocked: tierRank(current.key) >= tierRank(b.requiredTier),
  }));

  return {
    tier: current,
    nextTier,
    points,
    progressToNext,
    deliveriesToNext,
    benefits,
  };
}

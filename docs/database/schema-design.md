# MongoDB Database Schema Design

This document describes the production Mongoose schema definitions used by the `services/api` backend.
All interfaces below reflect the actual models — any future code change MUST update this file to stay in sync.

---

## 1. User

Stores both **merchant** and **rider** accounts authenticated via Clerk.
The `role` field is the primary gate for all authorization checks.

```typescript
import { Document, Types } from 'mongoose';

export interface IUser extends Document {
  clerkId: string;           // Primary tie to Clerk Auth (unique, indexed)
  role: 'MERCHANT' | 'RIDER' | 'ADMIN';  // Default: 'RIDER' (least-privileged)
  email: string;
  fullName: string;
  businessName?: string;     // Merchants only
  businessAddress?: string;  // Merchants only
  supportEmail?: string;     // Merchants only
  fleetKey?: string;         // Unique fleet invite code (sparse index, merchants only)
  phoneNumber: string;
  logoUrl?: string;          // Merchant brand logo (Cloudinary URL)
  serviceCity?: string;      // Merchant's operating city
  expoPushToken?: string;    // Latest Expo push notification token
  expoPushTokens?: string[]; // All unique push tokens  registered for the user
  onboardingCompleted: boolean;
  disabled: boolean;         // Manual suspension flag
  deletedAt?: Date;          // Soft-delete — never hard-delete to preserve order history
  lastAcceptAttemptAt?: Date; // Write-conflict sentinel for concurrent acceptOrder() calls

  deliveryPricing: {
    baseFare: number;        // Default: 50 ETB
    perKmRate: number;       // Default: 10 ETB/km
    currency: string;        // Default: 'ETB'
  };
  notificationSettings: {
    emailAlerts: boolean;
    pushAlerts: boolean;
    orderUpdates: boolean;
    financeAlerts: boolean;
  };
  preferences: {
    darkMode: boolean;
    language: string;        // Default: 'EN'
  };
  finance: {
    totalRevenue: number;    // Merchants: total gross revenue
    balance: number;         // Riders: current digital wallet balance; Merchants: settlement balance
    codBalance: number;      // Merchants: collective cash held by all their riders
    cashHeld: number;        // Riders: cash currently in their pocket (COD orders)
    totalEarned: number;     // Riders: lifetime earnings tracking
  };

  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `clerkId` (unique), `email` (unique), `fleetKey` (unique, sparse), `role`, `onboardingCompleted`, compound `{ role, onboardingCompleted }`.

---

## 2. RiderProfile

Stores compliance and operational metadata for rider accounts.
Real-time location is stored exclusively in **Redis** (`rider_location:{userId}`), not here.

```typescript
export interface IRiderProfile extends Document {
  user: Types.ObjectId;      // Ref: User (unique — one profile per rider)
  merchant: Types.ObjectId;  // Ref: User (the merchant fleet this rider belongs to)

  // Vehicle
  vehicleType: 'MOTORCYCLE' | 'BICYCLE' | 'VAN';
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleColor?: string;
  licensePlate: string;

  // Compliance / KYC documents (Cloudinary URLs)
  profilePhotoUrl?: string;  // Rider portrait / selfie — folder: profile/
  licenseNumber?: string;
  licensePhotoUrl?: string;  // Driver's license — folder: kyc/license/
  idPhotoUrl?: string;       // National ID — folder: kyc/national-id/
  faydaIdPhotoUrl?: string;  // Fayda ID alias — folder: kyc/national-id/
  vehiclePhotoUrl?: string;  // Vehicle proof — folder: kyc/vehicle/

  // Emergency contact
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };

  onboardingStatus: 'PENDING_DATA' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED'; // Default: 'PENDING_DATA'
  rejectionReason?: string;
  isAvailable: boolean;      // Online/Offline toggle
  rating: number;            // Default: 5

  createdAt: Date;
  updatedAt: Date;
}
```

> **Note**: There is intentionally no `currentLocation` GeoJSON field on this model.
> The original 2dsphere geometry was removed because nothing in the codebase ran geospatial queries against it
> and the field was never kept current. Live position is solely in Redis key `rider_location:{userId}`.
> If a future feature needs query-time geospatial lookups add the field back and wire it to the Redis-sync job.

---

## 3. Order

Represents a single delivery job from creation through final settlement.

```typescript
export type OrderStatus =
  | 'PENDING'
  | 'ACCEPTED'
  | 'ARRIVED_PICKUP'
  | 'PICKED_UP'
  | 'IN_TRANSIT'
  | 'ARRIVED_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'ARRIVED';

export interface IOrder extends Document {
  merchant: Types.ObjectId;  // Ref: User
  rider?: Types.ObjectId;    // Ref: User (NOT RiderProfile — the User document)
  status: OrderStatus;

  customerName: string;
  customerPhone: string;

  pickupAddress: {
    addressText: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };

  deliveryAddress: {
    addressText: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [longitude, latitude]
    };
  };

  itemDetails: {
    description: string;
    weightKg: number;
    dimensions?: string;
    isPickedUp: boolean;     // Set to true when rider marks PICKED_UP
  };

  verificationCode: string;  // 4-digit code customer shares with rider on delivery

  priceInfo: {
    currency: string;        // Default: 'ETB'
    amount: number;          // Delivery fee
    itemPrice: number;       // Product price (for Cash-on-Delivery orders)
    riderEarning?: number;   // Calculated from merchant's deliveryPricing
  };

  distanceKm?: number;       // Haversine distance at order creation

  trackingUrlToken: string;  // Unique short-id for the public tracking page (unique index)

  routeHistory: Array<{      // Periodic snapshots synced from Redis by the cron job
    lat: number;
    lng: number;
    timestamp: Date;
  }>;

  podImageUrl?: string;      // Proof-of-delivery photo URL (Cloudinary, folder: ethio-logistics/pod)

  financeSnapshot: {
    merchantProfit?: number;
    riderEarning?: number;
    settlementMethod?: 'AUTO_DIGITAL_REBALANCE' | 'PHYSICAL_CASH_DEBT' | 'DIGITAL_PAYMENT_DIRECT';
    settled: boolean;        // true once settleOrder() has committed money; guards against double-settlement
    settlementFailed: boolean; // true if settleOrder() threw after order was already DELIVERED — needs manual reconciliation
  };

  paymentMethod: 'CASH' | 'DIGITAL';  // Default: 'CASH'
  paymentStatus: 'UNPAID' | 'PAID';   // Default: 'UNPAID'
  customerRating?: number;            // 1–5

  deliveredAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**:
- Geospatial: `pickupAddress.location` (2dsphere), `deliveryAddress.location` (2dsphere)
- Query patterns: `{ merchant, createdAt: -1 }`, `{ rider, status }`, `{ status, createdAt: -1 }`

---

## 4. Transaction

Finance ledger entry written on every order settlement.

```typescript
export interface ITransaction extends Document {
  user: Types.ObjectId;      // Ref: User
  type: 'EARNING' | 'PAYOUT' | 'ADJUSTMENT';
  amount: number;
  currency: string;
  description?: string;
  orderId?: Types.ObjectId;  // Ref: Order
  createdAt: Date;
}
```

**Indexes**: `{ user: 1, createdAt: -1 }` (compound index for paginated finance history queries).

---

## 5. Payout

Records merchant-to-rider settlement payouts.

```typescript
export interface IPayout extends Document {
  merchant: Types.ObjectId;  // Ref: User
  rider: Types.ObjectId;     // Ref: User
  amount: number;
  currency: string;
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  method: 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CASH';
  referenceId?: string;      // External payment reference (partial unique index — null allowed for pre-electronic payouts)
  settlementProofUrl?: string; // Telebirr screenshot (Cloudinary, folder: settlements/)
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes**: `referenceId` (unique, sparse).

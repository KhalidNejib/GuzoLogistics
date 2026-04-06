# MongoDB Database Schema Design

This document outlines the TypeScript interfaces and Mongoose schema definitions required for the Application backend.

```typescript
import { Document, Types } from 'mongoose';

// ----------------------------------------
// 1. User & Merchant Interface
// ----------------------------------------
export interface IUser extends Document {
  clerkId: string;          // Primary tie to Clerk Auth
  role: 'MERCHANT' | 'RIDER' | 'ADMIN';
  email: string;
  fullName: string;
  businessName?: string;    // Appears Only if Merchant
  phoneNumber: string;
  createdAt: Date;
  updatedAt: Date;
}

// ----------------------------------------
// 2. Rider Profile Interface
// ----------------------------------------
export interface IRiderProfile extends Document {
  user: Types.ObjectId | IUser; // Ref User Collection
  vehicleType: 'MOTORCYCLE' | 'BICYCLE' | 'VAN';
  licensePlate: string;
  isAvailable: boolean;
  currentLocation: {           // GeoJSON Point
    type: 'Point';             
    coordinates: [number, number]; // *NOTE*: GeoJSON format is [longitude, latitude]
  };
  rating: number;
}

// Note: Ensure the Geospatial Index is created
// RiderProfileSchema.index({ currentLocation: "2dsphere" });

// ----------------------------------------
// 3. Order Interface
// ----------------------------------------
export interface IOrder extends Document {
  merchant: Types.ObjectId | IUser; // Ref User
  rider?: Types.ObjectId | IRiderProfile; // Ref RiderProfile
  status: 'PENDING' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED' | 'CANCELLED';
  
  pickupAddress: {
    addressText: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    }
  };
  
  deliveryAddress: {
    addressText: string;
    location: {
      type: 'Point';
      coordinates: [number, number]; // [lng, lat]
    }
  };
  
  itemDetails: {
    description: string;
    weightKg: number;
    dimensions?: string;
  };

  priceInfo: {
    currency: string;
    amount: number;
  };
  
  trackingUrlToken: string; // Unique short-id mapping to this order
  routeHistory: Types.DocumentArray<{ // Sporadic saved points 
    lat: number;
    lng: number;
    timestamp: Date;
  }>;

  createdAt: Date;
  deliveredAt?: Date;
}
```

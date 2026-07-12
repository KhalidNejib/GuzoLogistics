# Socket.io API & Event Definitions

## Connection & Handshake
The WebSocket connection mandates a valid Bearer token from Clerk for authentication.
- **URL**: `wss://api.your-system.com`
- **Auth**: `header: { Authorization: "Bearer <clerk-jwt>" }`

## Common Interfaces
```typescript
export interface LocationDetails {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
  accuracy?: number; // GPS accuracy radius
  timestamp: string;
}
```

## Rooms Architecture
Clients subscribe to localized or entity-specific channels to receive relevant payloads only.
- `zone:{zip_or_geo_code}`: Broadcasts pool of open orders for Riders.
- `order:{orderId}`: Joined by Merchant, Assigned Rider, and tracking users.
- `rider:{riderId}`: Specific channel for rider-directed instructions.

## Client-to-Server Events (Emitted by Client)

### 1. `join-room`
Instructs the server to add the current socket to a specific room.
```typescript
interface JoinRoomPayload {
  roomId: string; // e.g., 'order:60d5ecb8b5c9c6273c8abc12'
  role: 'merchant' | 'rider' | 'customer';
}
```

### 2. `location-update`
Rider app emits this event upon GPS changes.
```typescript
interface LocationUpdatePayload {
  orderId: string;
  riderId: string;
  location: LocationDetails;
}
```

### 3. `order-status-changed`
```typescript
interface OrderStatusPayload {
  orderId: string;
  status: 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'ARRIVED' | 'DELIVERED';
}
```

## Server-to-Client Events (Emitted by Server)

### 1. `order-created`
Broadcasted to riders in an area upon new system order.
```typescript
interface OrderCreatedPayload {
  orderId: string;
  pickupLocation: LocationDetails;
  deliveryLocation: LocationDetails;
  itemDescription: string;
}
```

### 2. `location-updated`
Broadcasted to everyone actively viewing an order tracking page.
```typescript
interface LocationUpdatedPayload {
  orderId: string;
  riderId: string;
  location: LocationDetails;
}
```

### 3. `order-status-changed`
Broadcasted when order advances in its fulfillment lifecycle.
```typescript
interface OrderStatusBroadcastPayload {
  orderId: string;
  previousStatus: string;
  newStatus: string;
  updatedAt: string;
}
```

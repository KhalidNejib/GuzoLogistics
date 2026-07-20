# Socket.io API & Event Definitions

## Connection & Handshake

The WebSocket connection requires a valid Clerk JWT token for authentication.

- **URL**: `wss://api.guzo-logistics.com` (configured in `VITE_SOCKET_URL` / `API_URL`)
- **Auth**: `{ auth: { token: "<clerk-session-token>" } }` — passed in the Socket.io handshake `auth` object by the mobile app / web dashboard.

Connections are rejected without a valid token. On connection, the server resolves the Clerk token to a MongoDB `User` document and stores `mongoId`, `role`, `riderName`, and `city` on the socket's `data` object for subsequent event handlers to use safely without re-querying the DB on every event.

---

## Room Architecture

| Room Name | Members | Purpose |
|---|---|---|
| `order:{orderId}` | Assigned rider, merchant, customer (public tracker) | Per-order telemetry and status pushes |
| `rider:{userId}` | Specific rider's socket | Direct notifications, finance updates |
| `merchant:{userId}` | Merchant's socket | Fleet radar, pilot applications, order events |
| `riders:global` | All online riders | Global fleet radar (idle riders) |
| `city:fleet:{city}` | All merchant sockets for a city | City-wide fleet overview |
| `riders:fleet` | Server-internal broadcast target | Order claimed/cancelled events to riders |
| `admin:dispatch` | ADMIN-role sockets | Emergency SOS alerts, dispatch view |

---

## Client-to-Server Events

### 1. `join_order`

Joins (or joins as global fleet tracker) a specific order room.

```typescript
// Payload: bare orderId string
socket.emit('join_order', orderId: string);

// Special value:
socket.emit('join_order', 'global');  // Rider joins riders:global fleet room
```

The server validates ownership (merchant or assigned rider) before allowing the join.
Public trackers join using `mongoId = 'tracker'` set during handshake on the public tracking page.
On success, the server emits `joined_room` back to the socket.

---

### 2. `leave_order`

Leaves a specific order room.

```typescript
socket.emit('leave_order', orderId: string);
```

---

### 3. `location-update`

Rider app emits on every GPS position change. **Order status updates are strictly REST-only** — this event carries telemetry only.

```typescript
interface LocationUpdatePayload {
  orderId: string;  // Specific order ID, or 'global' when idle between orders
  lat: number;
  lng: number;
  battery?: number;   // Battery level 0–100
  speed?: number;     // km/h
  riderName?: string; // Server overrides with DB-verified name
  riderPhone?: string;
}
socket.emit('location-update', payload: LocationUpdatePayload);
```

The server validates that the emitting socket is the order's assigned rider before broadcasting.

---

## Server-to-Client Events

### 1. `joined_room`

ACK sent after a successful `join_order`.

```typescript
interface JoinedRoomPayload {
  room: string; // e.g. 'order:507f1f77bcf86cd799439011' or 'riders:global'
}
```

---

### 2. `rider_moved`

Broadcasted to `order:{orderId}` or `riders:global` on every location-update.

```typescript
interface RiderMovedPayload {
  orderId: string;
  lat: number;
  lng: number;
  battery?: number;
  speed?: number;
  riderName?: string;
  riderPhone?: string;
}
```

---

### 3. `fleet_radar_update`

Broadcasted to `merchant:{merchantId}` or `city:fleet:{city}` with rider position for the fleet map.

```typescript
interface FleetRadarUpdatePayload {
  riderId: string;
  orderId: string | 'IDLE';
  lat: number;
  lng: number;
  speed?: number;
  riderName: string;  // DB-verified server-side name
}
```

---

### 4. `order_status_changed`

Sent to `order:{orderId}` and `merchant:{merchantId}` whenever an order's status changes
(accepted, status update, delivered, cancelled, snatched).

```typescript
interface OrderStatusChangedPayload {
  orderId: string;
  status: string;
  order: IOrder | null;
}
```

> ⚠️ Status changes are **only driven by REST API calls**, never by client-emitted socket events.

---

### 5. `new-order-nearby`

Broadcasted to `riders:fleet` when a new PENDING order is created.

```typescript
// Payload: the full IOrder document
```

---

### 6. `order-claimed`

Broadcasted to `riders:fleet` when an order is accepted by a rider.

```typescript
interface OrderClaimedPayload {
  orderId: string;
}
```

---

### 7. `order-cancelled`

Broadcasted to `rider:{riderId}` and `riders:fleet` when an order is cancelled or snatched back.

```typescript
interface OrderCancelledPayload {
  orderId: string;
}
```

---

### 8. `notification`

System notification sent to a specific room or socket.

```typescript
interface NotificationPayload {
  title: string;
  body: string;
  [key: string]: unknown; // e.g. orderId, type: 'NEARBY'
}
```

---

### 9. `finance_update`

Sent to `rider:{riderId}` after settlement completes on a delivered order.

```typescript
interface FinanceUpdatePayload {
  balance: number;
  cashHeld: number;
  totalEarned: number;
  orderEarning: number;
}
```

---

### 10. `order_photo_ready`

Sent to `merchant:{merchantId}` after POD photo uploads successfully.

```typescript
interface OrderPhotoReadyPayload {
  orderId: string;
  podImageUrl: string;
}
```

---

### 11. `emergency_sos`

Broadcasted to `merchant:{merchantId}` and `admin:dispatch` when a rider triggers an SOS incident.

```typescript
// Payload: the full Incident document
```

---

### 12. Onboarding & Fleet Management Events

| Event | Target Room | Trigger |
|---|---|---|
| `new_pilot_application` | `merchant:{merchantId}` | Rider onboards with a fleet key |
| `onboarding_status_changed` | `rider:{riderId}` | Merchant approves / rejects |
| `pilot_approved` | `merchant:{merchantId}` | Merchant approves rider |
| `pilot_active_toggled` | `merchant:{merchantId}` | Merchant enables / suspends rider |
| `pilot_deleted` | `merchant:{merchantId}` | Merchant removes rider |
| `rider_left_fleet` | `merchant:{merchantId}` | Rider switches to a different fleet |
| `auth_revoked` | `rider:{riderId}` | Rider account suspended |
| `account_reactivated` | `rider:{riderId}` | Rider account re-enabled |
| `payout_update` | `merchant:{merchantId}` | Payout status changed |
| `profile_update` | `rider:{riderId}` | Rating update after customer review |
| `order_rated` | `merchant:{merchantId}` | Customer submits a rating |

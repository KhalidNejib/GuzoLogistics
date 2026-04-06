# Functional Requirements & User Stories

## 1. Merchant (Web Dashboard Admin)
*The small business owner managing local deliveries.*

- **Auth**: As a Merchant, I want to sign up/login intuitively using social auth or email (via Clerk) so I can restrict access to my internal dashboard.
- **Order Creation**: As a Merchant, I want to create new delivery orders by entering pickup/drop-off text addresses and converting them to map coordinates.
- **Real-Time Tracking**: As a Merchant, I want a live map overlay showing exactly where my assigned rider is right now, utilizing Leaflet/OSM map primitives.
- **Management**: As a Merchant, I want to view a historical grid/table of all my completed and pending orders.
- **Customer Notifications**: As a Merchant, I want the system to generate a unique tracking short-link that I can share with my customer.

## 2. Rider (Mobile App User)
*The on-the-ground delivery personnel navigating the city.*

- **Onboarding/Availability**: As a Rider, I want an easy way to toggle "Go Online" or "Go Offline", indicating my availability to the central pool.
- **Order Dispatch**: As a Rider, I want to receive real-time push notifications of new orders nearby.
- **Acceptance/Rejection**: As a Rider, I want to review task information (prices, distance) and accept an order to claim it.
- **Background GPS Sync**: As a Rider, I want my location to broadcast accurately in the background, minimizing phone heat and battery use, so the Merchant/Customer trust the location.
- **Status Toggles**: As a Rider, I want highly visible, oversized buttons to advance delivery statuses (e.g., "Picked up", "Delivered") for safety while operating a vehicle.

## 3. Customer (Tracking Link User)
*The end receiver of the physical package.*

- **No Auth Barrier**: As a Customer, I want to tap a link via SMS/WhatsApp and see my package status immediately without needing an app.
- **Live Visuals**: As a Customer, I want to observe an animated map (Leaflet.js) updating the delivery rider's location marker in real-time.
- **Milestone Tracking**: As a Customer, I want a simplified timeline indicator (Processed -> In Transit -> Arrived) to know exactly when to receive the item.

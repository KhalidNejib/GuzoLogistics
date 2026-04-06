# Comprehensive Day-To-Day Execution Plan

This document outlines a professional, structured 4-week (24 working days) execution sprint for delivering the AI-Native Real-Time Delivery Tracking SaaS. 

The strategy isolates dependencies: we build the infrastructure first, lock down the backend APIs, connect the merchant interface, and conclude with the complex mobile GPS mechanics.


## Phase 1: Foundation & Backend (Days 1–7)

**Goal**: Establish the zero-budget but highly scalable cloud foundation, and build the Node/Express backend that handles HTTP CRUD and real-time Socket connections.

* **Day 1: Version Control, Scaffolding & CI/CD Tooling**
  * Initialize standard `.gitignore` and `git` repository.
  * Create the upstream GitHub repository and configure `main` / `dev` branch protection rules.
  * Initialize `pnpm` workspaces (`apps/`, `packages/`, `services/`).
  * Configure Turborepo for build-caching across environments config.
  * Establish ESLint, Prettier, and Husky Git hooks for uniform TypeScript standards.

* **Day 2: Cloud Infrastructure & Secrets Provisioning**
  * Provision external free-tier platforms: Clerk (Auth), MongoDB Atlas (Database), and Redis Cloud (Real-time).
  * Structure strict `dotenv` validation schemas utilizing `zod` so servers crash instantly on boot if a `.env` variable is missing.

* **Day 3: ODM Models & Database Connections**
  * Initialize Node.js/Express service.
  * Build the Mongoose Schemas (`User`, `Order`, `RiderProfile`).
  * Force MongoDB `2dsphere` indexes on coordinates to allow geospatial lookups.

* **Day 4: Core REST API & Webhooks (Auth/Users)**
  * Implement global Express error handlers and JWT Clerk decode middlewares.
  * Setup Clerk Webhooks (to automatically sync new Clerk users into our MongoDB `User` collection).

* **Day 5: Business Logic REST API (Orders)**
  * Build `POST /api/orders` (Merchant dispatch).
  * Build `GET /api/orders` (History / Pagination).
  * Build `POST /api/orders/:id/accept` (Rider confirmation).

* **Day 6: Socket.io Foundation**
  * Bind Socket.io to the Express server.
  * Integrate custom middleware to block Socket connections lacking valid Clerk tokens.
  * Implement the Server Room logic (`order:_id`, `zone:_id`).

* **Day 7: Redis Live-Tracking Sync**
  * Implement the handler for `location-update` events pushing to Redis.
  * Configure Redis TTLs (Time-To-Live) so stales coordinates automatically delete to save free-tier RAM limits.

---

## Phase 2: Merchant Web Dashboard (Days 8–13)

**Goal**: Empower the Merchant (Store Owner) to authenticate, create orders, and passively view moving drivers on a web-based map.

* **Day 8: Web Dashboard Scaffolding & Design System**
  * Initialize Vite (React) inside `apps/web-dashboard`.
  * Set up Tailwind CSS and configure the core Shadcn UI token variables (Primary branding colors, card layouts).

* **Day 9: Web Authentication & Secure Routing**
  * Embed Clerk React `<Provider>` components.
  * Build the Private Layout (Sidebar navigation) wrapping protected routes.

* **Day 10: Logistics Mapping Interface**
  * Implement `react-leaflet` to render OpenStreetMap tiles freely.
  * Drop animated markers for hypothetical drivers, validating the map view box loads efficiently over Addis Ababa coordinates.

* **Day 11: Order Creation Engine**
  * Construct the "Create Delivery" form.
  * Hook form data to `POST /api/orders`. Ensure validation (no bad addresses) utilizing local geocoding lookups.

* **Day 12: Real-time Web Consumption**
  * Architect the `useSocket` React hook. 
  * Connect the Web Dashboard to the specific `order` room. Bind the incoming Socket coordinate updates directly to the map marker's state.

* **Day 13: Order Metrics & History UI**
  * Build out data tables representing Historical Deliveries, Revenue totals, and ETA tracking.

---

## Phase 3: Rider Mobile Application (Days 14–20)

**Goal**: Deliver a rugged, battery-optimized Android/iOS application for Riders that reports locations seamlessly.

* **Day 14: Mobile App Initialization & UI System**
  * Generate `apps/mobile-rider` natively via Expo Router.
  * Configure Clerk for Expo, enabling social login flows for Riders.
  * Configure NativeWind for shared Tailwind CSS bridging.

* **Day 15: Rider Core User Flow**
  * Build "Go Online / Offline" status toggles.
  * Update Rider availability on the main REST endpoint so they can receive localized bursts.

* **Day 16: OS Background Geolocation Perms**
  * Install `expo-location` and `expo-background-fetch`.
  * Craft the aggressive OS permission requests ("Allow all the time" for GPS).

* **Day 17: Mobile Socket Publishing**
  * Connect mobile client to WebSocket server.
  * Wire up the GPS watcher so that every `X` meters moved invokes a `location-update` emit payload.

* **Day 18: Battery & Offline Edge Cases**
  * Add conditional logic: Stop GPS when standing still for > 3 minutes.
  * Inject `AsyncStorage` caching buffers to save coordinates locally when the WebSocket disconnects via 4G drop-outs.

* **Day 19: Order Dispatch & Push Notifications**
  * Build the pop-up modal "New Order Nearby."
  * Wire up "Accept Order" and "Mark Delivered" large vehicle-safe action buttons.

* **Day 20: Map Navigation Visuals (Mobile)**
  * Display a simple directional polyline utilizing a free OSRM (Open Source Routing Machine) lookup from Start -> A -> B.

---

## Phase 4: Public Tracking & Launch Ops (Days 21–24)

**Goal**: Polish the final customer edge case (the Magic Tracking Link), QA the entire lifecycle, and move out of `localhost` into production clouds.

* **Day 21: Customer Public Tracking Portal**
  * Build a public Next.js/Vite route: `/track/:trackingToken` holding NO auth barriers.
  * Display the live Leaflet map and simplified progressive timelines.

* **Day 22: Background Database Sync (Cron Jobs)**
  * Write a Node.js worker/cron that runs every 5 minutes.
  * Transfer cached live-tracking footprints from Redis into MongoDB `routeHistory` for historical auditing/receipts.

* **Day 23: Deployment Architecture**
  * Setup Github Actions CI/CD to run ESLint & isolated Jest route tests.
  * Deploy Web Dashboard & Tracking Link to Vercel Edge.
  * Deploy Node/Express Server + Socket engine to a Render Web Service container.

* **Day 24: Field Testing & Final Handover**
  * Generate physical Android `.apk` builds.
  * Ride a vehicle performing a physical tracking loop while observing the deployed web dashboard in real-time.
  * Squash network race conditions and verify final documentation.

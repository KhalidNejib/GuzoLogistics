# System Design: Delivery Tracking Flow

## Overview

This document outlines the architecture and data flow for the real-time delivery tracking system, engineered for high availability and low latency on a zero-budget/free tier stack (Vercel, Render, MongoDB Atlas, Redis Cloud).

## High-Level Architecture Components

1. **API/WebSocket Server**: Node.js + Express + Socket.io (Hosted on Render for persistent WebSocket connections).
2. **Web Dashboard**: React (Vite) + Tailwind + Shadcn UI (Hosted on Vercel).
3. **Primary Database**: MongoDB Atlas (Free Tier) for persistence (Orders, Users).
4. **In-Memory Cache**: Redis Cloud (Free Tier) for live coordinates and ephemeral states.
5. **Mobile Rider App**: React Native (Expo) pushing frequent geolocation updates.

## Delivery Lifecycle & Data Flow

### 1. Order Creation

- **Action**: Merchant creates a Delivery Order in the Web Dashboard.
- **Flow**:
  1. Dashboard sends POST `/api/orders` to Express server.
  2. Server validates request (Clerk JWT) and saves the order to **MongoDB** with status `PENDING`.
  3. Server caches the active order IDs geographically using **Redis**.
  4. Node server broadcasts an `order-created` event to the relevant geographical zone room via **Socket.io**.
  5. Available Riders in the zone receive the push/socket notification.

### 2. Order Acceptance

- **Action**: Rider views the `order-created` event and taps "Accept".
- **Flow**:
  1. Rider App sends HTTP POST `/api/orders/{id}/accept` to Node backend.
  2. Backend assigns the Rider to the Order and updates **MongoDB** (status: `ACCEPTED`).
  3. Backend emits `order-status-changed` via **Socket.io** to the Merchant and the Customer tracking link room.
  4. Rider App begins connecting to the specific order socket room (e.g., `order:{id}`).

### 3. Live Tracking

- **Action**: Rider picks up the item and is on the move. Background Geolocation kicks in.
- **Flow**:
  1. Expo Background Geolocation grabs GPS coords every 5-10 seconds.
  2. Rider App emits `location-update` via **Socket.io** utilizing exponential backoff if the network drops.
  3. Node Server intercepts `location-update`.
  4. Server caches the new coordinates in **Redis** (e.g., `GEOADD rider:locations`) with a short TTL to circumvent the write IO costs of MongoDB.
  5. Every 30-60 seconds, a background Node cron/worker syncs the best resolution coordinates to **MongoDB** for route history.
  6. Server broadcasts `location-updated` to `order:{id}` room.
  7. Client frontends (Merchant Dashboard, Tracking Link) receive the event and animate the map marker using **Leaflet.js**.

### 4. Delivered Confirmation

- **Action**: Rider arrives and marks order as "Delivered".
- **Flow**:
  1. Rider App sends HTTP POST `/api/orders/{id}/deliver`.
  2. Server updates **MongoDB** status to `DELIVERED`.
  3. Server completes the socket session mappings and clears temporary Redis coordinate keys.
  4. Server emits final `order-status-changed` event to the specific `order:{id}` room.
  5. Rider Background Geolocation shifts to passive/off mode to conserve engine battery.

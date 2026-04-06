# Ethio Logistics (v1) - Delivery Tracking SaaS

An AI-Native Real-Time Delivery Tracking SaaS customized for Addis Ababa. 

## Overview
This modern web and mobile platform acts as a bridge between merchants, delivery riders, and customers. It handles real-time REST HTTP CRUD and highly scalable WebSocket tracking connections without overwhelming infrastructure cost, explicitly targeted at free-tier deployments.

## Project Structure (Monorepo)
This repository leverages Turborepo and PNPM workspaces to manage multiple applications and shared packages:
- `apps/web-dashboard/`: React (Vite) administration and merchant portal.
- `apps/mobile-rider/`: React Native (Expo) GPS delivery tracking mobile app.
- `packages/`: Shared UI chunks, TypeScript types, and utility functions.
- `services/api/`: The Node/Express API with real-time Socket.io and Redis coordination.

## Getting Started

### Prerequisites
- Node.js (v18+)
- PNPM (v8+)

### Installation
Ensure you install dependencies at the root directory:
```bash
pnpm install
```

### Running the App
To start the development servers across all apps concurrently:
```bash
pnpm dev
```

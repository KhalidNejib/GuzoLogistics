# Ethio Logistics | Production Deployment Guide 🚀

Follow this checklist to move from development to a stable production environment in Addis Ababa.

## 1. Infrastructure Requirements
- **MongoDB**: Use MongoDB Atlas (Shared Cluster is fine for launch).
- **Redis**: Required for real-time telemetry. Use Redis Cloud or Upstash.
- **Node.js**: Version 20.x or 22.x LTS.
- **Hosting**: 
  - **API**: Render, Railway, or VPS (PM2/Docker).
  - **Web**: Vercel, Netlify, or Static Hosting.

## 2. Environment Variables (.env)
Ensure your production environment has the following secrets configured:

### Backend
- `MONGODB_URI`: Primary database connection string.
- `REDIS_URL`: For Socket.io adapter and location history.
- `CLERK_SECRET_KEY`: From your Clerk dashboard.
- `CLERK_WEBHOOK_SIGNING_SECRET`: For user sync.
- `CLOUDINARY_CLOUD_NAME / API_KEY / SECRET`: For Proof-of-Delivery photos.
- `AFRO_SMS_TOKEN`: Required for real-time SMS alerts to customers.
- `NODE_ENV`: Set to `production`.

### Frontend (Web)
- `VITE_CLERK_PUBLISHABLE_KEY`: pk_live_...
- `VITE_API_URL`: Your full API domain (e.g., `https://api.ethio-logistics.com`).

### Mobile (EAS Secrets)
- `EXPO_PUBLIC_API_URL`: Your production API domain.
- `EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY`: pk_live_...

## 3. Production Readiness Features
- [x] **Offline Buffering**: Riders can sync locations even on spotty 4G.
- [x] **Rate Limiting**: Protected endpoints against brute force.
- [x] **SEO / Social Meta**: Social previews enabled for tracking links.
- [x] **Graceful Shutdown**: API handles restarts without dropping socket rooms.
- [x] **Health Checks**: `/health` endpoint for uptime monitors.

## 4. Monitoring (Recommended)
- **Error Tracking**: Integrate Sentry (Web/Mobile/API).
- **Uptime Monitor**: Use BetterStack or UptimeRobot on the `/health` endpoint.
- **Logs**: Pino logs are production-ready. Use a log drain (like Datadog or Papertrail) if on a VPS.

---
*Ethio Logistics v1 — Engineered for Addis Ababa.*

import { Blob, File } from 'node:buffer';

// 👉 NODE 18 COMPATIBILITY POLYFILL
if (typeof global.File === 'undefined') {
  (global as any).File = File;
}
if (typeof global.Blob === 'undefined') {
  (global as any).Blob = Blob;
}

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import mongoSanitize from 'express-mongo-sanitize';
import mongoose from 'mongoose';
import { clerkMiddleware } from '@clerk/express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { rateLimit } from 'express-rate-limit';
import { logger } from './lib/logger.js';

// 👉 IDENTITY & CACHE LAYER
import { redis } from './lib/redis.js';
import './models/User.js';
import './models/RiderProfile.js';
import './models/Order.js';

import { appConfig, clerkConfig } from './lib/env.js';
import connectDB from './lib/mongoose.js';
import webhookRoutes from './routes/webhookRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import merchantRoutes from './routes/merchantRoutes.js';
import { initializeSocket } from './socket.js';
import { runRouteHistorySync } from './scripts/syncRouteHistory.js';

const app = express();
app.set('trust proxy', 1); // 👉 Allow Ngrok/Proxies to pass original IP for Rate Limiting
const httpServer = createServer(app);

// 👉 PRODUCTION-GRADE REDIS ADAPTER
// We need two separate connections: one for Publishing, one for Subscribing
const pubClient = redis;
const subClient = pubClient.duplicate();

subClient.on('error', (err) => console.error('🔴 [Redis Sub] Error:', err));

const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    allowedHeaders: ['*'],
    credentials: true,
  },
  transports: ['websocket', 'polling'], // Allow both explicitly
  allowEIO3: true, // Support older client engines if present
  adapter: createAdapter(pubClient, subClient),
});

io.on('connection', (socket) => {
  console.info(`🟢 [Socket] NEW CONNECTION: ${socket.id}`);
});

// 👉 INITIALIZE SYSTEM
initializeSocket(io);
connectDB();

app.use(pinoHttp({ logger }));
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://clerk.ethio-logistics.com"],
      connectSrc: ["'self'", "https://api.cloudinary.com", "ws://*", "wss://*", "https://*.clerk.accounts.dev"],
      imgSrc: ["'self'", "data:", "https://res.cloudinary.com", "https://img.clerk.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com"],
    },
  },
}));
app.use(cors({
  origin: '*',
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning', 'localtunnel-skip-clearing-house'],
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS']
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 2000, // 👉 Increased for real-time App Polling & Testing
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 60 * 1000, // 1 hour
  limit: 30, // 👉 High-security threshold for sensitive ops
  message: { error: 'Security threshold exceeded. Please try again later.' },
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

app.use('/api', globalLimiter);
app.use('/api/v1/user/rider-onboarding', strictLimiter);
app.use('/api/v1/merchant/finance/upload-proof', strictLimiter);
app.use('/api/v1/merchant/finance/settle-request', strictLimiter);

app.use(
  express.json({
    limit: '10mb',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use(mongoSanitize());

// Add robust clock skew leeway for Clerk auth to handle server-provider time drift
if (!process.env.CLERK_JWT_LEEWAY) {
  process.env.CLERK_JWT_LEEWAY = '60';
}

app.use(
  clerkMiddleware({
    publishableKey: clerkConfig.publishableKey,
    secretKey: clerkConfig.secretKey,
  })
);

app.set('socketio', io);

// 👉 HEALTH CHECK (required for Render / Railway uptime monitors)
app.get('/health', async (_req, res) => {
  const mongoOk = mongoose.connection.readyState === 1;
  let redisOk = false;
  try {
    redisOk = (await pubClient.ping()) === 'PONG';
  } catch { /* redis unavailable */ }

  const healthy = mongoOk && redisOk;
  res.status(healthy ? 200 : 503).json({
    status: healthy ? 'healthy' : 'degraded',
    services: { mongodb: mongoOk, redis: redisOk },
    uptime: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

// 👉 REST ROUTES (v1 — versioned for safe future breaking changes)
import incidentRoutes from './routes/incidentRoutes.js';
import userRoutes from './routes/userRoutes.js';
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/orders', orderRoutes);
app.use('/api/v1/merchant', merchantRoutes);
app.use('/api/v1/incidents', incidentRoutes);
app.use('/api/v1/user', userRoutes);

// 👉 Legacy aliases (temporary — keep mobile app working during migration)
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/merchant', merchantRoutes);
app.use('/api/incidents', incidentRoutes);
app.use('/api/user', userRoutes);

// 👉 Global Dev Redirects (Ensures both old and new paths work during tunnel dev)
app.use('/api/user', (req, res, next) => { if (!req.path.startsWith('/v1')) req.url = '/v1' + req.url; next(); }, userRoutes);
app.use('/api/orders', (req, res, next) => { if (!req.path.startsWith('/v1')) req.url = '/v1' + req.url; next(); }, orderRoutes);

app.get('/', (_req, res) => {
  res.json({
    name: 'Ethio Logistics API',
    version: 'v1',
    status: 'online',
    infrastructure: 'redis-pubsub',
    timestamp: new Date().toISOString(),
  });
});

const PORT = appConfig.port || 5000;

// 👉 ROUTE HISTORY SYNC (Redis → MongoDB, every 5 minutes)
// Previously this only ran when someone manually invoked `pnpm sync:history`,
// which meant Redis's TTL'd location-history lists could silently expire and
// be lost if nobody ran it in time. Now it runs automatically for the
// lifetime of this process, reusing the Mongo connection `connectDB()`
// already established above instead of opening a new one per run.
const ROUTE_HISTORY_SYNC_INTERVAL_MS = 5 * 60 * 1000;
let routeHistorySyncInProgress = false;

const routeHistorySyncTimer = setInterval(() => {
  if (routeHistorySyncInProgress) {
    logger.warn('[RouteHistorySync] Previous sync still running — skipping this tick.');
    return;
  }
  routeHistorySyncInProgress = true;
  runRouteHistorySync()
    .catch((error) => logger.error({ error }, '[RouteHistorySync] Unhandled sync error'))
    .finally(() => {
      routeHistorySyncInProgress = false;
    });
}, ROUTE_HISTORY_SYNC_INTERVAL_MS);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.info('──────────────────────────────────────────');
  console.info(`🚀 PRO-LOGISTICS SERVER RUNNING`);
  console.info(`📡 MODE: ${appConfig.nodeEnv}`);
  console.info(`🔗 ADAPTER: Redis Cluster Enabled`);
  console.info(`🌍 URL: http://0.0.0.0:${PORT}`);
  console.info('──────────────────────────────────────────');
});

const gracefulShutdown = () => {
  console.info('🛑 Shutting down server...');
  clearInterval(routeHistorySyncTimer);
  httpServer.close(async () => {
    await pubClient.quit();
    await subClient.quit();
    console.info('Systems Synchronized & Offline.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

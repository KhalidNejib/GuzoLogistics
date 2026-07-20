import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env from the services/api directory (no-op in production where env vars are injected directly)
config({ path: resolve(process.cwd(), '.env') });

/**
 * Backend-only environment configuration.
 * Reads directly from process.env — no shared package dependency needed.
 */

const get = (key: string, fallback?: string): string => {
  const val = process.env[key] ?? fallback;
  if (val === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return val;
};

const getOptional = (key: string, fallback: string = ''): string =>
  process.env[key] ?? fallback;

export const appConfig = {
  nodeEnv: getOptional('NODE_ENV', 'development') as 'development' | 'production' | 'test',
  isDev: (getOptional('NODE_ENV', 'development')) === 'development',
  port: Number(getOptional('PORT', '5000')) || 5000,
  // Comma-separated list of allowed browser origins for CORS (Express +
  // Socket.io). Falls back to '*' only outside production, where an open
  // CORS policy is acceptable for local dev/testing.
  allowedOrigins: getOptional('ALLOWED_ORIGINS', '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
};

export const clerkConfig = {
  // Frontend-only var that happens to live in this shared .env; genuinely
  // optional on the backend (nothing here fails without it).
  publishableKey: getOptional('VITE_CLERK_PUBLISHABLE_KEY', ''),
  // Required — every authenticated request (REST and socket) verifies
  // tokens with this. A missing value previously meant auth.ts/socket.ts
  // silently attempted verifyToken() with an empty secret on the first
  // real request instead of the server refusing to start.
  secretKey: get('CLERK_SECRET_KEY'),
  // Required — clerkWebhook.ts already guards against this being empty
  // per-request (returns 500), but that's a runtime symptom of the same
  // underlying boot-time misconfiguration; fail at boot instead.
  webhookSecret: get('CLERK_WEBHOOK_SIGNING_SECRET'),
};

export const mongoConfig = {
  // Was getOptional('', '') — a missing MONGODB_URI silently became an
  // empty string, and mongoose.connect('') doesn't fail until the first
  // connection attempt, deep inside request handling. Fail at boot instead.
  uri: get('MONGODB_URI'),
};

export const redisConfig = {
  // Same problem as mongoConfig — ioredis with an empty URL fails on first
  // command, not at startup. Fail at boot instead.
  url: get('REDIS_URL'),
};

export const cloudinaryConfig = {
  cloudName: get('CLOUDINARY_CLOUD_NAME'),
  apiKey: get('CLOUDINARY_API_KEY'),
  apiSecret: get('CLOUDINARY_API_SECRET'),
};

export const smsConfig = {
  // Optional: SMS notifications degrade gracefully when unset (sms.ts
  // already no-ops without credentials).
  key: getOptional('SMS_ET_KEY', ''),
  id: getOptional('SMS_ET_ID', ''),
};

export const orsConfig = {
  apiKey: get('ORS_API_KEY'),
};

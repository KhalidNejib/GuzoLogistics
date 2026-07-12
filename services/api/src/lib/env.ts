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
};

export const clerkConfig = {
  publishableKey: getOptional('VITE_CLERK_PUBLISHABLE_KEY', ''),
  secretKey: getOptional('CLERK_SECRET_KEY', ''),
  webhookSecret: getOptional('CLERK_WEBHOOK_SIGNING_SECRET', ''),
};

export const mongoConfig = {
  uri: getOptional('MONGODB_URI', ''),
};

export const redisConfig = {
  url: getOptional('REDIS_URL', ''),
};

export const cloudinaryConfig = {
  cloudName: getOptional('CLOUDINARY_CLOUD_NAME', ''),
  apiKey: getOptional('CLOUDINARY_API_KEY', ''),
  apiSecret: getOptional('CLOUDINARY_API_SECRET', ''),
};

export const smsConfig = {
  key: getOptional('SMS_ET_KEY', ''),
  id: getOptional('SMS_ET_ID', ''),
};

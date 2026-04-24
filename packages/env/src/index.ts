/* eslint-disable no-useless-assignment */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { z } from 'zod';

// 1. SCHEMAS
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Backend Only (Optional in browser to prevent validation errors)
  PORT: z.any().optional(),
  CLERK_SECRET_KEY: z.string().optional(),
  CLERK_WEBHOOK_SIGNING_SECRET: z.string().optional(),
  MONGODB_URI: z.string().optional(),
  REDIS_URL: z.string().optional(),

  // Shared / Frontend
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'VITE_CLERK_PUBLISHABLE_KEY is required')
    .startsWith('pk_', 'VITE_CLERK_PUBLISHABLE_KEY must start with "pk_"'),
});

// 2. DETECT ENVIRONMENT
const isBrowser = typeof window !== 'undefined';

let rawEnv: Record<string, any> = {};

if (isBrowser) {
  // 3. FRONTEND LOGIC (Vite)
  rawEnv = {
    NODE_ENV: (import.meta as any).env.MODE,
    VITE_CLERK_PUBLISHABLE_KEY: (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY,
  };
} else {
  // 4. BACKEND LOGIC (Node)
  // Note: We use dynamic access to avoid Vite trying to bundle 'path/dotenv'
  try {
    // These only run on the server
    const fs = await import('fs');
    const path = await import('path');
    const { default: dotenv } = await import('dotenv');

    dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });
    rawEnv = process.env;
  } catch (e) {
    rawEnv = process.env;
  }
}

// 5. VALIDATE
const _parsed = envSchema.safeParse(rawEnv);

if (!_parsed.success) {
  if (isBrowser) {
    console.error('Environment validation failed:', _parsed.error.format());
  } else {
    // Critical failure for server
    process.exit(1);
  }
}

const validatedData = _parsed.success ? _parsed.data : (rawEnv as any);

export const env = validatedData;

export const appConfig = {
  nodeEnv: env.NODE_ENV,
  isDev: env.NODE_ENV === 'development',
};

export const clerkConfig = {
  publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
  webhookSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
};

export const mongoConfig = {
  uri: env.MONGODB_URI,
};

export const redisConfig = {
  url: env.REDIS_URL,
};

export type Env = z.infer<typeof envSchema>;

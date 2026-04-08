import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

// Load .env from the monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

/**
 * Zod schema for all environment variables.
 */
const envSchema = z.object({
  // ─── App ────────────────────────────────────────────────────────
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  PORT: z
    .string()
    .default('5000')
    .transform((val) => parseInt(val, 10))
    .refine((val) => !isNaN(val) && val > 0, {
      message: 'PORT must be a positive number',
    }),

  // ─── Clerk (Authentication) ──────────────────────────────────────
  VITE_CLERK_PUBLISHABLE_KEY: z
    .string()
    .min(1, 'VITE_CLERK_PUBLISHABLE_KEY is required')
    .startsWith('pk_', 'VITE_CLERK_PUBLISHABLE_KEY must start with "pk_"'),

  CLERK_SECRET_KEY: z
    .string()
    .min(1, 'CLERK_SECRET_KEY is required')
    .startsWith('sk_', 'CLERK_SECRET_KEY must start with "sk_"'),

  // ─── MongoDB Atlas (Database) ────────────────────────────────────
  MONGODB_URI: z
    .string()
    .min(1, 'MONGODB_URI is required')
    .refine((val) => val.startsWith('mongodb+srv://') || val.startsWith('mongodb://'), {
      message:
        'MONGODB_URI must be a valid MongoDB connection string (mongodb:// or mongodb+srv://)',
    }),

  // ─── Redis Cloud (Live Tracking) ─────────────────────────────────
  REDIS_URL: z
    .string()
    .min(1, 'REDIS_URL is required')
    .refine((val) => val.startsWith('redis://') || val.startsWith('rediss://'), {
      message: 'REDIS_URL must be a valid Redis connection string (redis:// or rediss://)',
    }),
});

// ─── Parse & Validate ──────────────────────────────────────────────────────────
const _parsed = envSchema.safeParse(process.env);

if (!_parsed.success) {
  console.error('');
  console.error('❌ Invalid environment variables detected:');
  console.error('──────────────────────────────────────────');
  _parsed.error.issues.forEach((issue) => {
    console.error(`  ✗ ${issue.path.join('.')}: ${issue.message}`);
  });
  console.error('──────────────────────────────────────────');
  console.error('💡 Check your .env file at the project root.');
  console.error('');
  process.exit(1);
}

export const env = _parsed.data;

// Export individual groups for convenience
export const appConfig = {
  nodeEnv: env.NODE_ENV,
  port: env.PORT,
  isDev: env.NODE_ENV === 'development',
  isProd: env.NODE_ENV === 'production',
  isTest: env.NODE_ENV === 'test',
};

export const clerkConfig = {
  publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
  secretKey: env.CLERK_SECRET_KEY,
};

export const mongoConfig = {
  uri: env.MONGODB_URI,
};

export const redisConfig = {
  url: env.REDIS_URL,
};

// Type export for use across the monorepo
export type Env = z.infer<typeof envSchema>;

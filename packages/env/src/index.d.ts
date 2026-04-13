import { z } from 'zod';
/**
 * Zod schema for all environment variables.
 */
declare const envSchema: z.ZodObject<
  {
    NODE_ENV: z.ZodDefault<z.ZodEnum<['development', 'production', 'test']>>;
    PORT: z.ZodEffects<
      z.ZodEffects<z.ZodDefault<z.ZodString>, number, string | undefined>,
      number,
      string | undefined
    >;
    VITE_CLERK_PUBLISHABLE_KEY: z.ZodString;
    CLERK_SECRET_KEY: z.ZodString;
    MONGODB_URI: z.ZodEffects<z.ZodString, string, string>;
    REDIS_URL: z.ZodEffects<z.ZodString, string, string>;
  },
  'strip',
  z.ZodTypeAny,
  {
    NODE_ENV: 'development' | 'production' | 'test';
    PORT: number;
    VITE_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    MONGODB_URI: string;
    REDIS_URL: string;
  },
  {
    VITE_CLERK_PUBLISHABLE_KEY: string;
    CLERK_SECRET_KEY: string;
    MONGODB_URI: string;
    REDIS_URL: string;
    NODE_ENV?: 'development' | 'production' | 'test' | undefined;
    PORT?: string | undefined;
  }
>;
export declare const env: {
  NODE_ENV: 'development' | 'production' | 'test';
  PORT: number;
  VITE_CLERK_PUBLISHABLE_KEY: string;
  CLERK_SECRET_KEY: string;
  MONGODB_URI: string;
  REDIS_URL: string;
};
export declare const appConfig: {
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  isDev: boolean;
  isProd: boolean;
  isTest: boolean;
};
export declare const clerkConfig: {
  publishableKey: string;
  secretKey: string;
};
export declare const mongoConfig: {
  uri: string;
};
export declare const redisConfig: {
  url: string;
};
export type Env = z.infer<typeof envSchema>;
export {};

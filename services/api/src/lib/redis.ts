/* eslint-disable @typescript-eslint/no-explicit-any */
import { Redis } from 'ioredis';

// Use the URL you just pasted into the .env
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: null,
  retryStrategy(times: any) {
    console.warn(`[Redis] Retrying connection (${times})...`);
    return 3000;
  },
});

redis.on('connect', () => {
  console.info('🟢 [Redis] Connected successfully to Redis Cloud!');
});

redis.on('error', (err) => {
  console.error('🔴 [Redis] Connection Error:', err);
});

import { Redis } from 'ioredis';
import { redisConfig } from './env.js';

const REDIS_URL = redisConfig.url;

export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  connectTimeout: 10000,

  retryStrategy(times: number) {
    const delay = Math.min(times * 100, 3000);
    console.warn(`[Redis] Retry attempt ${times}, delaying ${delay}ms...`);
    return delay;
  },
});

redis.on('connect', () => {
  console.info('🟢 [Redis] Connected');
});

redis.on('ready', async () => {
  console.info('🟢 [Redis] Ready');

  try {
    const res = await redis.ping();
    if (res === 'PONG') {
      console.info('🟢 [Redis] PING success');
    }
  } catch (err) {
    console.error('🔴 [Redis] PING failed', err);
  }
});
redis.on('reconnecting', () => {
  console.warn('🟠 [Redis] Reconnecting...');
});
redis.on('end', () => {
  console.warn('🔴 [Redis] Connection intentionally closed or dropped');
});

redis.on('error', (err) => {
  console.error('🔴 [Redis] Error:', err);
});

// NOTE: this module intentionally does NOT register its own SIGINT/SIGTERM
// handler. Previously it did, independently of index.ts's gracefulShutdown
// and mongoose.ts's gracefulExit — three separate handlers all racing to
// call process.exit() on every deploy/restart, so whichever finished first
// killed the process, possibly before the HTTP server had drained
// connections or sockets had closed cleanly. Shutdown is now owned by a
// single handler in index.ts, which closes the HTTP server first, then
// Mongo, then this Redis client, in that order, before exiting once.

import { Redis } from 'ioredis';
import { redisConfig } from '@ethio-logistics/env';

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
process.on('SIGINT', async () => {
  console.info('Shutting down Redis...');
  try {
    await redis.quit();
    console.info('🟢 [Redis] Shutdown complete');
    process.exit(0);
  } catch (err) {
    console.error('🔴 Shutdown error', err);
    process.exit(1);
  }
});

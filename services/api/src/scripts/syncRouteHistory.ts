import mongoose from 'mongoose';
import { redis } from '../lib/redis.js';
import Order from '../models/Order.js';
import { logger } from '../lib/logger.js';
import { mongoConfig } from '../lib/env.js';

/**
 * Syncs location history from Redis lists to MongoDB Order documents.
 * Runs periodically (see scheduler in index.ts, every 5 minutes) and can
 * also be invoked manually via `pnpm sync:history`.
 *
 * Safety note: each key is atomically RENAMEd to a private snapshot name
 * before it's read and processed. This means any location updates the
 * live server LPUSHes to the original key *while this job is running*
 * land safely on a fresh list and are picked up on the next run, instead
 * of racing with (and potentially being wiped out by) this job's cleanup.
 */
export async function runRouteHistorySync(): Promise<void> {
  try {
    const keys = await redis.keys('order:history:points:*');

    if (keys.length === 0) {
      logger.info('[RouteHistorySync] No location history found in Redis to sync.');
      return;
    }

    logger.info(`[RouteHistorySync] Found ${keys.length} orders with pending location history.`);

    for (const key of keys) {
      const orderId = key.split(':').pop();
      if (!orderId) continue;

      // Atomically hand off this key's data to a private snapshot name so
      // concurrent LPUSHes from live rider updates can't be lost or race
      // with our read + delete below.
      const snapshotKey = `${key}:sync:${Date.now()}`;
      const renamed = await redis.renamenx(key, snapshotKey);
      if (!renamed) {
        // Another sync run (or a same-millisecond race) is already handling
        // this key, or the key vanished (TTL) between KEYS and RENAMENX.
        // Safe to skip — it'll be picked up on the next cycle.
        continue;
      }

      try {
        const points = await redis.lrange(snapshotKey, 0, -1);
        if (points.length === 0) continue;

        const historyItems = points
          .map((p) => {
            const data = JSON.parse(p);
            return {
              lat: data.lat,
              lng: data.lng,
              timestamp: new Date(data.lastSeen),
            };
          })
          .reverse(); // Reverse because we used LPUSH (latest first)

        await Order.findByIdAndUpdate(orderId, {
          $push: { routeHistory: { $each: historyItems } },
        });

        logger.info(`[RouteHistorySync] Synced ${points.length} points for order ${orderId}`);
      } finally {
        // Whether we succeeded or hit an error, the snapshot has already
        // been fully read out (or errored before any partial DB write in
        // a way that would need the data again) — clear it so it doesn't
        // linger. If a future run needs stronger delivery guarantees this
        // is the place to add a dead-letter fallback instead of a delete.
        await redis.del(snapshotKey);
      }
    }

    logger.info('[RouteHistorySync] Route history sync completed successfully.');
  } catch (error) {
    logger.error({ error }, '[RouteHistorySync] Error during route history sync');
  }
}

// ─── Standalone CLI mode ───────────────────────────────────────────────────
// Allows `pnpm sync:history` to keep working as a one-off manual run,
// while runRouteHistorySync() itself stays reusable by the in-process
// scheduler in index.ts (which already holds an open Mongo connection).
const isDirectRun = import.meta.url === `file://${process.argv[1]}`;
if (isDirectRun) {
  (async () => {
    try {
      if (mongoose.connection.readyState === 0) {
        await mongoose.connect(mongoConfig.uri);
        logger.info('[RouteHistorySync] Connected to MongoDB for standalone sync run');
      }
      await runRouteHistorySync();
    } finally {
      if (mongoose.connection.readyState !== 0) {
        await mongoose.connection.close();
        logger.info('[RouteHistorySync] MongoDB connection closed');
      }
      process.exit(0);
    }
  })();
}

import mongoose from 'mongoose';
import { logger } from './logger.js';
import { mongoConfig, appConfig } from './env.js';

const mongooseOptions: mongoose.ConnectOptions = {
  connectTimeoutMS: 10000,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  maxPoolSize: 10,
  minPoolSize: 1,
  heartbeatFrequencyMS: 10000,
  autoIndex: appConfig.isDev,
};

const connectDB = async () => {
  if (mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) {
    logger.info(`MongoDB is already connected or connecting. Skipping...`);
    return;
  }
  try {
    const conn = await mongoose.connect(mongoConfig.uri, mongooseOptions);
    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`❌ Connection Error: ${(error as Error).message}`);
    logger.info(`Retrying MongoDB connection in 5 seconds...`);
    setTimeout(connectDB, 5000);
  }
};
mongoose.connection.on('disconnected', () => {
  logger.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('error', (err) => {
  logger.error(`🔴 MongoDB Runtime Error: ${err}`);
});
/**
 * Cleanly closes the database connection when the app is stopped.
 * This prevents "hanging" connections and data corruption.
 *
 * NOTE: this used to self-register on SIGINT/SIGTERM and call process.exit()
 * directly. That meant three independent shutdown handlers (this one,
 * redis.ts's, and index.ts's) all raced on every deploy/restart — whichever
 * finished first killed the process, possibly before the HTTP server had
 * drained connections. This is now a plain exported function with no exit
 * call; index.ts's single gracefulShutdown calls it in the correct order
 * (HTTP server drained → Mongo closed → Redis closed → exit once).
 */
export const closeDB = async () => {
  if (mongoose.connection.readyState === 0) return;
  await mongoose.connection.close();
  logger.info('📡 MongoDB connection closed cleanly via app termination');
};

export default connectDB;

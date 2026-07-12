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
 */
const gracefulExit = async () => {
  if (mongoose.connection.readyState === 0) {
    process.exit(0);
  }

  try {
    await mongoose.connection.close();
    logger.info('📡 MongoDB connection closed cleanly via app termination');
    process.exit(0);
  } catch (err) {
    logger.error({ err }, '⚠️ Error during MongoDB disconnection');
    process.exit(1);
  }
};
// Listen for process signals
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);

export default connectDB;

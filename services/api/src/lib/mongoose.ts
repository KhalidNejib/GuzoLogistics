import mongoose from 'mongoose';
import { mongoConfig, appConfig } from '@ethio-logistics/env';

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
    console.log(`MongoDB is already connected or connecting. Skipping...`);
    return;
  }
  try {
    const conn = await mongoose.connect(mongoConfig.uri, mongooseOptions);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ Connection Error: ${(error as Error).message}`);
    console.log(`Retrying MongoDB connection in 5 seconds...`);
    setTimeout(connectDB, 5000);
  }
};
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected. Attempting to reconnect...');
});
mongoose.connection.on('error', (err) => {
  console.error(`🔴 MongoDB Runtime Error: ${err}`);
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
    console.log('📡 MongoDB connection closed cleanly via app termination');
    process.exit(0);
  } catch (err) {
    console.error('⚠️ Error during MongoDB disconnection:', err);
    process.exit(1);
  }
};
// Listen for process signals
process.on('SIGINT', gracefulExit);
process.on('SIGTERM', gracefulExit);

export default connectDB;

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { appConfig } from '@ethio-logistics/env';
import connectDB from './lib/mongoose.js';
import webhookRoutes from './routes/webhookRoutes.js';

/**
 * Ethio Logistics API - Day 3 Milestone
 * Core Server Initialization
 */

const app = express();

// 1. Database Connection
connectDB();

// 2. Global Middlewares
app.use(helmet()); // Adds security headers
app.use(cors()); // Enables Cross-Origin Resource Sharing
app.use(morgan('dev')); // Logs requests to the console

// 3. Routes
// IMPORTANT: We need the raw body for Webhook Signature verification.
// This middleware captures it before it's parsed.
app.use(
  express.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

app.use('/api/webhooks', webhookRoutes);

// 3. Health Check Route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Ethio Logistics API is running',
    timestamp: new Date().toISOString(),
  });
});

// 4. Start Server
const PORT = appConfig.port || 5000;

app.listen(PORT, () => {
  console.info('──────────────────────────────────────────');
  console.info(`🚀 Server running in ${appConfig.nodeEnv} mode`);
  console.info(`📡 Listening on: http://localhost:${PORT}`);
  console.info('──────────────────────────────────────────');
});

// Handle unhandled rejections
process.on('unhandledRejection', (err: Error) => {
  console.error(`🔴 Unhandled Rejection: ${err.message}`);
  // In a real prod environment, you might want to restart the process here
});

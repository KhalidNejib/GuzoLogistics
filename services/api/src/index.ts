/**
 * 1. GATEKEEPER: Import environment variables first.
 * This will validate credentials and crash the process if any are missing.
 */
import { appConfig, env } from '@ethio-logistics/env';

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

const app = express();
const httpServer = createServer(app);

// 2. MIDDLEWARE
app.use(helmet()); // Security headers
app.use(cors()); // Enable cross-origin requests
app.use(morgan('dev')); // Request logging
app.use(express.json()); // Body parsing

// 3. SOCKET.IO INITIALIZATION
const io = new Server(httpServer, {
  cors: {
    origin: '*', // In production, we should restrict this to our dashboard URL
    methods: ['GET', 'POST'],
  },
});

// 4. BASIC ROUTES
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    env: appConfig.nodeEnv,
    version: '1.0.0',
  });
});

// 5. SOCKET CONNECTION HANDLER (The brain of real-time tracking)
io.on('connection', (socket) => {
  console.info(`📡 New connection: ${socket.id}`);

  // We will add tracking events like 'location-update' here in the next session

  socket.on('disconnect', () => {
    console.info(`🔌 Disconnected: ${socket.id}`);
  });
});

// 6. START SERVER
const PORT = appConfig.port;

httpServer.listen(PORT, () => {
  console.info('');
  console.info('🚀 Ethio Logistics API is ready!');
  console.info(`📍 Port: ${PORT}`);
  console.info(`🌍 Environment: ${appConfig.nodeEnv}`);
  console.info('');
});

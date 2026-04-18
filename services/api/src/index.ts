import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { clerkMiddleware } from '@clerk/express';
import { createServer } from 'http';
import { Server } from 'socket.io';

// 👉 THIS IS WHAT WAKES UP REDIS ON BOOT
import './lib/redis.js';

import { appConfig, clerkConfig } from '@ethio-logistics/env';
import connectDB from './lib/mongoose.js';
import webhookRoutes from './routes/webhookRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import { initializeSocket } from './socket.js';

const app = express();

// 👉 WE WRAP EXPRESS IN A NATIVE HTTP SERVER SO SOCKETS CAN ATTACH
const httpServer = createServer(app);

// 👉 WE INITIALIZE SOCKET.IO
const io = new Server(httpServer, {
  cors: {
    origin: '*', // We will restrict this in production!
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// 👉 WE BIND THE ROOM/LOCATION LOGIC WE JUST WROTE
initializeSocket(io);

// 1. Database Connection
connectDB();

// 2. Global Middlewares
app.use(helmet());
app.use(cors());
app.use(morgan('dev'));
app.use(
  clerkMiddleware({
    publishableKey: clerkConfig.publishableKey,
    secretKey: clerkConfig.secretKey,
  })
);

// 3. Webhooks (Must capture raw body before parsing JSON)
app.use(
  express.json({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    verify: (req: any, _res, buf) => {
      req.rawBody = buf;
    },
  })
);

// 4. REST Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/orders', orderRoutes);

// Health Check route
app.get('/', (req, res) => {
  res.json({
    status: 'online',
    message: 'Ethio Logistics API is running',
    timestamp: new Date().toISOString(),
  });
});

const PORT = appConfig.port || 5000;

// 👉 WE CHANGE app.listen TO httpServer.listen
httpServer.listen(PORT, () => {
  console.info('──────────────────────────────────────────');
  console.info(`🚀 Server running in ${appConfig.nodeEnv} mode`);
  console.info(`📡 HTTP/Socket Listening on: http://localhost:${PORT}`);
  console.info('──────────────────────────────────────────');
});

// Graceful Production Shutdowns
const gracefulShutdown = () => {
  console.info('🛑 Shutting down server...');
  httpServer.close(() => {
    console.info('HTTP/Sockets Closed.');
    process.exit(0);
  });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

process.on('unhandledRejection', (err: Error) => {
  console.error(`🔴 Unhandled Rejection: ${err.message}`);
});

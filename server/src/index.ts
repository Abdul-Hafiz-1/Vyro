import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import authRoutes from './routes/auth.js';
import listingRoutes from './routes/listings.js';
import memoryRoutes from './routes/memory.js';
import notificationRoutes from './routes/notifications.js';
import agentRoutes from './routes/agents.js';
import requestRoutes from './routes/requests.js';
import negotiationRoutes from './routes/negotiations.js';
import agreementRoutes from './routes/agreements.js';
import paymentRoutes from './routes/payments.js';
import transactionRoutes from './routes/transactions.js';
import analyticsRoutes from './routes/analytics.js';
import activityRoutes from './routes/activity.js';
import systemRoutes from './routes/system.js';
import aiRoutes from './routes/ai.js';
import homeRoutes from './routes/home.js';
import eventsRoutes from './routes/events.js';

const app = express();

// Middlewares
app.use(cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'PayPal-Request-Id']
}));
app.options('*', cors({
  origin: (origin, callback) => callback(null, true),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Request logging in development
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.path.startsWith('/api')) {
    console.log(`[API] ${req.method} ${req.path}`);
  }
  next();
});

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Mount versioned API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/listings', listingRoutes);
app.use('/api/v1/memory', memoryRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/agents', agentRoutes);
app.use('/api/v1/network', agentRoutes); // Alias for network explorer
app.use('/api/v1/requests', requestRoutes);
app.use('/api/v1/negotiations', negotiationRoutes);
app.use('/api/v1/agreements', agreementRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/transactions', transactionRoutes);
app.use('/api/v1/analytics', analyticsRoutes);
app.use('/api/v1/activity', activityRoutes);
app.use('/api/v1/system', systemRoutes);
app.use('/api/v1/ai', aiRoutes);
app.use('/api/v1/home', homeRoutes);
app.use('/api/v1/events', eventsRoutes);

// Global Error Handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('[Unhandled Server Error]', err);
  res.status(500).json({
    success: false,
    error: err.message || 'Internal Server Error',
    ...(config.nodeEnv === 'development' && { stack: err.stack })
  });
});

app.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`  VYRO — Autonomous AI Commerce Network Engine`);
  console.log(`  Running on http://localhost:${config.port}`);
  console.log(`  Environment: ${config.nodeEnv}`);
  console.log(`  PayPal Mode: ${config.paypal.mode}`);
  console.log(`====================================================`);
});

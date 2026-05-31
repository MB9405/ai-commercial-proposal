import express from 'express';
import cors from 'cors';
import path from 'path';
import { config } from './config';
import { prisma } from './config/database';

import authRoutes from './routes/auth';
import proposalRoutes from './routes/proposals';
import templateRoutes from './routes/templates';
import subscriptionRoutes from './routes/subscriptions';
import uploadRoutes from './routes/upload';

const app = express();

// Middleware
app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/upload', uploadRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ success: true, status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, error: 'Внутренняя ошибка сервера' });
});

async function start() {
  try {
    await prisma.$connect();
    console.log('Connected to database');

    app.listen(config.port, () => {
      console.log(`Server running on port ${config.port}`);
      console.log(`Environment: ${config.nodeEnv}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

start();

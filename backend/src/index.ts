import express from 'express';
import cookieParser from 'cookie-parser';
import { config } from './config/env';
import prisma from './config/database';
import { connectRedis, checkRedisHealth } from './config/redis';
import { connectNeo4j, checkNeo4jHealth, closeNeo4j } from './config/neo4j';
import logger from './utils/logger';

// Middleware imports
import { securityHeaders, corsMiddleware, generalRateLimiter, additionalHeaders } from './middleware/security';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Route imports
import authRoutes from './routes/auth.routes';
import adminRoutes from './routes/admin.routes';
import casesRoutes from './routes/cases.routes';
import alertsRoutes from './routes/alerts.routes';
import auditRoutes from './routes/audit.routes';
import entitiesRoutes from './routes/entities.routes';
import uploadRoutes from './routes/upload.routes';
import processingRoutes from './routes/processing.routes';
import documentsRoutes from './routes/documents.routes';
import aiRoutes from './routes/ai.routes';

const app = express();

// ─── Security Foundation Middleware ───────────────────────
app.use(securityHeaders);
app.use(additionalHeaders);
app.use(corsMiddleware);
app.use(generalRateLimiter);

// Parser Middlewares
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ─── API Routes ───────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/alerts', alertsRoutes);
app.use('/api/audit-logs', auditRoutes);
app.use('/api/entities', entitiesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/processing', processingRoutes);
app.use('/api/documents', documentsRoutes);
app.use('/api/ai', aiRoutes);

// ─── Health Check Endpoints ────────────────────────────────
/**
 * GET /api/health
 * Public health check returning system component status.
 */
app.get('/api/health', async (_req, res) => {
  let dbHealthy = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbHealthy = true;
  } catch (err) {
    logger.error('Health check: PostgreSQL check failed', err);
  }

  const redisHealthy = await checkRedisHealth();
  const neo4jHealthy = await checkNeo4jHealth();

  const isHealthy = dbHealthy && redisHealthy && neo4jHealthy;

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    services: {
      backend: 'healthy',
      database: dbHealthy ? 'connected' : 'disconnected',
      redis: redisHealthy ? 'connected' : 'disconnected',
      neo4j: neo4jHealthy ? 'connected' : 'disconnected',
    },
    demoMode: process.env.MOCK_DATABASE === 'true' || config.isDemo,
  });
});

// ─── Fallback & Error Handling ─────────────────────────────
app.use(notFoundHandler);
app.use(errorHandler);

// ─── Initialization ───────────────────────────────────────
const PORT = config.port;
const HOST = '127.0.0.1'; // SECURITY: Do not listen on 0.0.0.0 during testing/dev

async function startServer() {
  logger.info('Initializing services...');
  
  // Connect to Redis & Neo4j
  await connectRedis();
  await connectNeo4j();

  const server = app.listen(PORT, HOST, () => {
    logger.info(`🚀 CrimeGraph AI Backend running at http://${HOST}:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = async () => {
    logger.info('Shutting down server gracefully...');
    server.close(async () => {
      await prisma.$disconnect();
      await closeNeo4j();
      logger.info('Services shut down. Exiting process.');
      process.exit(0);
    });
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

startServer().catch(err => {
  logger.error('Fatal error during startup', err);
  process.exit(1);
});

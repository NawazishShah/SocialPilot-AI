// ═══════════════════════════════════════════════════════════════
// Application Entry Point
// ═══════════════════════════════════════════════════════════════

import { serverConfig } from './config';
import { getRedisConnection, disconnectRedis } from './config/redis';
import { createServer } from './server';
import { prisma, disconnectDB } from './services/database';
import { logger } from './utils';

async function bootstrap() {
  logger.info('🚀 Starting Content Jinee...');

  // ─── Verify Database Connection ─────────────────────────────
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to connect to database');
    process.exit(1);
  }

  // ─── Verify Redis Connection ────────────────────────────────
  try {
    const redis = getRedisConnection();
    await redis.connect();
    await redis.ping();
    logger.info('✅ Redis connected');
  } catch (err) {
    logger.fatal({ err }, '❌ Failed to connect to Redis');
    process.exit(1);
  }

  // ─── Start HTTP Server ─────────────────────────────────────
  const app = createServer();

  const server = app.listen(serverConfig.port, () => {
    logger.info(`✅ Server running on http://localhost:${serverConfig.port}`);
    logger.info(`   Environment: ${serverConfig.isDev ? 'development' : 'production'}`);
  });

  // ─── Graceful Shutdown ──────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    server.close(() => {
      logger.info('  ✓ HTTP server closed');
    });

    await disconnectDB();
    logger.info('  ✓ Database disconnected');

    await disconnectRedis();
    logger.info('  ✓ Redis disconnected');

    logger.info('👋 Goodbye.');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ─── Unhandled Rejection / Exception Handlers ───────────────
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, '💥 Unhandled Promise Rejection');
  });

  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, '💥 Uncaught Exception — shutting down');
    process.exit(1);
  });
}

bootstrap();

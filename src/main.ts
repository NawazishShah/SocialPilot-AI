// ═══════════════════════════════════════════════════════════════
// PostPilot AI - Main Entry Point
// ═══════════════════════════════════════════════════════════════
//
// Modes:
//   - server:   HTTP API server only
//   - worker:   BullMQ job workers only
//   - scheduler: Schedule runner only
//   - all:      All components (default)
//
// Usage:
//   npm run dev          # Run all components
//   npm run dev:server   # Run API server only
//   npm run dev:worker   # Run workers only
//   npm run dev:scheduler # Run scheduler only
// ═══════════════════════════════════════════════════════════════

import { serverConfig } from './config';
import { getRedisConnection, disconnectRedis } from './config/redis';
import { createServer } from './server';
import { prisma, disconnectDB } from './services/database';
import { logger } from './utils';
import { startWorkers } from './jobs/workers';
import { schedulerRunnerService } from './services/scheduler-runner.service';
import { closeQueues } from './jobs/queues';

type RunMode = 'server' | 'worker' | 'scheduler' | 'all';

const mode = (process.env.RUN_MODE || 'all') as RunMode;

async function bootstrap() {
  logger.info('🚀 Starting PostPilot AI...', { mode });

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

  // ─── Start Components based on mode ───────────────────────
  const components: Array<{ name: string; shutdown: () => Promise<void> }> = [];

  // Server
  if (mode === 'server' || mode === 'all') {
    const app = createServer();
    const server = app.listen(serverConfig.port, () => {
      logger.info(`✅ HTTP server running on http://localhost:${serverConfig.port}`);
    });

    components.push({
      name: 'HTTP server',
      shutdown: () =>
        new Promise((resolve) => {
          server.close(() => {
            logger.info('  ✓ HTTP server closed');
            resolve();
          });
        }),
    });
  }

  // Workers
  if (mode === 'worker' || mode === 'all') {
    const workers = startWorkers();
    logger.info('✅ BullMQ workers started');

    components.push({
      name: 'Workers',
      shutdown: async () => {
        await workers.contentWorker.close();
        await workers.publishWorker.close();
        await workers.pipelineWorker.close();
        logger.info('  ✓ Workers closed');
      },
    });
  }

  // Scheduler
  if (mode === 'scheduler' || mode === 'all') {
    schedulerRunnerService.start();
    logger.info('✅ Scheduler runner started');

    components.push({
      name: 'Scheduler runner',
      shutdown: () => {
        schedulerRunnerService.stop();
        logger.info('  ✓ Scheduler runner stopped');
        return Promise.resolve();
      },
    });
  }

  // ─── Graceful Shutdown ─────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`\n${signal} received. Shutting down gracefully...`);

    for (const component of components) {
      try {
        await component.shutdown();
      } catch (err) {
        logger.error({ err, component: component.name }, `Failed to shutdown ${component.name}`);
      }
    }

    await closeQueues();
    logger.info('  ✓ Queues closed');

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

  logger.info(`✅ PostPilot AI started in ${mode} mode`);
}

bootstrap();

// ═══════════════════════════════════════════════════════════════
// Worker Entry Point — run workers as a separate process
// ═══════════════════════════════════════════════════════════════
//
// Usage:
//   npm run worker          (production)
//   npm run worker:dev      (development with hot-reload)
//
// ═══════════════════════════════════════════════════════════════

import '../config'; // load env vars
import { startWorkers } from './workers';
import { prisma } from '../services/database';
import { disconnectRedis } from '../config/redis';
import { logger } from '../utils';

async function main() {
  logger.info('🏭 Starting worker process...');

  // Connect to database
  await prisma.$connect();
  logger.info('✅ Database connected (worker)');

  // Start all workers
  const { contentWorker, publishWorker } = startWorkers();

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down workers...`);

    await contentWorker.close();
    await publishWorker.close();
    logger.info('  ✓ Workers stopped');

    await prisma.$disconnect();
    logger.info('  ✓ Database disconnected');

    await disconnectRedis();
    logger.info('  ✓ Redis disconnected');

    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, '💥 Worker startup failed');
  process.exit(1);
});

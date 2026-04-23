import '../config';
import { prisma } from '../services/database';
import { schedulerRunnerService } from '../services/scheduler-runner.service';
import { logger } from '../utils';

async function main() {
  logger.info('⏱️  Starting scheduler process...');

  await prisma.$connect();
  logger.info('✅ Database connected (scheduler)');

  schedulerRunnerService.start();

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down scheduler...`);
    schedulerRunnerService.stop();
    await prisma.$disconnect();
    logger.info('  ✓ Database disconnected');
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.fatal({ err }, '💥 Scheduler startup failed');
  process.exit(1);
});

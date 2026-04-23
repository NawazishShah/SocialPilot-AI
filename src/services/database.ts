// ═══════════════════════════════════════════════════════════════
// Prisma Client — singleton instance
// ═══════════════════════════════════════════════════════════════

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      { emit: 'event', level: 'query' },
      { emit: 'event', level: 'error' },
      { emit: 'event', level: 'warn' },
    ],
  });

// Log slow queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e) => {
    if (e.duration > 100) {
      logger.warn({ duration: e.duration, query: e.query }, '🐢 Slow query detected');
    }
  });
}

prisma.$on('error', (e) => {
  logger.error({ target: e.target, message: e.message }, '❌ Prisma error');
});

// Prevent multiple instances in development (hot-reload)
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Gracefully disconnect from the database.
 */
export async function disconnectDB(): Promise<void> {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

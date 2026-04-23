// ═══════════════════════════════════════════════════════════════
// Health Module — Routes
// ═══════════════════════════════════════════════════════════════

import { Router, Request, Response } from 'express';
import { prisma } from '../../services/database';
import { getRedisConnection } from '../../config/redis';
import { logger } from '../../utils';

export const healthRoutes = Router();

healthRoutes.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, { status: string; latencyMs?: number }> = {};

  // Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = { status: 'healthy', latencyMs: Date.now() - dbStart };
  } catch {
    checks.database = { status: 'unhealthy', latencyMs: Date.now() - dbStart };
  }

  // Redis check
  const redisStart = Date.now();
  try {
    const redis = getRedisConnection();
    await redis.ping();
    checks.redis = { status: 'healthy', latencyMs: Date.now() - redisStart };
  } catch {
    checks.redis = { status: 'unhealthy', latencyMs: Date.now() - redisStart };
  }

  const isHealthy = Object.values(checks).every((c) => c.status === 'healthy');

  if (!isHealthy) {
    logger.warn({ checks }, 'Health check failed');
  }

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

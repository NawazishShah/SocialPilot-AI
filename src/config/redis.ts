// ═══════════════════════════════════════════════════════════════
// Redis Connection — shared by BullMQ, caching, and rate limiting
// ═══════════════════════════════════════════════════════════════

import Redis from 'ioredis';
import { redisConfig } from './index';
import { logger } from '../utils/logger';

let redisClient: Redis | null = null;

/**
 * Returns a singleton Redis connection.
 * BullMQ requires `maxRetriesPerRequest: null` — this is set in redisConfig.
 */
export function getRedisConnection(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: null,
    retryStrategy: (times: number) => {
      if (times > 10) {
        logger.error('Redis: max reconnection attempts reached, giving up');
        return null; // stop retrying
      }
      const delay = Math.min(times * 200, 5000);
      logger.warn(`Redis: reconnecting in ${delay}ms (attempt ${times})`);
      return delay;
    },
    lazyConnect: true,
  });

  redisClient.on('connect', () => {
    logger.info('✅ Redis connected');
  });

  redisClient.on('error', (err) => {
    logger.error({ err }, '❌ Redis connection error');
  });

  redisClient.on('close', () => {
    logger.warn('⚠️  Redis connection closed');
  });

  return redisClient;
}

/**
 * Creates a new Redis connection (for BullMQ workers that need their own connection).
 */
export function createRedisConnection(): Redis {
  return new Redis({
    host: redisConfig.host,
    port: redisConfig.port,
    password: redisConfig.password,
    db: redisConfig.db,
    maxRetriesPerRequest: null,
  });
}

/**
 * Gracefully disconnect Redis.
 */
export async function disconnectRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info('Redis disconnected');
  }
}

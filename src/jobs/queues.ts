// ═══════════════════════════════════════════════════════════════
// BullMQ Queue Definitions
// ═══════════════════════════════════════════════════════════════

import { Queue } from 'bullmq';
import { getRedisConnection } from '../config/redis';
import { QUEUE_NAMES, JOB_DEFAULTS } from '../config/constants';

const connection = getRedisConnection();

// ─── Content Generation Queue ─────────────────────────────────

export const contentGenerationQueue = new Queue(QUEUE_NAMES.CONTENT_GENERATION, {
  connection,
  defaultJobOptions: {
    attempts: JOB_DEFAULTS.CONTENT_GENERATION.attempts,
    backoff: JOB_DEFAULTS.CONTENT_GENERATION.backoff,
    removeOnComplete: { age: 86400, count: 1000 },
    removeOnFail: { age: 604800 },
  },
});

// ─── Post Publishing Queue ────────────────────────────────────

export const postPublishingQueue = new Queue(QUEUE_NAMES.POST_PUBLISHING, {
  connection,
  defaultJobOptions: {
    attempts: JOB_DEFAULTS.POST_PUBLISHING.attempts,
    backoff: JOB_DEFAULTS.POST_PUBLISHING.backoff,
    removeOnComplete: { age: 86400 },
    removeOnFail: { age: 604800 },
  },
});

// ─── Analytics Collection Queue ───────────────────────────────

export const analyticsCollectionQueue = new Queue(QUEUE_NAMES.ANALYTICS_COLLECTION, {
  connection,
  defaultJobOptions: {
    attempts: JOB_DEFAULTS.ANALYTICS_COLLECTION.attempts,
    backoff: JOB_DEFAULTS.ANALYTICS_COLLECTION.backoff,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

// ─── Account Health Check Queue ───────────────────────────────

export const accountHealthQueue = new Queue(QUEUE_NAMES.ACCOUNT_HEALTH, {
  connection,
  defaultJobOptions: {
    attempts: JOB_DEFAULTS.ACCOUNT_HEALTH.attempts,
    removeOnComplete: { age: 3600 },
    removeOnFail: { age: 86400 },
  },
});

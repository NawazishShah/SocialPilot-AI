// ═══════════════════════════════════════════════════════════════
// BullMQ Workers — process jobs from all queues
// ═══════════════════════════════════════════════════════════════

import { Worker, Job } from 'bullmq';
import { createRedisConnection } from '../config/redis';
import { QUEUE_NAMES } from '../config/constants';
import { createModuleLogger } from '../utils';
import { processContentGeneration } from './processors/content-generation.processor';
import { processPostPublishing } from './processors/post-publishing.processor';
import { processPostingPipeline } from './processors/posting-pipeline.processor';

const log = createModuleLogger('workers');

/**
 * Start all BullMQ workers.
 * Each worker gets its own Redis connection (BullMQ requirement).
 */
export function startWorkers() {
  // ─── Content Generation Worker ────────────────────────────
  const contentWorker = new Worker(
    QUEUE_NAMES.CONTENT_GENERATION,
    async (job: Job) => {
      log.info({ jobId: job.id, data: job.data }, `Processing content generation job`);
      return processContentGeneration(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: 3,
      limiter: {
        max: 10,
        duration: 60000, // max 10 jobs per minute
      },
    }
  );

  contentWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, '✅ Content generation completed');
  });

  contentWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: err.message }, '❌ Content generation failed');
  });

  // ─── Post Publishing Worker ───────────────────────────────
  const publishWorker = new Worker(
    QUEUE_NAMES.POST_PUBLISHING,
    async (job: Job) => {
      log.info({ jobId: job.id, data: job.data }, `Processing post publishing job`);
      return processPostPublishing(job);
    },
    {
      connection: createRedisConnection(),
      concurrency: 2, // limited: each job opens a browser context
      limiter: {
        max: 5,
        duration: 60000,
      },
    }
  );

  publishWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, '✅ Post published successfully');
  });

  publishWorker.on('failed', (job, err) => {
    log.error({ jobId: job?.id, err: err.message }, '❌ Post publishing failed');
  });

  // ─── Automated Posting Pipeline Worker ────────────────────
  const pipelineWorker = new Worker(
    QUEUE_NAMES.POSTING_PIPELINE,
    async (job: Job) => {
      log.info({ jobId: job.id, data: job.data }, `Processing automated posting pipeline job`);
      return processPostingPipeline(job as unknown as Job<any>);
    },
    {
      connection: createRedisConnection(),
      concurrency: 1,
    }
  );

  pipelineWorker.on('completed', (job) => {
    log.info({ jobId: job.id }, '✅ Posting pipeline completed');
  });

  pipelineWorker.on('failed', (job, err) => {
    log.error(
      { jobId: job?.id, err: err.message, attemptsMade: job?.attemptsMade, attempts: job?.opts?.attempts },
      '❌ Posting pipeline failed'
    );
  });

  log.info('🏭 All workers started');

  return { contentWorker, publishWorker, pipelineWorker };
}

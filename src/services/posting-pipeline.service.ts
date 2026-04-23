import { prisma } from './database';
import type { Platform } from '../config/constants';
import { NotFoundError, ValidationError, createModuleLogger } from '../utils';
import { postingPipelineQueue } from '../jobs/queues';
import type { PostStyle } from '../ai/prompts/styles';

const log = createModuleLogger('posting-pipeline-service');

export interface EnqueuePostingPipelineInput {
  scheduleId: string;
  style?: PostStyle;
  additionalContext?: string;
  autoPublish?: boolean;
}

class PostingPipelineService {
  /**
   * Enqueue an end-to-end posting pipeline job.
   * The worker will:
   * - fetch the topic from Schedule.contentConfig
   * - generate + improve content
   * - post via Playwright adapter for the platform
   * - persist Content + PostLog
   */
  async enqueue(input: EnqueuePostingPipelineInput) {
    const schedule = await prisma.schedule.findUnique({
      where: { id: input.scheduleId },
      select: {
        id: true,
        accountId: true,
        status: true,
        contentConfig: true,
        account: {
          select: { id: true, platform: true, status: true },
        },
      },
    });

    if (!schedule) throw new NotFoundError('Schedule', input.scheduleId);
    if (!schedule.account) throw new NotFoundError('Account', schedule.accountId);

    if (schedule.status !== 'active') {
      throw new ValidationError(`Schedule is ${schedule.status}, cannot enqueue posting pipeline`);
    }
    if (schedule.account.status !== 'active') {
      throw new ValidationError(`Account is ${schedule.account.status}, cannot enqueue posting pipeline`);
    }

    const contentConfig = schedule.contentConfig as { topic?: string } | null | undefined;
    if (!contentConfig?.topic) {
      throw new ValidationError('Schedule.contentConfig.topic is required to run the pipeline');
    }

    const platform = schedule.account.platform as Platform;

    const job = await postingPipelineQueue.add('pipeline', {
      scheduleId: schedule.id,
      accountId: schedule.accountId,
      platform,
      style: input.style,
      additionalContext: input.additionalContext,
      autoPublish: input.autoPublish,
    });

    log.info(
      {
        jobId: job.id,
        scheduleId: schedule.id,
        accountId: schedule.accountId,
        platform,
        style: input.style,
        autoPublish: input.autoPublish,
      },
      'Posting pipeline job enqueued'
    );

    return { jobId: job.id, status: 'queued' };
  }
}

export const postingPipelineService = new PostingPipelineService();

// ═══════════════════════════════════════════════════════════════
// Content Service — business logic for AI content management
// ═══════════════════════════════════════════════════════════════

import { prisma } from './database';
import { NotFoundError, ValidationError, createModuleLogger } from '../utils';
import { contentGenerationQueue } from '../jobs/queues';
import type { Platform, ContentType, Tone } from '../config/constants';

const log = createModuleLogger('content-service');

interface GenerateContentInput {
  accountId: string;
  platform: Platform;
  contentType: ContentType;
  topic: string;
  tone: Tone;
  additionalContext?: string;
}

interface ListContentFilter {
  accountId?: string;
  status?: string;
  platform?: string;
  page: number;
  limit: number;
}

class ContentService {
  /**
   * List content with pagination and filters.
   */
  async list(filter: ListContentFilter) {
    const where: Record<string, unknown> = {};
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.status) where.status = filter.status;
    if (filter.platform) where.platform = filter.platform;

    const skip = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.content.findMany({
        where,
        include: {
          account: {
            select: { username: true, platform: true, displayName: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: filter.limit,
      }),
      prisma.content.count({ where }),
    ]);

    return {
      data,
      pagination: {
        page: filter.page,
        limit: filter.limit,
        total,
        totalPages: Math.ceil(total / filter.limit),
      },
    };
  }

  /**
   * Get a single content item by ID.
   */
  async getById(id: string) {
    const content = await prisma.content.findUnique({
      where: { id },
      include: {
        account: { select: { username: true, platform: true, displayName: true } },
        postLogs: { orderBy: { executedAt: 'desc' }, take: 5 },
        analytics: { orderBy: { collectedAt: 'desc' }, take: 1 },
      },
    });

    if (!content) throw new NotFoundError('Content', id);
    return content;
  }

  /**
   * Dispatch an AI content generation job.
   * Returns the job info (async — content will be created by the worker).
   */
  async generate(input: GenerateContentInput) {
    // Verify account exists
    const account = await prisma.account.findUnique({
      where: { id: input.accountId },
      select: { id: true, platform: true, status: true },
    });

    if (!account) throw new NotFoundError('Account', input.accountId);
    if (account.status !== 'active') {
      throw new ValidationError(`Account is ${account.status}, cannot generate content`);
    }

    // Dispatch to BullMQ
    const job = await contentGenerationQueue.add('generate', {
      accountId: input.accountId,
      platform: input.platform,
      config: {
        topic: input.topic,
        contentType: input.contentType,
        tone: input.tone,
        additionalContext: input.additionalContext,
      },
    });

    log.info(
      { jobId: job.id, accountId: input.accountId, platform: input.platform, topic: input.topic },
      'Content generation job dispatched'
    );

    return { jobId: job.id, status: 'queued' };
  }

  /**
   * Approve content for publishing.
   */
  async approve(id: string) {
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundError('Content', id);

    if (content.status !== 'draft') {
      throw new ValidationError(`Cannot approve content with status '${content.status}'. Must be 'draft'.`);
    }

    const updated = await prisma.content.update({
      where: { id },
      data: { status: 'approved' },
    });

    log.info({ contentId: id }, 'Content approved');
    return updated;
  }

  /**
   * Archive content (soft delete).
   */
  async archive(id: string) {
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundError('Content', id);

    const updated = await prisma.content.update({
      where: { id },
      data: { status: 'archived' },
    });

    log.info({ contentId: id }, 'Content archived');
    return updated;
  }

  /**
   * Hard delete content.
   */
  async delete(id: string) {
    const content = await prisma.content.findUnique({ where: { id } });
    if (!content) throw new NotFoundError('Content', id);

    await prisma.content.delete({ where: { id } });
    log.info({ contentId: id }, 'Content deleted');
  }
}

export const contentService = new ContentService();

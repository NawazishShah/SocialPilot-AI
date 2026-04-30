// ═══════════════════════════════════════════════════════════════
// Schedule Service — business logic for posting schedules
// ═══════════════════════════════════════════════════════════════

import { prisma } from './database';
import { NotFoundError, ValidationError, createModuleLogger } from '../utils';
import { CronExpressionParser } from 'cron-parser';

const log = createModuleLogger('schedule-service');

interface CreateScheduleInput {
  accountId: string;
  contentId?: string;
  cronExpression: string;
  timezone?: string;
  contentConfig?: {
    topic: string;
    contentType?: string;
    tone?: string;
    niche?: string;
  };
  maxRuns?: number;
  metadata?: any;
}

interface ListScheduleFilter {
  accountId?: string;
  status?: string;
}

class ScheduleService {
  /**
   * List schedules with optional filters.
   */
  async list(filter: ListScheduleFilter) {
    const where: Record<string, unknown> = {};
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.status) where.status = filter.status;

    return prisma.schedule.findMany({
      where,
      include: {
        account: { select: { username: true, platform: true, displayName: true } },
        content: { select: { id: true, body: true, status: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get a single schedule by ID.
   */
  async getById(id: string) {
    const schedule = await prisma.schedule.findUnique({
      where: { id },
      include: {
        account: { select: { username: true, platform: true, displayName: true } },
        content: true,
        postLogs: { orderBy: { executedAt: 'desc' }, take: 10 },
      },
    });

    if (!schedule) throw new NotFoundError('Schedule', id);
    return schedule;
  }

  /**
   * Create a new posting schedule.
   * If contentId is null, the scheduler will auto-generate content using contentConfig.
   */
  async create(input: CreateScheduleInput) {
    // Verify account exists
    const account = await prisma.account.findUnique({ where: { id: input.accountId } });
    if (!account) throw new NotFoundError('Account', input.accountId);

    // If contentId is provided, verify it exists
    if (input.contentId) {
      const content = await prisma.content.findUnique({ where: { id: input.contentId } });
      if (!content) throw new NotFoundError('Content', input.contentId);
    }

    // Must have either contentId or contentConfig
    if (!input.contentId && !input.contentConfig) {
      throw new ValidationError('Either contentId or contentConfig must be provided');
    }

    // Calculate next run time from cron expression
    const nextRunAt = this.calculateNextRun(input.cronExpression, input.timezone || 'UTC');

    const schedule = await prisma.schedule.create({
      data: {
        accountId: input.accountId,
        contentId: input.contentId,
        cronExpression: input.cronExpression,
        timezone: input.timezone || 'UTC',
        contentConfig: input.contentConfig ?? undefined,
        maxRuns: input.maxRuns,
        nextRunAt,
        status: 'active',
      },
      include: {
        account: { select: { username: true, platform: true } },
      },
    });

    log.info(
      { scheduleId: schedule.id, cron: input.cronExpression, accountId: input.accountId },
      'Schedule created'
    );

    return schedule;
  }

  /**
   * Update a schedule.
   */
  async update(id: string, input: Partial<CreateScheduleInput>) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Schedule', id);

    const data: Record<string, unknown> = {};
    if (input.cronExpression) {
      data.cronExpression = input.cronExpression;
      data.nextRunAt = this.calculateNextRun(input.cronExpression, input.timezone || existing.timezone);
    }
    if (input.timezone) data.timezone = input.timezone;
    if (input.contentConfig !== undefined) data.contentConfig = input.contentConfig;
    if (input.contentId !== undefined) data.contentId = input.contentId;
    if (input.maxRuns !== undefined) data.maxRuns = input.maxRuns;
    if ((input as any).metadata !== undefined) data.metadata = (input as any).metadata;

    const schedule = await prisma.schedule.update({ where: { id }, data });
    log.info({ scheduleId: id }, 'Schedule updated');
    return schedule;
  }

  /**
   * Pause a schedule (stops future executions).
   */
  async pause(id: string) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Schedule', id);
    if (existing.status !== 'active') {
      throw new ValidationError(`Cannot pause schedule with status '${existing.status}'`);
    }

    const schedule = await prisma.schedule.update({
      where: { id },
      data: { status: 'paused' },
    });

    log.info({ scheduleId: id }, 'Schedule paused');
    return schedule;
  }

  /**
   * Resume a paused schedule.
   */
  async resume(id: string) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Schedule', id);
    if (existing.status !== 'paused') {
      throw new ValidationError(`Cannot resume schedule with status '${existing.status}'`);
    }

    const nextRunAt = this.calculateNextRun(
      existing.cronExpression || '0 9 * * *',
      existing.timezone
    );

    const schedule = await prisma.schedule.update({
      where: { id },
      data: { status: 'active', nextRunAt },
    });

    log.info({ scheduleId: id }, 'Schedule resumed');
    return schedule;
  }

  /**
   * Delete a schedule.
   */
  async delete(id: string) {
    const existing = await prisma.schedule.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Schedule', id);

    await prisma.schedule.delete({ where: { id } });
    log.info({ scheduleId: id }, 'Schedule deleted');
  }

  /**
   * Find all schedules that are due to run.
   * Called by the scheduler engine on each cron tick.
   */
  async findDueSchedules() {
    return prisma.schedule.findMany({
      where: {
        status: 'active',
        nextRunAt: { lte: new Date() },
      },
      include: {
        account: { select: { id: true, platform: true, username: true, status: true } },
        content: { select: { id: true, status: true } },
      },
    });
  }

  /**
   * Mark a schedule as executed and advance the next run time.
   */
  async markExecuted(id: string) {
    const schedule = await prisma.schedule.findUnique({ where: { id } });
    if (!schedule) return;

    const newRunCount = schedule.runCount + 1;
    const isCompleted = schedule.maxRuns !== null && newRunCount >= schedule.maxRuns;

    await prisma.schedule.update({
      where: { id },
      data: {
        runCount: newRunCount,
        lastRunAt: new Date(),
        nextRunAt: isCompleted
          ? null
          : this.calculateNextRun(schedule.cronExpression || '0 9 * * *', schedule.timezone),
        status: isCompleted ? 'completed' : 'active',
      },
    });
  }

  private calculateNextRun(cronExpression: string, timezone: string): Date {
    try {
      const interval = CronExpressionParser.parse(cronExpression, { tz: timezone });
      return interval.next().toDate();
    } catch (err) {
      log.error({ err, cronExpression, timezone }, 'Failed to parse cron expression, falling back to 1h');
      return new Date(Date.now() + 60 * 60 * 1000);
    }
  }
}

export const scheduleService = new ScheduleService();

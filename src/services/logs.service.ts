import { prisma } from './database';

interface ListLogsFilter {
  accountId?: string;
  scheduleId?: string;
  contentId?: string;
  status?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

class LogsService {
  async list(filter: ListLogsFilter) {
    const where: Record<string, unknown> = {};
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.scheduleId) where.scheduleId = filter.scheduleId;
    if (filter.contentId) where.contentId = filter.contentId;
    if (filter.status) where.status = filter.status;

    if (filter.from || filter.to) {
      where.executedAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    const skip = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.postLog.findMany({
        where,
        include: {
          account: { select: { id: true, username: true, platform: true, displayName: true } },
          content: { select: { id: true, platform: true, status: true, body: true } },
        },
        orderBy: { executedAt: 'desc' },
        skip,
        take: filter.limit,
      }),
      prisma.postLog.count({ where }),
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
}

export const logsService = new LogsService();

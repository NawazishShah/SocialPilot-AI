import { prisma } from './database';

interface ListAnalyticsFilter {
  accountId?: string;
  contentId?: string;
  from?: Date;
  to?: Date;
  page: number;
  limit: number;
}

class AnalyticsService {
  async list(filter: ListAnalyticsFilter) {
    const where: Record<string, unknown> = {};
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.contentId) where.contentId = filter.contentId;

    if (filter.from || filter.to) {
      where.collectedAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    const skip = (filter.page - 1) * filter.limit;

    const [data, total] = await Promise.all([
      prisma.analytics.findMany({
        where,
        include: {
          content: { select: { id: true, platform: true, status: true } },
          account: { select: { id: true, username: true, platform: true, displayName: true } },
        },
        orderBy: { collectedAt: 'desc' },
        skip,
        take: filter.limit,
      }),
      prisma.analytics.count({ where }),
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

  async summary(filter: { accountId?: string; from?: Date; to?: Date }) {
    const where: Record<string, unknown> = {};
    if (filter.accountId) where.accountId = filter.accountId;
    if (filter.from || filter.to) {
      where.collectedAt = {
        ...(filter.from ? { gte: filter.from } : {}),
        ...(filter.to ? { lte: filter.to } : {}),
      };
    }

    const result = await prisma.analytics.aggregate({
      where,
      _sum: {
        impressions: true,
        likes: true,
        comments: true,
        shares: true,
        clicks: true,
      },
      _avg: {
        engagementRate: true,
      },
      _count: {
        _all: true,
      },
    });

    return {
      totals: {
        impressions: result._sum.impressions ?? 0,
        likes: result._sum.likes ?? 0,
        comments: result._sum.comments ?? 0,
        shares: result._sum.shares ?? 0,
        clicks: result._sum.clicks ?? 0,
      },
      averages: {
        engagementRate: result._avg.engagementRate ?? null,
      },
      count: result._count._all,
    };
  }
}

export const analyticsService = new AnalyticsService();

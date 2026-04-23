import { v4 as uuidv4 } from 'uuid';
import { getRedisConnection } from '../config/redis';
import type { Platform } from '../config/constants';

const TOPICS_KEY = 'topics:list';

export interface TopicItem {
  id: string;
  text: string;
  platform: Platform | null;
  createdAt: string;
}

interface ListTopicsFilter {
  q?: string;
  platform?: Platform;
  page: number;
  limit: number;
}

class TopicsService {
  async create(input: { text: string; platform?: Platform | null }): Promise<TopicItem> {
    const redis = getRedisConnection();

    const item: TopicItem = {
      id: uuidv4(),
      text: input.text.trim(),
      platform: input.platform ?? null,
      createdAt: new Date().toISOString(),
    };

    await redis.lpush(TOPICS_KEY, JSON.stringify(item));

    return item;
  }

  async list(filter: ListTopicsFilter): Promise<{ data: TopicItem[]; pagination: any }> {
    const redis = getRedisConnection();

    const raw = await redis.lrange(TOPICS_KEY, 0, 5000);
    const parsed: TopicItem[] = raw
      .map((s) => {
        try {
          return JSON.parse(s) as TopicItem;
        } catch {
          return null;
        }
      })
      .filter((x): x is TopicItem => Boolean(x));

    const q = filter.q?.trim().toLowerCase();
    let items = parsed;

    if (q) {
      items = items.filter((t) => t.text.toLowerCase().includes(q));
    }

    if (filter.platform) {
      items = items.filter((t) => t.platform === filter.platform);
    }

    const total = items.length;
    const start = (filter.page - 1) * filter.limit;
    const end = start + filter.limit;
    const data = items.slice(start, end);

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

  async delete(id: string): Promise<void> {
    const redis = getRedisConnection();

    const raw = await redis.lrange(TOPICS_KEY, 0, 5000);
    const remaining: string[] = [];

    for (const s of raw) {
      try {
        const item = JSON.parse(s) as TopicItem;
        if (item.id !== id) remaining.push(s);
      } catch {
        remaining.push(s);
      }
    }

    const pipeline = redis.multi();
    pipeline.del(TOPICS_KEY);
    if (remaining.length > 0) {
      pipeline.rpush(TOPICS_KEY, ...remaining.reverse());
    }
    await pipeline.exec();
  }
}

export const topicsService = new TopicsService();

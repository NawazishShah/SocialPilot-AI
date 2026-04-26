import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { topicsService } from '../../services/topics.service';
import { PLATFORMS } from '../../config/constants';

const createTopicSchema = z.object({
  text: z.string().min(1).max(500),
  platform: z.enum(PLATFORMS).nullable().optional(),
});

export async function listTopics(req: Request, res: Response, next: NextFunction) {
  try {
    const { q, platform, page = '1', limit = '50' } = req.query;

    const qCandidate = Array.isArray(q) ? q[0] : q;
    const qValue = typeof qCandidate === 'string' ? qCandidate : undefined;

    const platformCandidate = Array.isArray(platform) ? platform[0] : platform;
    const platformValue = typeof platformCandidate === 'string' ? platformCandidate : undefined;
    const parsedPlatform = platformValue
      ? z.enum(PLATFORMS).optional().parse(platformValue)
      : undefined;

    const result = await topicsService.list({
      q: qValue,
      platform: parsedPlatform,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function createTopic(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createTopicSchema.parse(req.body);
    const item = await topicsService.create({ text: data.text, platform: data.platform ?? null });
    res.status(201).json({ data: item });
  } catch (err) {
    next(err);
  }
}

export async function deleteTopic(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    await topicsService.delete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

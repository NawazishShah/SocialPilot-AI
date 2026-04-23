import { Request, Response, NextFunction } from 'express';
import { analyticsService } from '../../services/analytics.service';

export async function listAnalytics(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, contentId, from, to, page = '1', limit = '50' } = req.query;

    const result = await analyticsService.list({
      accountId: accountId as string | undefined,
      contentId: contentId as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });

    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getSummary(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, from, to } = req.query;

    const data = await analyticsService.summary({
      accountId: accountId as string | undefined,
      from: from ? new Date(from as string) : undefined,
      to: to ? new Date(to as string) : undefined,
    });

    res.json({ data });
  } catch (err) {
    next(err);
  }
}

import { Request, Response, NextFunction } from 'express';
import { logsService } from '../../services/logs.service';

export async function listLogs(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, scheduleId, contentId, status, from, to, page = '1', limit = '50' } = req.query;

    const result = await logsService.list({
      accountId: accountId as string | undefined,
      scheduleId: scheduleId as string | undefined,
      contentId: contentId as string | undefined,
      status: status as string | undefined,
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

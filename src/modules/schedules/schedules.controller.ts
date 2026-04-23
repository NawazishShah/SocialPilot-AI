// ═══════════════════════════════════════════════════════════════
// Schedules Module — Controller
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { scheduleService } from '../../services/schedule.service';
import { z } from 'zod';
import { PLATFORMS, CONTENT_TYPES, TONES } from '../../config/constants';

// ─── Validation Schemas ──────────────────────────────────────

const createScheduleSchema = z.object({
  accountId: z.string().uuid(),
  contentId: z.string().uuid().optional(),
  cronExpression: z.string().min(9).max(100), // e.g. '0 9 * * *'
  timezone: z.string().default('UTC'),
  contentConfig: z
    .object({
      topic: z.string(),
      contentType: z.enum(CONTENT_TYPES).default('text'),
      tone: z.enum(TONES).default('professional'),
      niche: z.string().optional(),
    })
    .optional(),
  maxRuns: z.number().int().positive().optional(),
});

const updateScheduleSchema = createScheduleSchema.partial();

// ─── Handlers ────────────────────────────────────────────────

export async function listSchedules(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, status } = req.query;
    const schedules = await scheduleService.list({
      accountId: accountId as string | undefined,
      status: status as string | undefined,
    });
    res.json({ data: schedules, count: schedules.length });
  } catch (err) {
    next(err);
  }
}

export async function getSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.getById(req.params.id);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function createSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createScheduleSchema.parse(req.body);
    const schedule = await scheduleService.create(data);
    res.status(201).json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateScheduleSchema.parse(req.body);
    const schedule = await scheduleService.update(req.params.id, data);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function pauseSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.pause(req.params.id);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function resumeSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const schedule = await scheduleService.resume(req.params.id);
    res.json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function deleteSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    await scheduleService.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

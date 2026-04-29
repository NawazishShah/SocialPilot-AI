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
  // Support both direct cron and cadence-based
  cronExpression: z.string().min(5).max(100).optional(),
  cadence: z.enum(['hourly', 'daily', 'random']).optional(),
  dailyHour: z.number().min(0).max(23).optional(),
  dailyMinute: z.number().min(0).max(59).optional(),
  timezone: z.string().default('UTC'),
  autoPublish: z.boolean().default(true),
  contentConfig: z
    .object({
      topic: z.string(),
      contentType: z.enum(CONTENT_TYPES).default('text'),
      tone: z.string().default('professional'), // Changed from enum to string for flexibility
      niche: z.string().optional(),
    })
    .optional(),
  maxRuns: z.number().int().positive().optional(),
});

const updateScheduleSchema = createScheduleSchema.partial();

// ─── Helpers ────────────────────────────────────────────────

function convertCadenceToCron(data: any): string {
  if (data.cronExpression) return data.cronExpression;
  
  switch (data.cadence) {
    case 'hourly':
      return '0 * * * *'; // Top of every hour
    case 'daily':
      const hour = data.dailyHour ?? 9;
      const minute = data.dailyMinute ?? 0;
      return `${minute} ${hour} * * *`;
    case 'random':
      // Random daily between 9am and 9pm
      const rHour = Math.floor(Math.random() * (21 - 9 + 1)) + 9;
      const rMin = Math.floor(Math.random() * 60);
      return `${rMin} ${rHour} * * *`;
    default:
      return '0 9 * * *'; // Default to 9am daily
  }
}

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
    const validated = createScheduleSchema.parse(req.body);
    
    // Prepare data for service
    const serviceInput = {
      ...validated,
      cronExpression: convertCadenceToCron(validated),
      metadata: {
        autoPublish: validated.autoPublish,
        cadence: validated.cadence,
        dailyHour: validated.dailyHour,
        dailyMinute: validated.dailyMinute,
      }
    };

    const schedule = await scheduleService.create(serviceInput as any);
    res.status(201).json({ data: schedule });
  } catch (err) {
    next(err);
  }
}

export async function updateSchedule(req: Request, res: Response, next: NextFunction) {
  try {
    const validated = updateScheduleSchema.parse(req.body);
    
    // Prepare data for service
    const serviceInput: any = { ...validated };
    
    if (validated.cadence || validated.dailyHour !== undefined || validated.dailyMinute !== undefined || validated.cronExpression) {
      serviceInput.cronExpression = convertCadenceToCron(validated);
    }

    if (validated.autoPublish !== undefined || validated.cadence || validated.dailyHour !== undefined || validated.dailyMinute !== undefined) {
      serviceInput.metadata = {
        autoPublish: validated.autoPublish,
        cadence: validated.cadence,
        dailyHour: validated.dailyHour,
        dailyMinute: validated.dailyMinute,
      };
    }

    const schedule = await scheduleService.update(req.params.id, serviceInput);
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

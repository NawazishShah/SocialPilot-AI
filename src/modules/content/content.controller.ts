// ═══════════════════════════════════════════════════════════════
// Content Module — Controller
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { contentService } from '../../services/content.service';
import { z } from 'zod';
import { PLATFORMS, CONTENT_TYPES, TONES } from '../../config/constants';

// ─── Validation Schemas ──────────────────────────────────────

const generateContentSchema = z.object({
  accountId: z.string().uuid(),
  platform: z.enum(PLATFORMS),
  contentType: z.enum(CONTENT_TYPES).default('text'),
  topic: z.string().min(1).max(500),
  tone: z.enum(TONES).default('professional'),
  additionalContext: z.string().max(2000).optional(),
});

// ─── Handlers ────────────────────────────────────────────────

export async function listContent(req: Request, res: Response, next: NextFunction) {
  try {
    const { accountId, status, platform, page = '1', limit = '20' } = req.query;

    const accountIdCandidate = Array.isArray(accountId) ? accountId[0] : accountId;
    const statusCandidate = Array.isArray(status) ? status[0] : status;
    const platformCandidate = Array.isArray(platform) ? platform[0] : platform;

    const accountIdValue = typeof accountIdCandidate === 'string' ? accountIdCandidate : undefined;
    const statusValue = typeof statusCandidate === 'string' ? statusCandidate : undefined;
    const platformValue = typeof platformCandidate === 'string' ? platformCandidate : undefined;

    const result = await contentService.list({
      accountId: accountIdValue,
      status: statusValue,
      platform: platformValue,
      page: parseInt(page as string, 10),
      limit: parseInt(limit as string, 10),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

export async function getContent(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    const content = await contentService.getById(id);
    res.json({ data: content });
  } catch (err) {
    next(err);
  }
}

export async function generateContent(req: Request, res: Response, next: NextFunction) {
  try {
    const data = generateContentSchema.parse(req.body);
    const result = await contentService.generate(data);
    res.status(202).json({
      message: 'Content generation job dispatched',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function approveContent(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    const content = await contentService.approve(id);
    res.json({ data: content });
  } catch (err) {
    next(err);
  }
}

export async function archiveContent(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    const content = await contentService.archive(id);
    res.json({ data: content });
  } catch (err) {
    next(err);
  }
}

export async function rejectContent(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    const content = await contentService.archive(id);
    res.json({ data: content });
  } catch (err) {
    next(err);
  }
}

export async function deleteContent(req: Request, res: Response, next: NextFunction) {
  try {
    const idCandidate = (req.params as Record<string, unknown>).id;
    const id = typeof idCandidate === 'string' ? idCandidate : '';
    await contentService.delete(id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

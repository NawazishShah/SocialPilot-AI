// ═══════════════════════════════════════════════════════════════
// Accounts Module — Controller
// ═══════════════════════════════════════════════════════════════

import { Request, Response, NextFunction } from 'express';
import { accountService } from '../../services/account.service';
import { z } from 'zod';
import { PLATFORMS } from '../../config/constants';

// ─── Validation Schemas ──────────────────────────────────────

const createAccountSchema = z.object({
  platform: z.enum(PLATFORMS),
  username: z.string().min(1).max(100),
  displayName: z.string().max(200).optional(),
  credentials: z.record(z.string()), // { email, password } or { token }
  proxyConfig: z
    .object({
      host: z.string(),
      port: z.number(),
      username: z.string().optional(),
      password: z.string().optional(),
    })
    .optional(),
});

const updateAccountSchema = createAccountSchema.partial();

// ─── Handlers ────────────────────────────────────────────────

export async function listAccounts(req: Request, res: Response, next: NextFunction) {
  try {
    const { platform, status } = req.query;
    const accounts = await accountService.list({
      platform: platform as string | undefined,
      status: status as string | undefined,
    });
    res.json({ data: accounts, count: accounts.length });
  } catch (err) {
    next(err);
  }
}

export async function getAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const account = await accountService.getById(req.params.id);
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
}

export async function createAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = createAccountSchema.parse(req.body);
    const account = await accountService.create(data);
    res.status(201).json({ data: account });
  } catch (err) {
    next(err);
  }
}

export async function updateAccount(req: Request, res: Response, next: NextFunction) {
  try {
    const data = updateAccountSchema.parse(req.body);
    const account = await accountService.update(req.params.id, data);
    res.json({ data: account });
  } catch (err) {
    next(err);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.delete(req.params.id);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function triggerHealthCheck(req: Request, res: Response, next: NextFunction) {
  try {
    await accountService.triggerHealthCheck(req.params.id);
    res.json({ message: 'Health check job dispatched' });
  } catch (err) {
    next(err);
  }
}

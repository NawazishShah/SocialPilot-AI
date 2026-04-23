// ═══════════════════════════════════════════════════════════════
// Account Service — business logic for social media accounts
// ═══════════════════════════════════════════════════════════════

import { prisma } from './database';
import { encrypt, decrypt, NotFoundError, ConflictError, createModuleLogger } from '../utils';
import { contentGenerationQueue } from '../jobs/queues';
import { QUEUE_NAMES } from '../config/constants';

const log = createModuleLogger('account-service');

interface CreateAccountInput {
  platform: string;
  username: string;
  displayName?: string;
  credentials: Record<string, string>;
  proxyConfig?: { host: string; port: number; username?: string; password?: string };
}

interface ListAccountsFilter {
  platform?: string;
  status?: string;
}

class AccountService {
  /**
   * List accounts with optional filters.
   * Credentials are NEVER returned in list responses.
   */
  async list(filter: ListAccountsFilter) {
    const where: Record<string, unknown> = {};
    if (filter.platform) where.platform = filter.platform;
    if (filter.status) where.status = filter.status;

    const accounts = await prisma.account.findMany({
      where,
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        lastHealthAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { content: true, schedules: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return accounts;
  }

  /**
   * Get a single account by ID (without credentials).
   */
  async getById(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        proxyConfig: true,
        lastHealthAt: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { content: true, schedules: true, postLogs: true } },
      },
    });

    if (!account) throw new NotFoundError('Account', id);
    return account;
  }

  /**
   * Create a new account. Credentials are encrypted before storage.
   */
  async create(input: CreateAccountInput) {
    // Check for duplicate
    const existing = await prisma.account.findUnique({
      where: { platform_username: { platform: input.platform, username: input.username } },
    });

    if (existing) {
      throw new ConflictError(`Account @${input.username} on ${input.platform} already exists`);
    }

    // Encrypt credentials
    const encryptedCredentials = encrypt(JSON.stringify(input.credentials), `account:${input.username}`);

    const account = await prisma.account.create({
      data: {
        platform: input.platform,
        username: input.username,
        displayName: input.displayName,
        credentials: encryptedCredentials,
        proxyConfig: input.proxyConfig ?? undefined,
        status: 'active',
      },
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        createdAt: true,
      },
    });

    log.info({ accountId: account.id, platform: input.platform, username: input.username }, 'Account created');
    return account;
  }

  /**
   * Update an account. Re-encrypts credentials if provided.
   */
  async update(id: string, input: Partial<CreateAccountInput>) {
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Account', id);

    const data: Record<string, unknown> = {};
    if (input.displayName !== undefined) data.displayName = input.displayName;
    if (input.proxyConfig !== undefined) data.proxyConfig = input.proxyConfig;
    if (input.credentials) {
      data.credentials = encrypt(JSON.stringify(input.credentials), `account:${existing.username}`);
    }

    const account = await prisma.account.update({
      where: { id },
      data,
      select: {
        id: true,
        platform: true,
        username: true,
        displayName: true,
        status: true,
        updatedAt: true,
      },
    });

    log.info({ accountId: id }, 'Account updated');
    return account;
  }

  /**
   * Delete an account and all related data (cascade).
   */
  async delete(id: string) {
    const existing = await prisma.account.findUnique({ where: { id } });
    if (!existing) throw new NotFoundError('Account', id);

    await prisma.account.delete({ where: { id } });
    log.info({ accountId: id, platform: existing.platform, username: existing.username }, 'Account deleted');
  }

  /**
   * Get decrypted credentials for a specific account (internal use only).
   */
  async getCredentials(id: string): Promise<Record<string, string>> {
    const account = await prisma.account.findUnique({
      where: { id },
      select: { credentials: true, username: true },
    });

    if (!account) throw new NotFoundError('Account', id);

    const decrypted = decrypt(account.credentials, `account:${account.username}`);
    return JSON.parse(decrypted);
  }

  /**
   * Dispatch an account health check job to the queue.
   */
  async triggerHealthCheck(id: string) {
    const account = await prisma.account.findUnique({
      where: { id },
      select: { id: true, platform: true },
    });

    if (!account) throw new NotFoundError('Account', id);

    // In a full implementation, this would dispatch to the account-health queue.
    // For now, we update the timestamp directly.
    await prisma.account.update({
      where: { id },
      data: { lastHealthAt: new Date() },
    });

    log.info({ accountId: id }, 'Health check triggered');
  }
}

export const accountService = new AccountService();

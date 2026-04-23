import path from 'path';
import { promises as fs } from 'fs';
import type { BrowserContext, Locator, Page } from 'playwright';
import type { Platform } from '../config/constants';
import { browserManager } from './browser-manager';
import { getAdapter, type PostResult } from './adapters';
import { createModuleLogger } from '../utils';
import {
  moveMouseHumanLike,
  randomDelayBetweenActions,
  scrollHumanLike,
  simulateHumanTyping,
} from './human';

const log = createModuleLogger('social-media-poster');

export interface PosterCredentials {
  username?: string;
  email?: string;
  password: string;
}

export interface CreatePostInput {
  text: string;
}

export interface PosterOptions {
  sessionDir?: string;
  sessionFileName?: string;
}

export class SocialMediaPoster {
  private readonly accountId: string;
  private readonly platform: Platform;
  private readonly credentials: PosterCredentials;
  private readonly options: PosterOptions;

  constructor(params: {
    accountId: string;
    platform: Platform;
    credentials: PosterCredentials;
    options?: PosterOptions;
  }) {
    this.accountId = params.accountId;
    this.platform = params.platform;
    this.credentials = params.credentials;
    this.options = params.options ?? {};
  }

  private getSessionDir(): string {
    return this.options.sessionDir ?? path.resolve(process.cwd(), 'sessions');
  }

  private getSessionPath(): string {
    const file = this.options.sessionFileName ?? `${this.platform}_${this.accountId}.json`;
    return path.join(this.getSessionDir(), file);
  }

  async loginWithSession(): Promise<{ context: BrowserContext; page: Page }> {
    const sessionPath = this.getSessionPath();
    const sessionDir = this.getSessionDir();
    await fs.mkdir(sessionDir, { recursive: true });

    const hasSession = await fs
      .access(sessionPath)
      .then(() => true)
      .catch(() => false);

    const context = await browserManager.acquireContext(this.accountId, {
      storageStatePath: hasSession ? sessionPath : undefined,
    });

    const page = await context.newPage();
    const adapter = getAdapter(this.platform);

    await this.applyStealthWarmup(page);

    const valid = await adapter.isSessionValid(page);
    if (!valid) {
      log.info({ accountId: this.accountId, platform: this.platform }, 'Session invalid; performing login');
      await adapter.login(page, this.credentials as unknown as Record<string, string>);
      await this.saveSession(context);
    } else {
      log.info({ accountId: this.accountId, platform: this.platform }, 'Session valid; continuing');
    }

    return { context, page };
  }

  async saveSession(context: BrowserContext): Promise<void> {
    const sessionPath = this.getSessionPath();
    const sessionDir = this.getSessionDir();
    await fs.mkdir(sessionDir, { recursive: true });
    await browserManager.saveStorageState(context, sessionPath);
  }

  async createPost(content: CreatePostInput): Promise<PostResult> {
    const { context, page } = await this.loginWithSession();
    const adapter = getAdapter(this.platform);

    try {
      await this.applyStealthWarmup(page);
      await randomDelayBetweenActions(600, 1600);
      const result = await adapter.publishText(page, content.text);
      await randomDelayBetweenActions(1200, 2600);
      await this.saveSession(context);
      return result;
    } finally {
      await page.close().catch(() => undefined);
      await browserManager.releaseContext(this.accountId);
    }
  }

  async simulateHumanTyping(pageOrLocator: Page | Locator, text: string): Promise<void> {
    await simulateHumanTyping(pageOrLocator, text);
  }

  async randomDelayBetweenActions(minMs?: number, maxMs?: number): Promise<void> {
    await randomDelayBetweenActions(minMs, maxMs);
  }

  private async applyStealthWarmup(page: Page): Promise<void> {
    if (Math.random() < 0.6) {
      await moveMouseHumanLike(page);
    }

    if (Math.random() < 0.4) {
      await scrollHumanLike(page);
    }

    await randomDelayBetweenActions(200, 900);
  }
}

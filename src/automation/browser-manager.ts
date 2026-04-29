// ═══════════════════════════════════════════════════════════════
// Browser Manager — Playwright browser pool management
// ═══════════════════════════════════════════════════════════════

import { chromium, Browser, BrowserContext } from 'playwright';
import { browserConfig } from '../config';
import { createModuleLogger } from '../utils';

const log = createModuleLogger('browser-manager');

interface ContextEntry {
  context: BrowserContext;
  accountId: string;
  createdAt: Date;
  inUse: boolean;
}

class BrowserManager {
  private browser: Browser | null = null;
  private contexts: Map<string, ContextEntry> = new Map();

  /**
   * Initialize the browser instance (call once at startup).
   */
  async initialize(): Promise<void> {
    if (this.browser) return;

    this.browser = await chromium.launch({
      headless: browserConfig.headless,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--disable-dev-shm-usage',
        '--no-sandbox',
      ],
    });

    log.info({ headless: browserConfig.headless }, '🌐 Browser launched');
  }

  /**
   * Acquire a browser context for an account.
   * Reuses existing context if available, otherwise creates a new one.
   */
  async acquireContext(accountId: string, options?: { storageStatePath?: string }): Promise<BrowserContext> {
    await this.initialize();

    // Reuse existing context if not in use
    const existing = this.contexts.get(accountId);
    if (existing && !existing.inUse) {
      existing.inUse = true;
      log.debug({ accountId }, 'Reusing existing browser context');
      return existing.context;
    }

    // Check pool limit
    const activeCount = Array.from(this.contexts.values()).filter((c) => c.inUse).length;
    if (activeCount >= browserConfig.maxContexts) {
      throw new Error(
        `Browser context pool exhausted (${activeCount}/${browserConfig.maxContexts}). Try again later.`
      );
    }

    // Create new context
    const context = await this.browser!.newContext({
      storageState: options?.storageStatePath,
      javaScriptEnabled: true,
      viewport: { width: 1280, height: 720 },
    });

    // Inject anti-detection scripts
    await context.addInitScript(() => {
      // Override navigator.webdriver
      Object.defineProperty(navigator, 'webdriver', { get: () => false });
    });

    this.contexts.set(accountId, {
      context,
      accountId,
      createdAt: new Date(),
      inUse: true,
    });

    log.info({ accountId, totalContexts: this.contexts.size }, 'New browser context created');
    return context;
  }

  /**
   * Persist a browser context session to disk.
   */
  async saveStorageState(context: BrowserContext, storageStatePath: string): Promise<void> {
    await context.storageState({ path: storageStatePath });
  }

  /**
   * Release a browser context back to the pool.
   */
  async releaseContext(accountId: string): Promise<void> {
    const entry = this.contexts.get(accountId);
    if (entry) {
      entry.inUse = false;
      log.debug({ accountId }, 'Browser context released');
    }
  }

  /**
   * Destroy a specific context (on auth failure, etc.).
   */
  async destroyContext(accountId: string): Promise<void> {
    const entry = this.contexts.get(accountId);
    if (entry) {
      await entry.context.close();
      this.contexts.delete(accountId);
      log.info({ accountId }, 'Browser context destroyed');
    }
  }

  /**
   * Shut down the browser and all contexts.
   */
  async shutdown(): Promise<void> {
    for (const [accountId, entry] of this.contexts) {
      await entry.context.close();
      this.contexts.delete(accountId);
    }

    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }

    log.info('🌐 Browser shut down');
  }

  /**
   * Get pool status for health checks.
   */
  getStatus() {
    const entries = Array.from(this.contexts.values());
    return {
      browserActive: !!this.browser,
      totalContexts: entries.length,
      activeContexts: entries.filter((e) => e.inUse).length,
      idleContexts: entries.filter((e) => !e.inUse).length,
      maxContexts: browserConfig.maxContexts,
    };
  }
}

export const browserManager = new BrowserManager();

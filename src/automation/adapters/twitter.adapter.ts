// ═══════════════════════════════════════════════════════════════
// Twitter/X Adapter — browser automation for posting on Twitter
// ═══════════════════════════════════════════════════════════════

import { Page } from 'playwright';
import { PlatformAdapter, PostResult } from './index';
import { createModuleLogger, sleep, randomDelay } from '../../utils';

const log = createModuleLogger('twitter-adapter');

export class TwitterAdapter implements PlatformAdapter {
  platform = 'twitter' as const;

  /**
   * Login to Twitter using email/username and password.
   */
  async login(page: Page, credentials: Record<string, string>): Promise<void> {
    log.info('Navigating to Twitter login...');

    await page.goto('https://twitter.com/i/flow/login', { waitUntil: 'networkidle' });
    await sleep(randomDelay(1500, 3000));

    // Enter username/email
    const usernameInput = page.locator('input[autocomplete="username"]');
    await usernameInput.waitFor({ state: 'visible', timeout: 10000 });
    await usernameInput.fill(credentials.email || credentials.username || '');
    await sleep(randomDelay(500, 1000));

    // Click "Next"
    await page.locator('text=Next').click();
    await sleep(randomDelay(1500, 2500));

    // Handle potential "Enter your username" challenge
    const usernameChallenge = page.locator('input[data-testid="ocfEnterTextTextInput"]');
    if (await usernameChallenge.isVisible({ timeout: 3000 }).catch(() => false)) {
      log.info('Username challenge detected, entering username...');
      await usernameChallenge.fill(credentials.username || '');
      await page.locator('text=Next').click();
      await sleep(randomDelay(1500, 2500));
    }

    // Enter password
    const passwordInput = page.locator('input[type="password"]');
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(credentials.password || '');
    await sleep(randomDelay(500, 1000));

    // Click "Log in"
    await page.locator('[data-testid="LoginForm_Login_Button"]').click();
    await sleep(randomDelay(3000, 5000));

    // Verify login success
    await page.waitForURL('https://twitter.com/home', { timeout: 15000 });
    log.info('✅ Twitter login successful');
  }

  /**
   * Publish a text post on Twitter.
   */
  async publishText(page: Page, content: string): Promise<PostResult> {
    log.info('Composing tweet...');

    // Navigate to home if not already there
    if (!page.url().includes('twitter.com/home')) {
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle' });
      await sleep(randomDelay(1500, 3000));
    }

    //Click the compose area
    const composeArea = page.locator('[data-testid="tweetTextarea_0"]');
    await composeArea.waitFor({ state: 'visible', timeout: 10000 });
    await composeArea.click();
    await sleep(randomDelay(500, 1000));

    // Type content with human-like delays
    for (const char of content) {
      await page.keyboard.type(char, { delay: randomDelay(30, 100) });
    }

    await sleep(randomDelay(1000, 2000));

    // Click "Post" button
    const postButton = page.locator('[data-testid="tweetButtonInline"]');
    await postButton.waitFor({ state: 'visible', timeout: 5000 });
    await postButton.click();

    await sleep(randomDelay(3000, 5000));

    log.info('✅ Tweet posted');

    // Try to capture the post URL (best effort)
    // Twitter doesn't always redirect — return null for now
    return { postUrl: null, success: true };
  }

  /**
   * Check if the current session is still valid.
   */
  async isSessionValid(page: Page): Promise<boolean> {
    try {
      await page.goto('https://twitter.com/home', { waitUntil: 'networkidle', timeout: 10000 });
      const url = page.url();
      return url.includes('/home') && !url.includes('/login');
    } catch {
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════
// Post Publishing Processor
// Handles browser automation to publish content on social media
// ═══════════════════════════════════════════════════════════════

import { Job } from 'bullmq';
import { prisma } from '../../services/database';
import { browserManager } from '../../automation/browser-manager';
import { getAdapter } from '../../automation/adapters';
import { accountService } from '../../services/account.service';
import { createModuleLogger } from '../../utils';
import type { Platform } from '../../config/constants';

const log = createModuleLogger('post-publish-processor');

interface PublishJobData {
  contentId: string;
  accountId: string;
  platform: Platform;
  scheduleId?: string;
}

export async function processPostPublishing(job: Job<PublishJobData>) {
  const { contentId, accountId, platform, scheduleId } = job.data;
  const startTime = Date.now();

  log.info({ jobId: job.id, contentId, platform, attempt: job.attemptsMade + 1 }, 'Publishing post...');

  let context: any = null;
  let postUrl: string | null = null;
  let screenshotPath: string | null = null;

  try {
    // ─── Step 1: Load content & credentials ───────────────────
    const content = await prisma.content.findUnique({ where: { id: contentId } });
    if (!content) {
      throw new Error(`Content ${contentId} not found`);
    }

    const credentials = await accountService.getCredentials(accountId);

    // ─── Step 2: Get browser context ──────────────────────────
    context = await browserManager.acquireContext(accountId);

    const page = await context.newPage();
    const adapter = getAdapter(platform);

    try {
      // ─── Step 3: Login if session is not valid ────────────────
      const isSessionValid = await adapter.isSessionValid(page);
      if (!isSessionValid) {
        log.info({ accountId, platform }, 'Session expired, logging in...');
        await adapter.login(page, credentials);
      }

      // ─── Step 4: Publish the content ─────────────────────────
      const result = await adapter.publishText(page, content.body);
      postUrl = result.postUrl;

      // ─── Step 5: Take proof screenshot ───────────────────────
      screenshotPath = `./screenshots/${platform}_${contentId}_${Date.now()}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: false });
    } finally {
      await page.close();
    }

    const durationMs = Date.now() - startTime;

    // ─── Step 6: Update content status ────────────────────────
    await prisma.content.update({
      where: { id: contentId },
      data: {
        status: 'published',
        publishedAt: new Date(),
        postUrl,
      },
    });

    // ─── Step 7: Log the result ───────────────────────────────
    await prisma.postLog.create({
      data: {
        contentId,
        accountId,
        scheduleId: scheduleId || null,
        jobId: job.id ?? null,
        status: 'success',
        screenshotPath,
        durationMs,
        attemptNumber: job.attemptsMade + 1,
      },
    });

    log.info({ contentId, postUrl, durationMs, attempt: job.attemptsMade + 1 }, '✅ Post published successfully');

    return { contentId, postUrl, durationMs };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const durationMs = Date.now() - startTime;

    // ─── Update content status to failed ───────────────────────
    try {
      await prisma.content.update({
        where: { id: contentId },
        data: { status: 'failed' },
      });
    } catch (updateErr) {
      log.error({ err: updateErr, contentId }, 'Failed to update content status to failed');
    }

    // ─── Log the failure ───────────────────────────────────────
    try {
      await prisma.postLog.create({
        data: {
          contentId,
          accountId,
          scheduleId: scheduleId || null,
          jobId: job.id ?? null,
          status: 'failed',
          errorMessage: error.message,
          errorStack: error.stack,
          screenshotPath,
          durationMs,
          attemptNumber: job.attemptsMade + 1,
        },
      });
    } catch (logErr) {
      log.error({ err: logErr, contentId }, 'Failed to create post log for failed publish');
    }

    log.error(
      {
        contentId,
        accountId,
        platform,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade + 1,
        durationMs,
      },
      '❌ Post publishing failed'
    );

    throw error;
  } finally {
    // Always release the browser context
    if (context) {
      try {
        await browserManager.releaseContext(accountId);
      } catch (releaseErr) {
        log.error({ err: releaseErr, accountId }, 'Failed to release browser context');
      }
    }
  }
}

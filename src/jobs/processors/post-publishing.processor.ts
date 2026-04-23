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

  log.info({ jobId: job.id, contentId, platform }, 'Publishing post...');

  // ─── Step 1: Load content & credentials ───────────────────
  const content = await prisma.content.findUnique({ where: { id: contentId } });
  if (!content) throw new Error(`Content ${contentId} not found`);

  const credentials = await accountService.getCredentials(accountId);

  // ─── Step 2: Get browser context ──────────────────────────
  const context = await browserManager.acquireContext(accountId);

  let postUrl: string | null = null;
  let screenshotPath: string | null = null;

  try {
    const page = await context.newPage();
    const adapter = getAdapter(platform);

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

    await page.close();
  } finally {
    // Always release the browser context
    await browserManager.releaseContext(accountId);
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

  log.info({ contentId, postUrl, durationMs }, '✅ Post published successfully');

  return { contentId, postUrl, durationMs };
}

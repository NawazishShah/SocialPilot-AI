import { Job } from 'bullmq';
import { prisma } from '../../services/database';
import type { Platform } from '../../config/constants';
import { createModuleLogger, sha256 } from '../../utils';
import { aiContentGeneratorService } from '../../ai/content-generation.service';
import type { PostStyle } from '../../ai/prompts/styles';
import { accountService } from '../../services/account.service';
import { SocialMediaPoster } from '../../automation/social-media-poster';

const log = createModuleLogger('posting-pipeline-processor');

/**
 * Automated Posting Pipeline (BullMQ)
 *
 * FLOW DIAGRAM:
 *
 *  (1) Fetch topic from DB (Schedule.contentConfig.topic)
 *        |
 *        v
 *  (2) Generate AI content (style + platform)
 *        |
 *        v
 *  (3) Improve content (humanize + format)
 *        |
 *        v
 *  (4) Send content to Playwright automation
 *        |
 *        v
 *  (5) Post on platform via adapter abstraction
 *        |
 *        v
 *  (6) Save results in DB (Content + PostLog)
 */

export interface PostingPipelineJobData {
  scheduleId: string;
  accountId: string;
  platform: Platform;
  style?: PostStyle;
  additionalContext?: string;
  autoPublish?: boolean;
}

function formatPost(text: string, hashtags: string[]): string {
  const cleaned = text.trim();
  const tags = hashtags
    .map((h) => h.trim())
    .filter(Boolean)
    .map((h) => (h.startsWith('#') ? h : `#${h.replace(/^#+/, '')}`));

  if (tags.length === 0) return cleaned;
  return `${cleaned}\n\n${tags.join(' ')}`;
}

export async function processPostingPipeline(job: Job<PostingPipelineJobData>) {
  const startTime = Date.now();
  const { scheduleId, accountId, platform, style, additionalContext, autoPublish } = job.data;

  log.info({ jobId: job.id, scheduleId, accountId, platform, attempt: job.attemptsMade + 1 }, 'Starting automated posting pipeline');

  let content: any = null;

  try {
    const schedule = await prisma.schedule.findUnique({
      where: { id: scheduleId },
      select: {
        id: true,
        accountId: true,
        contentConfig: true,
      },
    });

    if (!schedule) throw new Error(`Schedule ${scheduleId} not found`);
    if (schedule.accountId !== accountId) {
      throw new Error(`Schedule ${scheduleId} does not belong to account ${accountId}`);
    }

    const contentConfig = schedule.contentConfig as
      | {
          topic?: string;
          tone?: string;
          contentType?: string;
          niche?: string;
        }
      | null
      | undefined;

    const topic = contentConfig?.topic;
    if (!topic) throw new Error(`Schedule ${scheduleId} has no contentConfig.topic`);

    const styleToUse: PostStyle = style ?? 'professional';

    // (2) Generate
    log.info({ scheduleId, topic, platform, style: styleToUse }, 'Generating AI content...');
    const generated = await aiContentGeneratorService.generateHighEngagementPost({
      topic,
      platform,
      style: styleToUse,
      additionalContext,
    });

    // (3) Improve
    log.info({ contentId: 'pending', scheduleId }, 'Humanizing and formatting content...');
    const improvedBody = await aiContentGeneratorService.rewriteHumanize(generated.text, { preserveHashtags: false });
    const postText = formatPost(improvedBody, generated.hashtags);

    // (6a) Save draft/approved content
    const promptHash = sha256(`${platform}:text:${topic}:${styleToUse}`);

    content = await prisma.content.create({
      data: {
        accountId,
        platform,
        contentType: 'text',
        body: improvedBody,
        hashtags: generated.hashtags,
        aiModel: generated.model,
        aiPromptHash: promptHash,
        tokensUsed: generated.tokensUsed,
        status: autoPublish === false ? 'draft' : 'approved',
        metadata: {
          generatedBy: 'ai_pipeline',
          scheduleId,
          jobId: job.id,
          style: styleToUse,
          similarityMax: generated.similarityMax,
          postText,
        },
      },
    });

    log.info({ contentId: content.id, scheduleId, tokensUsed: generated.tokensUsed }, 'Content saved to database');

    if (autoPublish === false) {
      log.info({ contentId: content.id, scheduleId }, 'Pipeline generated content only (autoPublish=false)');
      return { contentId: content.id, posted: false };
    }

    // (4)-(5) Post via Playwright
    log.info({ contentId: content.id, scheduleId, platform }, 'Starting Playwright automation...');
    const credentials = await accountService.getCredentials(accountId);
    const poster = new SocialMediaPoster({
      accountId,
      platform,
      credentials: {
        email: credentials.email,
        username: credentials.username,
        password: credentials.password,
      },
      options: {
        sessionDir: './sessions',
      },
    });

    let postUrl: string | null = null;
    let screenshotPath: string | null = null;

    try {
      const result = await poster.createPost({ text: postText });
      postUrl = result.postUrl;

      await prisma.content.update({
        where: { id: content.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
          postUrl,
        },
      });

      const durationMs = Date.now() - startTime;

      await prisma.postLog.create({
        data: {
          contentId: content.id,
          accountId,
          scheduleId,
          jobId: job.id ?? null,
          status: 'success',
          screenshotPath,
          durationMs,
          attemptNumber: job.attemptsMade + 1,
          metadata: {
            pipeline: true,
            style: styleToUse,
          },
        },
      });

      log.info({ contentId: content.id, postUrl, durationMs, attempt: job.attemptsMade + 1 }, '✅ Pipeline completed: posted successfully');

      return {
        contentId: content.id,
        postUrl,
        durationMs,
        posted: true,
      };
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      const durationMs = Date.now() - startTime;

      // Update content status to failed
      if (content) {
        try {
          await prisma.content.update({
            where: { id: content.id },
            data: { status: 'failed' },
          });
        } catch (updateErr) {
          log.error({ err: updateErr, contentId: content.id }, 'Failed to update content status to failed');
        }
      }

      // Log the failure
      try {
        await prisma.postLog.create({
          data: {
            contentId: content?.id || 'unknown',
            accountId,
            scheduleId,
            jobId: job.id ?? null,
            status: 'failed',
            errorMessage: error.message,
            errorStack: error.stack,
            screenshotPath,
            durationMs,
            attemptNumber: job.attemptsMade + 1,
            metadata: {
              pipeline: true,
              style: styleToUse,
            },
          },
        });
      } catch (logErr) {
        log.error({ err: logErr, contentId: content?.id }, 'Failed to create post log for failed pipeline');
      }

      log.error(
        {
          contentId: content?.id,
          scheduleId,
          platform,
          error: error.message,
          stack: error.stack,
          attempt: job.attemptsMade + 1,
          durationMs,
        },
        '❌ Pipeline failed during posting; will retry if attempts remain'
      );

      throw error;
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const durationMs = Date.now() - startTime;

    log.error(
      {
        scheduleId,
        accountId,
        platform,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade + 1,
        durationMs,
      },
      '❌ Pipeline failed during generation'
    );

    throw error;
  }
}

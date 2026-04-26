// ═══════════════════════════════════════════════════════════════
// Content Generation Processor
// Handles the actual AI content generation when a job is dequeued
// ═══════════════════════════════════════════════════════════════

import { Job } from 'bullmq';
import { prisma } from '../../services/database';
import { aiGenerator } from '../../ai/generator';
import { postPublishingQueue } from '../queues';
import { createModuleLogger, sha256 } from '../../utils';
import type { Platform, ContentType, Tone } from '../../config/constants';

const log = createModuleLogger('content-gen-processor');

interface ContentGenJobData {
  accountId: string;
  platform: Platform;
  config: {
    topic: string;
    contentType: ContentType;
    tone: Tone;
    additionalContext?: string;
  };
  scheduleId?: string;
  autoPublish?: boolean;
}

export async function processContentGeneration(job: Job<ContentGenJobData>) {
  const { accountId, platform, config, scheduleId, autoPublish } = job.data;
  const startTime = Date.now();

  log.info({ jobId: job.id, platform, topic: config.topic, attempt: job.attemptsMade + 1 }, 'Generating content...');

  try {
    // ─── Step 1: Call AI Generator ────────────────────────────
    const aiResult = await aiGenerator.generate({
      platform,
      contentType: config.contentType,
      topic: config.topic,
      tone: config.tone,
      additionalContext: config.additionalContext,
    });

  // ─── Step 2: Save to Database ─────────────────────────────
  const promptHash = sha256(`${platform}:${config.contentType}:${config.topic}:${config.tone}`);

  const content = await prisma.content.create({
    data: {
      accountId,
      platform,
      contentType: config.contentType,
      body: aiResult.text,
      hashtags: aiResult.hashtags,
      aiModel: aiResult.model,
      aiPromptHash: promptHash,
      tokensUsed: aiResult.tokensUsed,
      status: autoPublish ? 'approved' : 'draft',
      metadata: {
        generatedBy: 'ai',
        jobId: job.id,
        scheduleId: scheduleId || null,
        generationLatencyMs: aiResult.latencyMs,
      },
    },
  });

    log.info(
      { contentId: content.id, chars: aiResult.text.length, tokens: aiResult.tokensUsed, durationMs: Date.now() - startTime },
      'Content generated and saved'
    );

    // ─── Step 3: Auto-publish if configured ───────────────────
    if (autoPublish) {
      await postPublishingQueue.add(
        'publish',
        {
          contentId: content.id,
          accountId,
          platform,
          scheduleId,
        },
        {
          delay: Math.floor(Math.random() * 5000) + 1000, // 1-6s human-like delay
        }
      );

      log.info({ contentId: content.id }, 'Auto-publish job dispatched');
    }

    return {
      contentId: content.id,
      accountId,
      platform,
      textLength: aiResult.text.length,
      tokensUsed: aiResult.tokensUsed,
      durationMs: Date.now() - startTime,
    };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    const durationMs = Date.now() - startTime;
    
    log.error(
      { 
        jobId: job.id, 
        accountId, 
        platform, 
        topic: config.topic,
        error: error.message,
        stack: error.stack,
        attempt: job.attemptsMade + 1,
        durationMs,
      },
      'Content generation failed'
    );
    
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// Application Constants
// ═══════════════════════════════════════════════════════════════

export const PLATFORMS = ['twitter', 'linkedin', 'instagram', 'facebook'] as const;
export type Platform = (typeof PLATFORMS)[number];

export const CONTENT_TYPES = ['text', 'image', 'thread', 'story'] as const;
export type ContentType = (typeof CONTENT_TYPES)[number];

export const CONTENT_STATUSES = ['draft', 'approved', 'published', 'failed', 'archived'] as const;
export type ContentStatus = (typeof CONTENT_STATUSES)[number];

export const TONES = ['professional', 'casual', 'witty', 'inspirational'] as const;
export type Tone = (typeof TONES)[number];

export const SCHEDULE_STATUSES = ['active', 'paused', 'completed'] as const;
export type ScheduleStatus = (typeof SCHEDULE_STATUSES)[number];

export const ACCOUNT_STATUSES = ['active', 'suspended', 'error'] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

// ─── Platform Constraints ─────────────────────────────────────

export const PLATFORM_LIMITS: Record<Platform, { maxChars: number; maxHashtags: number; maxImages: number }> = {
  twitter: { maxChars: 280, maxHashtags: 5, maxImages: 4 },
  linkedin: { maxChars: 3000, maxHashtags: 10, maxImages: 9 },
  instagram: { maxChars: 2200, maxHashtags: 30, maxImages: 10 },
  facebook: { maxChars: 63206, maxHashtags: 10, maxImages: 10 },
};

// ─── Queue Names ──────────────────────────────────────────────

export const QUEUE_NAMES = {
  CONTENT_GENERATION: 'content-generation',
  POST_PUBLISHING: 'post-publishing',
  POSTING_PIPELINE: 'posting-pipeline',
  ANALYTICS_COLLECTION: 'analytics-collection',
  ACCOUNT_HEALTH: 'account-health',
} as const;

// ─── Job Defaults ─────────────────────────────────────────────

export const JOB_DEFAULTS = {
  CONTENT_GENERATION: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 2000 },
  },
  POST_PUBLISHING: {
    attempts: 2,
    backoff: { type: 'fixed' as const, delay: 30000 },
  },
  POSTING_PIPELINE: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 15000 },
  },
  ANALYTICS_COLLECTION: {
    attempts: 3,
    backoff: { type: 'exponential' as const, delay: 5000 },
  },
  ACCOUNT_HEALTH: {
    attempts: 1,
  },
};

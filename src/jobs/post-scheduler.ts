import { QueueEvents } from 'bullmq';
import type { RepeatOptions } from 'bullmq';
import type { Platform } from '../config/constants';
import { postingPipelineQueue } from './queues';
import { createRedisConnection } from '../config/redis';
import { createModuleLogger } from '../utils';

const log = createModuleLogger('post-scheduler');

export type ScheduleCadence = 'hourly' | 'daily' | 'random';

export interface PlatformSchedulingRules {
  quietHoursStart: number;
  quietHoursEnd: number;
  minSpacingMinutes: number;
  minRandomDelayMinutes: number;
  maxRandomDelayMinutes: number;
}

export const DEFAULT_PLATFORM_SCHEDULING_RULES: Record<Platform, PlatformSchedulingRules> = {
  twitter: {
    quietHoursStart: 0,
    quietHoursEnd: 7,
    minSpacingMinutes: 45,
    minRandomDelayMinutes: 35,
    maxRandomDelayMinutes: 180,
  },
  linkedin: {
    quietHoursStart: 0,
    quietHoursEnd: 7,
    minSpacingMinutes: 120,
    minRandomDelayMinutes: 90,
    maxRandomDelayMinutes: 360,
  },
  instagram: {
    quietHoursStart: 0,
    quietHoursEnd: 6,
    minSpacingMinutes: 180,
    minRandomDelayMinutes: 120,
    maxRandomDelayMinutes: 720,
  },
  facebook: {
    quietHoursStart: 0,
    quietHoursEnd: 7,
    minSpacingMinutes: 120,
    minRandomDelayMinutes: 60,
    maxRandomDelayMinutes: 480,
  },
};

export interface SchedulePostJobInput {
  scheduleId: string;
  accountId: string;
  platform: Platform;

  cadence: ScheduleCadence;
  timezone?: string;
  dailyHour?: number;
  dailyMinute?: number;
  randomMinDelayMinutes?: number;
  randomMaxDelayMinutes?: number;
  rules?: Partial<PlatformSchedulingRules>;
  autoPublish?: boolean;
}

export interface RandomDelaySchedulerInput {
  platform: Platform;
  timezone?: string;
  now?: Date;

  minDelayMinutes?: number;
  maxDelayMinutes?: number;

  rules?: Partial<PlatformSchedulingRules>;
  lastRunAt?: Date | null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function randomInt(minInclusive: number, maxInclusive: number): number {
  const min = Math.ceil(minInclusive);
  const max = Math.floor(maxInclusive);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getHourInTimeZone(date: Date, timeZone: string): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour: '2-digit',
    hour12: false,
  }).format(date);
  return Number(hour);
}

function isInQuietHours(hour: number, rules: PlatformSchedulingRules): boolean {
  const { quietHoursStart, quietHoursEnd } = rules;

  if (quietHoursStart === quietHoursEnd) return false;

  if (quietHoursStart < quietHoursEnd) {
    return hour >= quietHoursStart && hour < quietHoursEnd;
  }
  return hour >= quietHoursStart || hour < quietHoursEnd;
}

function addMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function nextAllowedTime(input: {
  proposed: Date;
  timeZone: string;
  rules: PlatformSchedulingRules;
}): Date {
  let cursor = input.proposed;
  for (let i = 0; i < 60 * 24; i += 5) {
    const hour = getHourInTimeZone(cursor, input.timeZone);
    if (!isInQuietHours(hour, input.rules)) return cursor;
    cursor = addMinutes(cursor, 5);
  }

  return cursor;
}

function resolveRules(platform: Platform, overrides?: Partial<PlatformSchedulingRules>): PlatformSchedulingRules {
  return {
    ...DEFAULT_PLATFORM_SCHEDULING_RULES[platform],
    ...(overrides ?? {}),
  };
}

function allowedHoursForCron(rules: PlatformSchedulingRules): string {
  const { quietHoursStart, quietHoursEnd } = rules;

  if (quietHoursStart === quietHoursEnd) return '*';

  if (quietHoursStart < quietHoursEnd) {
    const start = clamp(quietHoursEnd, 0, 23);
    const end = clamp(quietHoursStart - 1, 0, 23);

    if (start === 0 && end === 23) return '*';
    if (start <= end) return `${start}-${end}`;
    return '*';
  }

  const start = clamp(quietHoursEnd, 0, 23);
  const end = clamp(quietHoursStart - 1, 0, 23);
  if (start === 0 && end === 23) return '*';
  if (start <= end) return `${start}-${end}`;
  return '*';
}

function safeDailyHour(inputHour: number, rules: PlatformSchedulingRules): number {
  const hour = clamp(inputHour, 0, 23);
  if (!isInQuietHours(hour, rules)) return hour;
  return clamp(rules.quietHoursEnd, 0, 23);
}

export function randomDelayScheduler(input: RandomDelaySchedulerInput): {
  delayMs: number;
  scheduledFor: Date;
} {
  const timeZone = input.timezone ?? 'UTC';
  const now = input.now ?? new Date();
  const rules = resolveRules(input.platform, input.rules);

  const minDelayMinutes = clamp(
    input.minDelayMinutes ?? rules.minRandomDelayMinutes,
    1,
    60 * 24 * 14
  );
  const maxDelayMinutes = clamp(
    input.maxDelayMinutes ?? rules.maxRandomDelayMinutes,
    minDelayMinutes,
    60 * 24 * 30
  );
  const baseDelayMinutes = randomInt(minDelayMinutes, maxDelayMinutes);
  const earliestBySpacing = input.lastRunAt
    ? addMinutes(input.lastRunAt, Math.max(1, rules.minSpacingMinutes))
    : null;

  const proposed = addMinutes(now, baseDelayMinutes);
  const afterSpacing = earliestBySpacing && earliestBySpacing > proposed ? earliestBySpacing : proposed;

  const scheduledFor = nextAllowedTime({ proposed: afterSpacing, timeZone, rules });
  const delayMs = Math.max(0, scheduledFor.getTime() - now.getTime());

  return { delayMs, scheduledFor };
}

function buildRepeatOptions(input: SchedulePostJobInput): RepeatOptions {
  const tz = input.timezone ?? 'UTC';

  const rules = resolveRules(input.platform, input.rules);

  if (input.cadence === 'hourly') {
    const allowedHours = allowedHoursForCron(rules);
    return { pattern: `0 ${allowedHours} * * *`, tz };
  }

  if (input.cadence === 'daily') {
    const hour = safeDailyHour(input.dailyHour ?? 9, rules);
    const minute = clamp(input.dailyMinute ?? 0, 0, 59);
    return { pattern: `${minute} ${hour} * * *`, tz };
  }

  throw new Error(`Unsupported cadence for repeat options: ${input.cadence}`);
}

export async function schedulePostJob(input: SchedulePostJobInput): Promise<
  | {
      mode: 'repeatable';
      jobName: string;
      repeat: RepeatOptions;
    }
  | {
      mode: 'delayed';
      jobName: string;
      delayMs: number;
      scheduledFor: Date;
    }
> {
  const autoPublish = input.autoPublish ?? true;
  const jobName = 'pipeline';

  if (input.cadence === 'random') {
    const rules = resolveRules(input.platform, input.rules);

    const { delayMs, scheduledFor } = randomDelayScheduler({
      platform: input.platform,
      timezone: input.timezone,
      minDelayMinutes: input.randomMinDelayMinutes ?? rules.minRandomDelayMinutes,
      maxDelayMinutes: input.randomMaxDelayMinutes ?? rules.maxRandomDelayMinutes,
      rules: input.rules,
    });

    const jobId = `random:schedule:${input.scheduleId}:${scheduledFor.toISOString()}`;

    await postingPipelineQueue.add(
      jobName,
      {
        scheduleId: input.scheduleId,
        accountId: input.accountId,
        platform: input.platform,
        autoPublish,
      },
      {
        delay: delayMs,
        jobId,
      }
    );

    log.info({ scheduleId: input.scheduleId, platform: input.platform, scheduledFor }, 'Random post job scheduled');

    return {
      mode: 'delayed',
      jobName,
      delayMs,
      scheduledFor,
    };
  }

  const repeat = buildRepeatOptions(input);
  const repeatJobId = `${input.cadence}:schedule:${input.scheduleId}`;

  await postingPipelineQueue.add(
    jobName,
    {
      scheduleId: input.scheduleId,
      accountId: input.accountId,
      platform: input.platform,
      autoPublish,
    },
    {
      jobId: repeatJobId,
      repeat,
    }
  );

  log.info(
    { scheduleId: input.scheduleId, platform: input.platform, cadence: input.cadence, repeat },
    'Repeatable post job scheduled'
  );

  return {
    mode: 'repeatable',
    jobName,
    repeat,
  };
}

export interface StartRandomIntervalSchedulerInput {
  scheduleId: string;
  accountId: string;
  platform: Platform;

  timezone?: string;
  rules?: Partial<PlatformSchedulingRules>;
  randomMinDelayMinutes?: number;
  randomMaxDelayMinutes?: number;
  maxRuns?: number;
  autoPublish?: boolean;
}
export async function startRandomIntervalScheduler(input: StartRandomIntervalSchedulerInput): Promise<{
  stop: () => Promise<void>;
}> {
  const timeZone = input.timezone ?? 'UTC';
  const autoPublish = input.autoPublish ?? true;

  let stopped = false;
  let runs = 0;
  let lastRunAt: Date | null = null;
  const queueEvents = new QueueEvents(postingPipelineQueue.name, {
    connection: createRedisConnection(),
  });

  const scheduleNext = async () => {
    if (stopped) return;
    if (input.maxRuns !== undefined && runs >= input.maxRuns) return;

    const { delayMs, scheduledFor } = randomDelayScheduler({
      platform: input.platform,
      timezone: timeZone,
      rules: input.rules,
      minDelayMinutes: input.randomMinDelayMinutes,
      maxDelayMinutes: input.randomMaxDelayMinutes,
      lastRunAt,
    });

    const jobId = `random:schedule:${input.scheduleId}:${scheduledFor.toISOString()}`;

    await postingPipelineQueue.add(
      'pipeline',
      {
        scheduleId: input.scheduleId,
        accountId: input.accountId,
        platform: input.platform,
        autoPublish,
      },
      {
        delay: delayMs,
        jobId,
      }
    );

    log.info(
      { scheduleId: input.scheduleId, platform: input.platform, scheduledFor, delayMs },
      'Next random post job scheduled'
    );
  };

  const onCompleted = async (args: { jobId: string }) => {
    if (stopped) return;

    if (!args.jobId.startsWith(`random:schedule:${input.scheduleId}:`)) return;

    runs += 1;
    lastRunAt = new Date();

    await scheduleNext();
  };

  const onFailed = async (args: { jobId: string }) => {
    if (stopped) return;

    if (!args.jobId.startsWith(`random:schedule:${input.scheduleId}:`)) return;
    lastRunAt = new Date();

    await scheduleNext();
  };

  queueEvents.on('completed', (args) => {
    void onCompleted(args);
  });

  queueEvents.on('failed', (args) => {
    void onFailed(args);
  });

  queueEvents.on('error', (err) => {
    log.error({ err, scheduleId: input.scheduleId }, 'QueueEvents error (random scheduler)');
  });

  await scheduleNext();

  return {
    stop: async () => {
      if (stopped) return;
      stopped = true;
      await queueEvents.close();
    },
  };
}

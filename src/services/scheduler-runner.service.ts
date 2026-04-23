import type { Platform } from '../config/constants';
import { createModuleLogger } from '../utils';
import { scheduleService } from './schedule.service';
import { postingPipelineQueue } from '../jobs/queues';

const log = createModuleLogger('scheduler-runner');

export interface SchedulerRunnerOptions {
  pollIntervalMs?: number;
}

export class SchedulerRunnerService {
  private timer: NodeJS.Timeout | null = null;
  private running = false;
  private pollIntervalMs: number;

  constructor(options?: SchedulerRunnerOptions) {
    this.pollIntervalMs = options?.pollIntervalMs ?? 15000;
  }

  start() {
    if (this.timer) return;

    this.timer = setInterval(() => {
      void this.tick();
    }, this.pollIntervalMs);

    void this.tick();

    log.info({ pollIntervalMs: this.pollIntervalMs }, 'Scheduler runner started');
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    log.info('Scheduler runner stopped');
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    this.running = true;

    try {
      const due = await scheduleService.findDueSchedules();
      if (due.length === 0) return;

      log.info({ count: due.length }, 'Found due schedules');

      for (const schedule of due) {
        if (schedule.account.status !== 'active') {
          continue;
        }

        const platform = schedule.account.platform as Platform;
        const nextRunAtIso = schedule.nextRunAt ? schedule.nextRunAt.toISOString() : 'now';
        const dedupeJobId = `schedule:${schedule.id}:${nextRunAtIso}`;

        try {
          await postingPipelineQueue.add(
            'pipeline',
            {
              scheduleId: schedule.id,
              accountId: schedule.accountId,
              platform,
              autoPublish: true,
            },
            {
              jobId: dedupeJobId,
            }
          );

          await scheduleService.markExecuted(schedule.id);

          log.info({ scheduleId: schedule.id, jobId: dedupeJobId }, 'Enqueued posting pipeline job');
        } catch (err) {
          log.error({ err, scheduleId: schedule.id }, 'Failed to enqueue posting pipeline job');
        }
      }
    } catch (err) {
      log.error({ err }, 'Scheduler runner tick failed');
    } finally {
      this.running = false;
    }
  }
}

export const schedulerRunnerService = new SchedulerRunnerService();

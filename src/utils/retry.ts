// ═══════════════════════════════════════════════════════════════
// Retry Utility — generic retry with exponential backoff
// ═══════════════════════════════════════════════════════════════

import { createModuleLogger } from './logger';

const log = createModuleLogger('retry');

interface RetryOptions {
  attempts: number;
  delayMs: number;
  backoffMultiplier?: number;
  maxDelayMs?: number;
  onRetry?: (error: Error, attempt: number) => void;
}

/**
 * Wraps an async function with retry logic and exponential backoff.
 *
 * @example
 * const result = await retry(
 *   () => callExternalAPI(),
 *   { attempts: 3, delayMs: 1000, backoffMultiplier: 2 }
 * );
 */
export async function retry<T>(
  fn: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  const {
    attempts,
    delayMs,
    backoffMultiplier = 2,
    maxDelayMs = 30000,
    onRetry,
  } = options;

  let lastError: Error = new Error('Retry failed');

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt === attempts) {
        log.error({ err: lastError, attempt, totalAttempts: attempts }, 'All retry attempts exhausted');
        break;
      }

      const currentDelay = Math.min(delayMs * Math.pow(backoffMultiplier, attempt - 1), maxDelayMs);
      log.warn({ attempt, totalAttempts: attempts, nextRetryMs: currentDelay }, `Attempt ${attempt} failed, retrying...`);

      if (onRetry) onRetry(lastError, attempt);

      await sleep(currentDelay);
    }
  }

  throw lastError;
}

/**
 * Promise-based sleep.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Returns a random delay between min and max (inclusive).
 * Useful for human-like timing in browser automation.
 */
export function randomDelay(minMs: number, maxMs: number): number {
  return Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;
}

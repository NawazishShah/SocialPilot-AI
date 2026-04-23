// ═══════════════════════════════════════════════════════════════
// Logger — structured JSON logging with Pino
// ═══════════════════════════════════════════════════════════════

import pino from 'pino';

const isDev = process.env.NODE_ENV !== 'production';

export const logger = pino({
  level: isDev ? 'debug' : 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined, // JSON output in production
  base: {
    service: 'content-jinee',
  },
});

/**
 * Create a child logger scoped to a module.
 *
 * Usage:
 *   const log = createModuleLogger('publisher');
 *   log.info('Publishing post...');
 */
export function createModuleLogger(module: string) {
  return logger.child({ module });
}

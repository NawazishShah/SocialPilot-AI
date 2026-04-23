// ═══════════════════════════════════════════════════════════════
// Express Server Setup
// ═══════════════════════════════════════════════════════════════

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { serverConfig } from './config';
import { logger, AppError } from './utils';
import { accountRoutes } from './modules/accounts/accounts.routes';
import { contentRoutes } from './modules/content/content.routes';
import { scheduleRoutes } from './modules/schedules/schedules.routes';
import { healthRoutes } from './modules/health/health.routes';
import { pipelineRoutes } from './modules/pipeline/pipeline.routes';
import { engineRoutes } from './modules/engine/engine.routes';
import { logsRoutes } from './modules/logs/logs.routes';
import { analyticsRoutes } from './modules/analytics/analytics.routes';
import { topicsRoutes } from './modules/topics/topics.routes';

export function createServer() {
  const app = express();

  // ─── Global Middleware ───────────────────────────────────────
  app.use(helmet());
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // HTTP request logging
  if (serverConfig.isDev) {
    app.use(morgan('dev'));
  } else {
    app.use(
      morgan('combined', {
        stream: { write: (message: string) => logger.info(message.trim()) },
      })
    );
  }

  // ─── API Key Auth Middleware ─────────────────────────────────
  app.use('/api', (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.headers['x-api-key'] as string;

    // Allow health check without auth
    if (req.path === '/health') return next();

    if (!apiKey || apiKey !== serverConfig.apiKey) {
      res.status(401).json({ error: 'Invalid or missing API key' });
      return;
    }
    next();
  });

  // ─── Routes ─────────────────────────────────────────────────
  app.use('/api/accounts', accountRoutes);
  app.use('/api/content', contentRoutes);
  app.use('/api/schedules', scheduleRoutes);
  app.use('/api/pipeline', pipelineRoutes);
  app.use('/api/engine', engineRoutes);
  app.use('/api/logs', logsRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/topics', topicsRoutes);
  app.use('/api/health', healthRoutes);

  // Root route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      name: 'Content Jinee — AI Social Media Automation',
      version: '1.0.0',
      status: 'running',
      docs: '/api/health',
    });
  });

  // ─── 404 Handler ────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Route not found' });
  });

  // ─── Global Error Handler ──────────────────────────────────
  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (err instanceof AppError) {
      logger.warn({ statusCode: err.statusCode, message: err.message }, 'Operational error');
      res.status(err.statusCode).json({ error: err.message });
      return;
    }

    // Unexpected errors
    logger.error({ err }, '💥 Unhandled error');
    res.status(500).json({
      error: serverConfig.isDev ? err.message : 'Internal server error',
    });
  });

  return app;
}

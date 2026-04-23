import { Router } from 'express';
import * as controller from './analytics.controller';

export const analyticsRoutes = Router();

analyticsRoutes.get('/', controller.listAnalytics);
analyticsRoutes.get('/summary', controller.getSummary);

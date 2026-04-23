// ═══════════════════════════════════════════════════════════════
// Schedules Module — Routes
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import * as controller from './schedules.controller';

export const scheduleRoutes = Router();

scheduleRoutes.get('/', controller.listSchedules);
scheduleRoutes.get('/:id', controller.getSchedule);
scheduleRoutes.post('/', controller.createSchedule);
scheduleRoutes.put('/:id', controller.updateSchedule);
scheduleRoutes.put('/:id/pause', controller.pauseSchedule);
scheduleRoutes.put('/:id/resume', controller.resumeSchedule);
scheduleRoutes.delete('/:id', controller.deleteSchedule);

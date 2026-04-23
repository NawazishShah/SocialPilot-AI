import { Router } from 'express';
import * as controller from './logs.controller';

export const logsRoutes = Router();

logsRoutes.get('/', controller.listLogs);

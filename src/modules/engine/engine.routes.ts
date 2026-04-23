import { Router } from 'express';
import * as controller from './engine.controller';

export const engineRoutes = Router();

engineRoutes.get('/status', controller.getEngineStatus);
engineRoutes.post('/start', controller.startEngine);
engineRoutes.post('/stop', controller.stopEngine);

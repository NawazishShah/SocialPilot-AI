import { Router } from 'express';
import * as controller from './pipeline.controller';

export const pipelineRoutes = Router();

pipelineRoutes.post('/run', controller.runPipeline);

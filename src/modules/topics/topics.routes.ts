import { Router } from 'express';
import * as controller from './topics.controller';

export const topicsRoutes = Router();

topicsRoutes.get('/', controller.listTopics);
topicsRoutes.post('/', controller.createTopic);
topicsRoutes.delete('/:id', controller.deleteTopic);

// ═══════════════════════════════════════════════════════════════
// Content Module — Routes
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import * as controller from './content.controller';

export const contentRoutes = Router();

contentRoutes.get('/', controller.listContent);
contentRoutes.get('/:id', controller.getContent);
contentRoutes.post('/generate', controller.generateContent);
contentRoutes.put('/:id/approve', controller.approveContent);
contentRoutes.put('/:id/archive', controller.archiveContent);
contentRoutes.delete('/:id', controller.deleteContent);

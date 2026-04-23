// ═══════════════════════════════════════════════════════════════
// Accounts Module — Routes
// ═══════════════════════════════════════════════════════════════

import { Router } from 'express';
import * as controller from './accounts.controller';

export const accountRoutes = Router();

accountRoutes.get('/', controller.listAccounts);
accountRoutes.get('/:id', controller.getAccount);
accountRoutes.post('/', controller.createAccount);
accountRoutes.put('/:id', controller.updateAccount);
accountRoutes.delete('/:id', controller.deleteAccount);
accountRoutes.post('/:id/health-check', controller.triggerHealthCheck);

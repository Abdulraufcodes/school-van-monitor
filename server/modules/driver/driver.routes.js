import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';
import { getMyAssignedVansController, getSchoolDriversController } from './driver.controller.js';
import { assignedVansSchema } from './driver.validation.js';

export const driverRouter = Router();

driverRouter.get(
  '/me/vans',
  authenticate,
  authorize('driver'),
  validate(assignedVansSchema),
  getMyAssignedVansController
);

// Admin: list active drivers belonging to the authenticated admin's school.
driverRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  requireAdminSchool,
  getSchoolDriversController
);

import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { getSchoolDriversController } from './driver.controller.js';

export const driverRouter = Router();

// Admin: list active drivers belonging to the authenticated admin's school.
driverRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  requireAdminSchool,
  getSchoolDriversController
);

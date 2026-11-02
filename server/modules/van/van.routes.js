import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';
// Middleware that limits how frequently each driver can submit GPS updates.
import { gpsRateLimit } from '../../src/middleware/gpsRateLimit.js';
import {postVanLocation,getSchoolVansController, createSchoolVanController, reassignSchoolVanDriverController} from './van.controller.js';

import {
  locationUpdateSchema,
  listVansSchema,
  createVanSchema
} from './van.validation.js';
import { updateVanDriverSchema } from './van.validation.js';

export const vanRouter = Router();

// Admin: list only vans belonging to the authenticated admin's school.
vanRouter.get(
  '/',
  authenticate,
  authorize('admin'),
  requireAdminSchool,
  validate(listVansSchema),
  getSchoolVansController
);

// Admin: create a van under the authenticated admin's school.
vanRouter.post(
  '/',
  authenticate,
  authorize('admin'),
  requireAdminSchool,
  validate(createVanSchema),
  createSchoolVanController
);

vanRouter.patch('/:vanId/driver', authenticate, authorize('admin'), requireAdminSchool, validate(updateVanDriverSchema), reassignSchoolVanDriverController);

// Drivers must be authenticated and authorized before rate limiting.
// Validate the payload before the controller saves the GPS location.
vanRouter.post(
  '/:vanId/location',
  authenticate,
  authorize('driver'),
  gpsRateLimit,
  validate(locationUpdateSchema),
  postVanLocation
);

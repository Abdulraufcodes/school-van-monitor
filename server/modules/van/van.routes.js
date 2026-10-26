import { Router } from 'express';

import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';

import {postVanLocation,getSchoolVansController, createSchoolVanController} from './van.controller.js';

import {
  locationUpdateSchema,
  listVansSchema,
  createVanSchema
} from './van.validation.js';

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

// Driver: submit a GPS location during an assigned active trip.
vanRouter.post(
  '/:vanId/location',
  authenticate,
  authorize('driver'),
  validate(locationUpdateSchema),
  postVanLocation
);

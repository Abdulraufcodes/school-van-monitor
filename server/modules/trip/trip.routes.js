import { Router } from 'express';

import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';

import {
  startTripController,
  getActiveTripController,
  endTripController,
  getLatestTripLocationController,
  getSchoolActiveTripLocationsController
} from './trip.controller.js';

import {
  startTripSchema,
  activeTripSchema,
  endTripSchema,
  tripLocationSchema,
  schoolActiveTripLocationsSchema
} from './trip.validation.js';

export const tripRouter = Router();

// Start a trip: drivers only.
tripRouter.post(
  '/start',
  authenticate,
  authorize('driver'),
  validate(startTripSchema),
  startTripController
);

// Retrieve the authenticated driver's active trip.
tripRouter.get(
  '/active',
  authenticate,
  authorize('driver'),
  validate(activeTripSchema),
  getActiveTripController
);

// Complete a trip: only its assigned driver can do this.
tripRouter.post(
  '/:tripId/end',
  authenticate,
  authorize('driver'),
  validate(endTripSchema),
  endTripController
);

// Verify school ownership only when the caller is an admin.
// Parents are authorized separately inside the service using
// their database-backed parent-child and van assignment relationship.
function requireAdminSchoolForLocation(req, res, next) {
  if (req.user.role !== 'admin') {
    return next();
  }

  return requireAdminSchool(req, res, next);
}

// School admin: retrieve all active trip locations for their school.
// Keep this route before /:tripId/location to avoid route matching conflicts.
tripRouter.get(
  '/admin/locations',
  authenticate,
  authorize('admin'),
  requireAdminSchool,
  validate(schoolActiveTripLocationsSchema),
  getSchoolActiveTripLocationsController
);

// Retrieve the latest location: parents and admins only.
tripRouter.get(
  '/:tripId/location',
  authenticate,
  authorize('parent', 'admin'),
  requireAdminSchoolForLocation,
  validate(tripLocationSchema),
  getLatestTripLocationController
);

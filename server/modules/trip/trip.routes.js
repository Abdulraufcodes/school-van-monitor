import { Router } from 'express';

import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { validate } from '../../src/middleware/validate.js';

import {startTripController, getActiveTripController, endTripController} from './trip.controller.js';

import {startTripSchema, activeTripSchema, endTripSchema} from './trip.validation.js';

export const tripRouter = Router();

tripRouter.post(
  '/start',
  authenticate,
  authorize('driver'),
  validate(startTripSchema),
  startTripController
);

tripRouter.get(
  '/active',
  authenticate,
  authorize('driver'),
  validate(activeTripSchema),
  getActiveTripController
);

tripRouter.post(
  '/:tripId/end',
  authenticate,
  authorize('driver'),
  validate(endTripSchema),
  endTripController
);

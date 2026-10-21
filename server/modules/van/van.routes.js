import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { validate } from '../../src/middleware/validate.js';
import { postVanLocation } from './van.controller.js';
import { locationUpdateSchema } from './van.validation.js';

export const vanRouter = Router();

vanRouter.post(
  '/:vanId/location',
  authenticate,
  authorize('driver'),
  validate(locationUpdateSchema),
  postVanLocation
);

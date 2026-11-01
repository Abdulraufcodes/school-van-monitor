import { Router } from 'express';

import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { validate } from '../../src/middleware/validate.js';

import {
    requestPickupOtpController,
    verifyPickupOtpController
} from './studentEvent.controller.js';

import {
    requestPickupOtpSchema,
    verifyPickupOtpSchema
} from './studentEvent.validation.js';

import {
    requestDropoffOtpController,
    verifyDropoffOtpController
} from './studentEvent.controller.js';

import {
    requestDropoffOtpSchema,
    verifyDropoffOtpSchema
} from './studentEvent.validation.js';

import { studentEventHistorySchema, tripStudentStatusesSchema, studentTripStatusSchema } from './studentEvent.validation.js';
import { getStudentEventHistoryController, getTripStudentStatusesController, getStudentTripStatusController } from './studentEvent.controller.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';

export const studentEventRouter = Router();

// Driver requests an OTP for a student on their active trip.
studentEventRouter.post(
    '/:tripId/students/:studentId/pickup/otp',
    authenticate,
    authorize('driver'),
    validate(requestPickupOtpSchema),
    requestPickupOtpController
);

// Driver submits the parent's OTP to confirm pickup.
studentEventRouter.post(
    '/:tripId/students/:studentId/pickup/verify',
    authenticate,
    authorize('driver'),
    validate(verifyPickupOtpSchema),
    verifyPickupOtpController
);


studentEventRouter.post(
    '/:tripId/students/:studentId/dropoff/otp',
    authenticate,
    authorize('driver'),
    validate(requestDropoffOtpSchema),
    requestDropoffOtpController
);

studentEventRouter.post(
    '/:tripId/students/:studentId/dropoff/verify',
    authenticate,
    authorize('driver'),
    validate(verifyDropoffOtpSchema),
    verifyDropoffOtpController
);

studentEventRouter.get(
    '/:tripId/students',
    authenticate,
    authorize('driver'),
    validate(tripStudentStatusesSchema),
    getTripStudentStatusesController
);

// Retrieve one student's pickup/drop-off status for a particular trip.
// Access is restricted by role and checked again inside the service.
studentEventRouter.get(
    '/:tripId/students/:studentId/status',
    authenticate,
    authorize('driver', 'parent', 'admin'),
    validate(studentTripStatusSchema),
    getStudentTripStatusController
);

studentEventRouter.get(
    '/students/:studentId/history',
    authenticate,
    authorize('parent'),
    validate(studentEventHistorySchema),
    getStudentEventHistoryController
);

studentEventRouter.get(
    '/admin/students/:studentId/history',
    authenticate,
    authorize('admin'),
    requireAdminSchool,
    validate(studentEventHistorySchema),
    getStudentEventHistoryController
);
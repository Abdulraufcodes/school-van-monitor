import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';
import { createSchoolStudentController, createSchoolUserController, listSchoolPeopleController, resendActivationController, updateSchoolStudentStatusController, updateSchoolUserStatusController, updateStudentParentsController, updateStudentPickupLocationController } from './admin.controller.js';
import { createSchoolUserSchema, createStudentSchema, resendActivationSchema, updateSchoolStudentStatusSchema, updateSchoolUserStatusSchema, updateStudentParentsSchema, updateStudentPickupLocationSchema } from './admin.validation.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'), requireAdminSchool);
adminRouter.get('/people', listSchoolPeopleController);
adminRouter.post('/users', validate(createSchoolUserSchema), createSchoolUserController);
adminRouter.post('/users/:userId/resend-activation', validate(resendActivationSchema), resendActivationController);
adminRouter.patch('/users/:userId/status', validate(updateSchoolUserStatusSchema), updateSchoolUserStatusController);
adminRouter.post('/students', validate(createStudentSchema), createSchoolStudentController);
adminRouter.patch('/students/:studentId/status', validate(updateStudentStatusSchema), updateSchoolStudentStatusController);
adminRouter.patch('/students/:studentId/parents', validate(updateStudentParentsSchema), updateStudentParentsController);
adminRouter.patch('/students/:studentId/pickup-location', validate(updateStudentPickupLocationSchema), updateStudentPickupLocationController);

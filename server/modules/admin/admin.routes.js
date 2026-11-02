import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { validate } from '../../src/middleware/validate.js';
import { createSchoolStudentController, createSchoolUserController, listSchoolPeopleController, updateStudentParentsController } from './admin.controller.js';
import { createSchoolUserSchema, createStudentSchema, studentIdSchema } from './admin.validation.js';

export const adminRouter = Router();
adminRouter.use(authenticate, authorize('admin'), requireAdminSchool);
adminRouter.get('/people', listSchoolPeopleController);
adminRouter.post('/users', validate(createSchoolUserSchema), createSchoolUserController);
adminRouter.post('/students', validate(createStudentSchema), createSchoolStudentController);
adminRouter.patch('/students/:studentId/parents', validate(studentIdSchema.extend({ body: createStudentSchema.shape.body.pick({ parentEmails: true }) })), updateStudentParentsController);

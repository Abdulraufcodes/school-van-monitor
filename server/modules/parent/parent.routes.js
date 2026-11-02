import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { success } from '../../src/utils/response.js';
import { listParentStudentsWithTrips } from './parent.service.js';

export const parentRouter = Router();
parentRouter.get('/me/students', authenticate, authorize('parent'), async (req, res, next) => {
  try {
    const students = await listParentStudentsWithTrips({ parentId: req.user.id, schoolId: req.user.schoolId });
    return success(res, students, 'Linked students retrieved successfully');
  } catch (error) { return next(error); }
});

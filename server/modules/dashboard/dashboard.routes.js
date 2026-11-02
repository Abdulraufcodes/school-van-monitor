import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { success } from '../../src/utils/response.js';
import { getSchoolDashboardSummary } from './dashboardSummary.service.js';

export const dashboardRouter = Router();
dashboardRouter.get('/summary', authenticate, authorize('admin'), requireAdminSchool, async (req, res, next) => {
  try { return success(res, await getSchoolDashboardSummary(req.schoolId), 'School dashboard summary retrieved successfully'); }
  catch (error) { return next(error); }
});

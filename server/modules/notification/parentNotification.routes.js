import { Router } from 'express';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { success } from '../../src/utils/response.js';
import { listParentNotifications } from './parentNotification.service.js';

export const parentNotificationRouter = Router();
parentNotificationRouter.get('/', authenticate, authorize('parent'), async (req, res, next) => {
  try { return success(res, await listParentNotifications({ parentId: req.user.id, schoolId: req.user.schoolId }), 'Notifications retrieved successfully'); }
  catch (error) { return next(error); }
});

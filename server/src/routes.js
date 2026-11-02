import { Router } from 'express';
import { vanRouter } from '../modules/van/van.routes.js';
import { success } from './utils/response.js';
import { authRouter } from '../modules/auth/auth.routes.js';
import { tripRouter } from '../modules/trip/trip.routes.js';
import { driverRouter } from '../modules/driver/driver.routes.js';
import { adminRouter } from '../modules/admin/admin.routes.js';
import { bulkRegistrationRouter } from '../modules/bulkRegistration/bulkRegistration.routes.js';
import { dashboardRouter } from '../modules/dashboard/dashboard.routes.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  return success(res, { status: 'ok' }, 'API is healthy');
});
apiRouter.use('/vans', vanRouter);

apiRouter.use('/auth', authRouter);

apiRouter.use('/trips', tripRouter);

apiRouter.use('/drivers', driverRouter);
apiRouter.use('/admin', adminRouter);
apiRouter.use('/admin/import', bulkRegistrationRouter);
apiRouter.use('/dashboard', dashboardRouter);

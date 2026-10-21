import { Router } from 'express';
import { vanRouter } from '../modules/van/van.routes.js';
import { success } from './utils/response.js';

export const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  return success(res, { status: 'ok' }, 'API is healthy');
});
apiRouter.use('/vans', vanRouter);

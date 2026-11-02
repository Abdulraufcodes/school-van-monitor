import { Router } from 'express';

import { validate } from '../../src/middleware/validate.js';
import { authenticate } from '../../src/middleware/authenticate.js';
import { activateAccountController, changePasswordController, currentUserController, loginController, requestPasswordResetController, resetPasswordController } from './auth.controller.js';
import { activationSchema, changePasswordSchema, loginSchema, resetPasswordSchema, resetRequestSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.get('/me', authenticate, currentUserController);

authRouter.post(
  '/login',
  validate(loginSchema),
  loginController
);

authRouter.post('/activate', validate(activationSchema), activateAccountController);
authRouter.post('/password/reset-request', validate(resetRequestSchema), requestPasswordResetController);
authRouter.post('/password/reset', validate(resetPasswordSchema), resetPasswordController);
authRouter.post('/password/change', authenticate, validate(changePasswordSchema), changePasswordController);

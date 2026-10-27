import { Router } from 'express';

import { validate } from '../../src/middleware/validate.js';
import { authenticate } from '../../src/middleware/authenticate.js';
import { currentUserController, loginController } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.get('/me', authenticate, currentUserController);

authRouter.post(
  '/login',
  validate(loginSchema),
  loginController
);

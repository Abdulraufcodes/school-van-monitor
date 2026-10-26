import { Router } from 'express';

import { validate } from '../../src/middleware/validate.js';
import { loginController } from './auth.controller.js';
import { loginSchema } from './auth.validation.js';

export const authRouter = Router();

authRouter.post(
  '/login',
  validate(loginSchema),
  loginController
);

import { success } from '../../src/utils/response.js';
import { loginUser } from './auth.service.js';

export async function loginController(req, res, next) {
  try {
    const result = await loginUser(req.validated.body);

    return success(res, result, 'Login successful');
  } catch (error) {
    return next(error);
  }
}

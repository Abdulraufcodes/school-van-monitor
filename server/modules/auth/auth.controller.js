import { success } from '../../src/utils/response.js';
import { loginAdmin } from './auth.service.js';

export async function loginAdminController(req, res, next) {
  try {
    const result = await loginAdmin(req.validated.body);

    return success(res, result, 'Login successful');
  } catch (error) {
    return next(error);
  }
}

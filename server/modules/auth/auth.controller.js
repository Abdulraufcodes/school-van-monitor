import { success } from '../../src/utils/response.js';
import { loginUser } from './auth.service.js';

export async function currentUserController(req, res, next) {
  try {
    const { id, name, email, role, schoolId } = req.user;
    return success(res, {
      user: { id, name, email, role, schoolId }
    }, 'Current user retrieved');
  } catch (error) {
    return next(error);
  }
}

export async function loginController(req, res, next) {
  try {
    const result = await loginUser(req.validated.body);

    return success(res, result, 'Login successful');
  } catch (error) {
    return next(error);
  }
}

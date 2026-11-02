import { success } from '../../src/utils/response.js';
import { loginUser } from './auth.service.js';
import { activateAccount, changePassword, requestPasswordReset, resetPassword } from './accountAccess.service.js';

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

export async function activateAccountController(req, res, next) {
  try { return success(res, await activateAccount(req.validated.body), 'Account activated'); }
  catch (error) { return next(error); }
}

export async function requestPasswordResetController(req, res, next) {
  try { return success(res, await requestPasswordReset(req.validated.body.email), 'If an active account matches that email, a reset link has been sent'); }
  catch (error) { return next(error); }
}

export async function resetPasswordController(req, res, next) {
  try { return success(res, await resetPassword(req.validated.body), 'Password updated'); }
  catch (error) { return next(error); }
}

export async function changePasswordController(req, res, next) {
  try { return success(res, await changePassword({ userId: req.user.id, ...req.validated.body }), 'Password updated'); }
  catch (error) { return next(error); }
}

export async function loginController(req, res, next) {
  try {
    const result = await loginUser(req.validated.body);

    return success(res, result, 'Login successful');
  } catch (error) {
    return next(error);
  }
}

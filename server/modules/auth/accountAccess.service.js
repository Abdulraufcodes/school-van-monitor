import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import AccountToken from './accountToken.model.js';
import User from './User.model.js';
import { sendAccountLinkEmail } from '../notification/email.service.js';
import { AppError } from '../../src/utils/AppError.js';

const ACTIVATION_TTL_MS = 3 * 24 * 60 * 60 * 1000;
const RESET_TTL_MS = 60 * 60 * 1000;
const hashToken = (token) => createHash('sha256').update(token).digest('hex');

export async function issueAccountLink(user, purpose = 'activation') {
  const rawToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + (purpose === 'activation' ? ACTIVATION_TTL_MS : RESET_TTL_MS));
  await AccountToken.updateMany({ userId: user._id, purpose, usedAt: null }, { $set: { usedAt: new Date() } });
  await AccountToken.create({ userId: user._id, purpose, tokenHash: hashToken(rawToken), expiresAt });
  const path = purpose === 'activation' ? '/account/activate' : '/account/reset-password';
  const link = `${(process.env.CLIENT_ORIGIN || 'http://localhost:5173').replace(/\/$/, '')}${path}?token=${encodeURIComponent(rawToken)}`;
  await sendAccountLinkEmail({ to: user.email, name: user.name, purpose, link, expiresAt });
  return { expiresAt };
}

export async function activateAccount({ token, password }) {
  const accountToken = await AccountToken.findOne({ tokenHash: hashToken(token), purpose: 'activation', usedAt: null, expiresAt: { $gt: new Date() } });
  if (!accountToken) throw new AppError(400, 'INVALID_OR_EXPIRED_LINK', 'This activation link is invalid or has expired. Ask your school to send a new one.');
  const consumed = await AccountToken.findOneAndUpdate({ _id: accountToken._id, usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { new: true });
  if (!consumed) throw new AppError(400, 'INVALID_OR_EXPIRED_LINK', 'This activation link is invalid or has expired. Ask your school to send a new one.');
  const user = await User.findOneAndUpdate({ _id: accountToken.userId, accountStatus: 'pending_activation', isActive: true }, { $set: { passwordHash: await bcrypt.hash(password, 12), accountStatus: 'active', passwordChangedAt: new Date() } }, { new: true });
  if (!user) throw new AppError(400, 'ACCOUNT_UNAVAILABLE', 'This account has already been activated or is unavailable.');
  await AccountToken.updateMany({ userId: user._id, purpose: 'activation', usedAt: null }, { $set: { usedAt: new Date() } });
  return { email: user.email };
}

export async function requestPasswordReset(email) {
  const user = await User.findOne({ email: email.toLowerCase(), isActive: true, $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] });
  if (user) {
    try { await issueAccountLink(user, 'password_reset'); }
    catch (error) { console.error('Password reset email delivery failed'); }
  }
  return { message: 'If an active account matches that email, a password reset link has been sent.' };
}

export async function resetPassword({ token, password }) {
  const accountToken = await AccountToken.findOne({ tokenHash: hashToken(token), purpose: 'password_reset', usedAt: null, expiresAt: { $gt: new Date() } });
  if (!accountToken) throw new AppError(400, 'INVALID_OR_EXPIRED_LINK', 'This reset link is invalid or has expired. Request another link.');
  const consumed = await AccountToken.findOneAndUpdate({ _id: accountToken._id, usedAt: null, expiresAt: { $gt: new Date() } }, { $set: { usedAt: new Date() } }, { new: true });
  if (!consumed) throw new AppError(400, 'INVALID_OR_EXPIRED_LINK', 'This reset link is invalid or has expired. Request another link.');
  const user = await User.findOneAndUpdate({ _id: accountToken.userId, isActive: true, $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] }, { $set: { passwordHash: await bcrypt.hash(password, 12), accountStatus: 'active', passwordChangedAt: new Date() } }, { new: true });
  if (!user) throw new AppError(400, 'ACCOUNT_UNAVAILABLE', 'This account is unavailable.');
  await AccountToken.updateMany({ userId: user._id, purpose: 'password_reset', usedAt: null }, { $set: { usedAt: new Date() } });
  return { message: 'Password updated. You can now sign in.' };
}

export async function changePassword({ userId, currentPassword, password }) {
  const user = await User.findById(userId).select('+passwordHash');
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) throw new AppError(400, 'CURRENT_PASSWORD_INVALID', 'Current password is incorrect');
  user.passwordHash = await bcrypt.hash(password, 12);
  user.passwordChangedAt = new Date();
  await user.save();
  await AccountToken.updateMany({ userId: user._id, purpose: 'password_reset', usedAt: null }, { $set: { usedAt: new Date() } });
  return { message: 'Password updated successfully.' };
}

export async function resendActivation(userId, schoolId) {
  const user = await User.findOne({ _id: userId, schoolId, role: { $in: ['parent', 'driver'] }, accountStatus: 'pending_activation', isActive: true });
  if (!user) throw new AppError(404, 'PENDING_ACCOUNT_NOT_FOUND', 'No pending account was found for this school');
  return issueAccountLink(user, 'activation');
}

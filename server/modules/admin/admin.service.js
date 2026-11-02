import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import { AppError } from '../../src/utils/AppError.js';
import { issueAccountLink } from '../auth/accountAccess.service.js';

export async function listSchoolPeople(schoolId) {
  const [users, students] = await Promise.all([
    User.find({ schoolId, role: { $in: ['driver', 'parent'] } }).select('_id name email phone role isActive accountStatus createdAt').sort({ role: 1, name: 1 }).lean(),
    Student.find({ schoolId }).select('_id name className parentIds assignedVanId pickupLocation isActive createdAt').populate({ path: 'parentIds', select: 'name email' }).populate({ path: 'assignedVanId', select: 'registrationNumber assignedDriver', populate: { path: 'assignedDriver', select: 'name email' } }).sort({ name: 1 }).lean()
  ]);
  return { users, students };
}

export async function createSchoolUser({ schoolId, name, email, role, phone }) {
  if (await User.exists({ email })) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
  }
  try {
    const user = await User.create({ schoolId, name, email, passwordHash: await bcrypt.hash(randomBytes(48).toString('base64url'), 12), role, phone, accountStatus: 'pending_activation' });
    let invitationStatus = 'sent';
    let activationExpiresAt;
    try { ({ expiresAt: activationExpiresAt } = await issueAccountLink(user, 'activation')); }
    catch { invitationStatus = 'pending_delivery'; }
    return { id: String(user._id), name: user.name, email: user.email, phone: user.phone || '', role: user.role, isActive: user.isActive, accountStatus: user.accountStatus, invitationStatus, activationExpiresAt };
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'An account with this email already exists');
    throw error;
  }
}

export async function createSchoolStudent({ schoolId, name, className, parentEmails, pickupLatitude, pickupLongitude }) {
  const emails = [...new Set(parentEmails)];
  const parents = await User.find({ schoolId, role: 'parent', isActive: true, email: { $in: emails } }).select('_id email').lean();
  const byEmail = new Map(parents.map((parent) => [parent.email, parent]));
  const missing = emails.filter((email) => !byEmail.has(email));
  if (missing.length) {
    throw new AppError(400, 'PARENTS_NOT_FOUND', 'Create active parent accounts in this school before linking students', missing.map((email) => ({ field: 'parentEmails', message: `No active parent account found for ${email}` })));
  }
  const student = await Student.create({
    schoolId,
    name,
    className,
    parentIds: parents.map((parent) => parent._id),
    ...(pickupLatitude !== undefined && { pickupLocation: { latitude: pickupLatitude, longitude: pickupLongitude } })
  });
  return {
    id: String(student._id), name: student.name, className: student.className || '',
    parents: parents.map((parent) => ({ id: String(parent._id), email: parent.email })),
    pickupLocation: student.pickupLocation?.latitude !== undefined ? student.pickupLocation : null,
    isActive: student.isActive
  };
}

export async function updateSchoolStudentPickupLocation({ schoolId, studentId, pickupLocation }) {
  const student = await Student.findOne({ _id: studentId, schoolId });
  if (!student) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found');
  student.pickupLocation = pickupLocation || undefined;
  await student.save();
  return { id: String(student._id), pickupLocation: student.pickupLocation?.latitude !== undefined ? student.pickupLocation : null };
}

export async function updateStudentParents({ schoolId, studentId, parentEmails }) {
  if (!mongoose.isValidObjectId(studentId)) throw new AppError(400, 'VALIDATION_ERROR', 'Invalid student ID');
  const emails = [...new Set(parentEmails)];
  const [student, parents] = await Promise.all([
    Student.findOne({ _id: studentId, schoolId }),
    User.find({ schoolId, role: 'parent', isActive: true, email: { $in: emails } }).select('_id email').lean()
  ]);
  if (!student) throw new AppError(404, 'STUDENT_NOT_FOUND', 'Student not found');
  const byEmail = new Map(parents.map((parent) => [parent.email, parent]));
  const missing = emails.filter((email) => !byEmail.has(email));
  if (missing.length) throw new AppError(400, 'PARENTS_NOT_FOUND', 'One or more active parent accounts were not found in this school', missing.map((email) => ({ field: 'parentEmails', message: `No active parent account found for ${email}` })));
  student.parentIds = parents.map((parent) => parent._id);
  await student.save();
  return { id: String(student._id), parentEmails: parents.map((parent) => parent.email) };
}

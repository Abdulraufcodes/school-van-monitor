import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import { Van } from '../van/van.model.js';
import RosterImport from './rosterImport.model.js';
import { issueAccountLink } from '../auth/accountAccess.service.js';
import { AppError } from '../../src/utils/AppError.js';

const HEADERS = ['record_type', 'name', 'email', 'phone', 'class_name', 'parent_emails', 'pickup_latitude', 'pickup_longitude', 'van_registration', 'driver_email'];
const MAX_ROWS = 500;
const MAX_UPLOAD = 5 * 1024 * 1024;

export async function buildRegistrationTemplate() {
  const workbook = xlsx.utils.book_new();
  const roster = xlsx.utils.aoa_to_sheet([HEADERS]);
  roster['!cols'] = HEADERS.map((header) => ({ wch: Math.max(18, header.length + 3) }));
  xlsx.utils.book_append_sheet(workbook, roster, 'Roster');
  const instructions = xlsx.utils.aoa_to_sheet([
    ['Column', 'How to fill it'],
    ['record_type', 'student, parent, or driver'],
    ['name', 'Required full name for every row'],
    ['email', 'Required for parent and driver; leave blank for student'],
    ['phone', 'Optional for parent and driver; leave blank for student'],
    ['class_name', 'Optional for student; leave blank for parent and driver'],
    ['parent_emails', 'Required for student. Separate multiple parent emails with commas. Parents may be listed in this file or already exist in the school.'],
    ['pickup_latitude / pickup_longitude', 'Optional student pickup coordinates. Provide both or leave both blank.'],
    ['van_registration', 'Required on driver rows to create that driver’s van; required on student rows to assign that student.'],
    ['driver_email', 'Required on student rows. Must identify the driver assigned to the van.'],
    ['Import rule', 'The complete workbook is validated before any record is written. Parents and drivers receive activation links instead of spreadsheet passwords.']
  ]);
  instructions['!cols'] = [{ wch: 28 }, { wch: 120 }];
  xlsx.utils.book_append_sheet(workbook, instructions, 'Instructions');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
}

function cleanCell(value) { return String(value ?? '').trim(); }
function parseWorkbook(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length > MAX_UPLOAD) throw new AppError(413, 'FILE_TOO_LARGE', 'Excel files must be 5 MB or smaller');
  let workbook;
  try { workbook = xlsx.read(buffer, { type: 'buffer', cellDates: false, cellFormula: false, cellHTML: false }); }
  catch { throw new AppError(400, 'INVALID_WORKBOOK', 'The uploaded file could not be read as an Excel workbook'); }
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) throw new AppError(400, 'EMPTY_WORKBOOK', 'The workbook does not contain a worksheet');
  const matrix = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, raw: false, defval: '' });
  if (!matrix.length) throw new AppError(400, 'EMPTY_WORKBOOK', 'The worksheet is empty');
  const headers = matrix[0].map((item) => cleanCell(item).toLowerCase());
  const fileErrors = [];
  for (const header of HEADERS) if (!headers.includes(header)) fileErrors.push({ column: header, message: `Required column "${header}" is missing` });
  for (const header of [...new Set(headers.filter((item, index) => item && headers.indexOf(item) !== index))]) fileErrors.push({ column: header, message: `Column "${header}" appears more than once` });
  for (const header of [...new Set(headers.filter((item) => item && !HEADERS.includes(item)))]) fileErrors.push({ column: header, message: `Unknown column "${header}"` });
  const rows = matrix.slice(1).map((cells, index) => ({ rowNumber: index + 2, values: Object.fromEntries(headers.map((header, columnIndex) => [header, cleanCell(cells[columnIndex])])) })).filter(({ values }) => Object.values(values).some(Boolean));
  if (rows.length > MAX_ROWS) fileErrors.push({ column: 'record_type', message: `A file can contain at most ${MAX_ROWS} non-empty data rows` });
  if (!rows.length) fileErrors.push({ column: 'record_type', message: 'Add at least one non-empty data row' });
  return { rows, fileErrors };
}

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const splitEmails = (value) => cleanCell(value).split(/[\n,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean);

export async function validateBulkRegistration({ buffer, schoolId }) {
  const { rows, fileErrors } = parseWorkbook(buffer);
  const errorsByRow = new Map(rows.map(({ rowNumber }) => [rowNumber, []]));
  const normalized = rows.map(({ rowNumber, values }) => ({
    rowNumber, record_type: cleanCell(values.record_type).toLowerCase(), name: cleanCell(values.name),
    email: cleanCell(values.email).toLowerCase(), phone: cleanCell(values.phone), class_name: cleanCell(values.class_name),
    parent_emails: splitEmails(values.parent_emails), pickup_latitude: cleanCell(values.pickup_latitude), pickup_longitude: cleanCell(values.pickup_longitude),
    van_registration: cleanCell(values.van_registration).toUpperCase(), driver_email: cleanCell(values.driver_email).toLowerCase()
  }));
  const addError = (row, column, message) => errorsByRow.get(row)?.push({ column, message });
  const accountRows = new Map();
  const driverRows = new Map();
  const vanRows = new Map();

  for (const row of normalized) {
    if (!['student', 'parent', 'driver'].includes(row.record_type)) addError(row.rowNumber, 'record_type', 'Use student, parent, or driver');
    if (!row.name || row.name.length < 2 || row.name.length > 100) addError(row.rowNumber, 'name', 'Name must be between 2 and 100 characters');
    if (row.record_type === 'student') {
      if (row.email || row.phone) addError(row.rowNumber, 'email', 'Student rows must leave email and phone blank');
      if (row.class_name.length > 50) addError(row.rowNumber, 'class_name', 'Class must be 50 characters or fewer');
      if (!row.parent_emails.length) addError(row.rowNumber, 'parent_emails', 'At least one parent email is required');
      if (row.parent_emails.length > 5) addError(row.rowNumber, 'parent_emails', 'A student can have at most 5 parent emails');
      if (Boolean(row.pickup_latitude) !== Boolean(row.pickup_longitude)) addError(row.rowNumber, 'pickup_latitude', 'Provide both pickup coordinates or leave both blank');
      if (row.pickup_latitude && (!Number.isFinite(Number(row.pickup_latitude)) || Number(row.pickup_latitude) < -90 || Number(row.pickup_latitude) > 90)) addError(row.rowNumber, 'pickup_latitude', 'Latitude must be a number from -90 to 90');
      if (row.pickup_longitude && (!Number.isFinite(Number(row.pickup_longitude)) || Number(row.pickup_longitude) < -180 || Number(row.pickup_longitude) > 180)) addError(row.rowNumber, 'pickup_longitude', 'Longitude must be a number from -180 to 180');
      if (!validEmail(row.driver_email)) addError(row.rowNumber, 'driver_email', 'Enter the email for the driver assigned to this student');
      if (!row.van_registration || row.van_registration.length > 20) addError(row.rowNumber, 'van_registration', 'Enter a van registration (20 characters maximum)');
      if (row.parent_emails.some((email) => !validEmail(email))) addError(row.rowNumber, 'parent_emails', 'Enter valid parent email addresses');
    } else if (row.record_type === 'parent' || row.record_type === 'driver') {
      if (!validEmail(row.email) || row.email.length > 254) addError(row.rowNumber, 'email', 'Enter a valid email address (254 characters maximum)');
      if (row.phone.length > 20) addError(row.rowNumber, 'phone', 'Phone must be 20 characters or fewer');
      if (row.class_name || row.parent_emails.length || row.pickup_latitude || row.pickup_longitude || row.driver_email) addError(row.rowNumber, 'class_name', 'Account rows must leave student-only columns blank');
      if (row.record_type === 'parent' && row.van_registration) addError(row.rowNumber, 'van_registration', 'Parent rows must leave van_registration blank');
      if (row.record_type === 'driver' && (!row.van_registration || row.van_registration.length > 20)) addError(row.rowNumber, 'van_registration', 'Driver rows must include a van registration (20 characters maximum)');
      if (accountRows.has(row.email)) {
        addError(row.rowNumber, 'email', `Email is duplicated in row ${accountRows.get(row.email).rowNumber}`);
        addError(accountRows.get(row.email).rowNumber, 'email', `Email is duplicated in row ${row.rowNumber}`);
      } else accountRows.set(row.email, row);
      if (row.record_type === 'driver' && row.email && row.van_registration) {
        if (driverRows.has(row.email)) addError(row.rowNumber, 'email', 'A driver email can be listed only once');
        driverRows.set(row.email, row);
        if (vanRows.has(row.van_registration)) {
          addError(row.rowNumber, 'van_registration', `Van registration is duplicated in row ${vanRows.get(row.van_registration).rowNumber}`);
          addError(vanRows.get(row.van_registration).rowNumber, 'van_registration', `Van registration is duplicated in row ${row.rowNumber}`);
        } else vanRows.set(row.van_registration, row);
      }
    }
  }

  const declaredVanRows = [...vanRows.values()];
  const takenRegistrations = declaredVanRows.length
    ? await Van.find({ registrationNumber: { $in: declaredVanRows.map((row) => row.van_registration) } }).select('registrationNumber').lean()
    : [];
  const takenRegistrationSet = new Set(takenRegistrations.map((van) => van.registrationNumber));
  for (const row of declaredVanRows) if (takenRegistrationSet.has(row.van_registration)) addError(row.rowNumber, 'van_registration', 'This van registration is already in use');

  const accountEmails = [...accountRows.keys()].filter(validEmail);
  const existingAccounts = accountEmails.length ? await User.find({ email: { $in: accountEmails } }).select('email').lean() : [];
  const existingAccountEmails = new Set(existingAccounts.map((user) => user.email));
  for (const row of accountRows.values()) if (existingAccountEmails.has(row.email)) addError(row.rowNumber, 'email', 'This email is already registered');

  const studentRows = normalized.filter((row) => row.record_type === 'student');
  const referencedParents = [...new Set(studentRows.flatMap((row) => row.parent_emails))];
  const existingParents = referencedParents.length ? await User.find({ schoolId, role: 'parent', isActive: true, email: { $in: referencedParents }, $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] }).select('email').lean() : [];
  const existingParentEmails = new Set(existingParents.map((item) => item.email));
  for (const student of studentRows) {
    for (const email of student.parent_emails) {
      if (accountRows.has(email) && accountRows.get(email).record_type !== 'parent') addError(student.rowNumber, 'parent_emails', `${email} is listed as a driver, not a parent`);
      else if (accountRows.has(email) && errorsByRow.get(accountRows.get(email).rowNumber).length) addError(student.rowNumber, 'parent_emails', `Parent account for ${email} on row ${accountRows.get(email).rowNumber} has validation errors`);
      else if (!accountRows.has(email) && !existingParentEmails.has(email)) addError(student.rowNumber, 'parent_emails', `No active parent account exists or is included for ${email}`);
    }
  }

  const driverEmails = [...new Set(studentRows.map((row) => row.driver_email).filter(validEmail))];
  const existingDrivers = driverEmails.length ? await User.find({ schoolId, role: 'driver', isActive: true, email: { $in: driverEmails }, $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] }).select('_id email').lean() : [];
  const existingDriverByEmail = new Map(existingDrivers.map((driver) => [driver.email, driver]));
  const existingVans = await Van.find({ schoolId, registrationNumber: { $in: [...new Set(studentRows.map((row) => row.van_registration).filter(Boolean))] }, isActive: true }).populate({ path: 'assignedDriver', select: 'email role schoolId isActive' }).lean();
  const existingVanByRegistration = new Map(existingVans.map((van) => [van.registrationNumber, van]));
  const driverVanPairs = new Map();
  for (const student of studentRows) {
    const driverRow = driverRows.get(student.driver_email);
    const currentVan = existingVanByRegistration.get(student.van_registration);
    if (driverRow) {
      if (driverRow.van_registration !== student.van_registration) addError(student.rowNumber, 'van_registration', `Driver ${student.driver_email} is assigned to ${driverRow.van_registration}, not ${student.van_registration}`);
      if (errorsByRow.get(driverRow.rowNumber).length) addError(student.rowNumber, 'driver_email', `Driver row ${driverRow.rowNumber} has validation errors`);
      if (currentVan) addError(student.rowNumber, 'van_registration', `Van ${student.van_registration} already exists in this school`);
    } else if (!existingDriverByEmail.has(student.driver_email)) {
      addError(student.rowNumber, 'driver_email', `No active school driver exists or is included for ${student.driver_email}`);
    } else if (!currentVan) {
      addError(student.rowNumber, 'van_registration', `No active van ${student.van_registration} exists in this school`);
    } else if (!currentVan.assignedDriver || currentVan.assignedDriver.email !== student.driver_email || currentVan.assignedDriver.role !== 'driver') {
      addError(student.rowNumber, 'driver_email', `Van ${student.van_registration} is not assigned to ${student.driver_email}`);
    }
    if (driverVanPairs.has(student.van_registration) && driverVanPairs.get(student.van_registration) !== student.driver_email) addError(student.rowNumber, 'driver_email', 'This van is assigned to a different driver on another roster row');
    driverVanPairs.set(student.van_registration, student.driver_email);
  }

  const previewRows = normalized.map((row) => ({ rowNumber: row.rowNumber, recordType: row.record_type || '', name: row.name || '', email: row.email || '', parentEmails: row.parent_emails, driverEmail: row.driver_email || '', vanRegistration: row.van_registration || '', errors: errorsByRow.get(row.rowNumber) }));
  const errorCount = fileErrors.length + previewRows.reduce((sum, row) => sum + row.errors.length, 0);
  return { valid: errorCount === 0, fileErrors, rows: previewRows, summary: { totalRows: rows.length, validRows: previewRows.filter((row) => !row.errors.length).length, errorRows: previewRows.filter((row) => row.errors.length).length, errorCount } };
}

export async function previewBulkRegistration(args) { return validateBulkRegistration(args); }

export async function commitBulkRegistration({ buffer, schoolId, adminId }) {
  const preview = await validateBulkRegistration({ buffer, schoolId });
  if (!preview.valid) throw new AppError(400, 'IMPORT_VALIDATION_FAILED', 'Fix every preview error before importing; no records were created', [{ field: 'preview', message: JSON.stringify(preview) }]);

  const rows = parseWorkbook(buffer).rows.map(({ values, rowNumber }) => ({
    rowNumber, ...values, record_type: cleanCell(values.record_type).toLowerCase(), email: cleanCell(values.email).toLowerCase(),
    parent_emails: splitEmails(values.parent_emails), driver_email: cleanCell(values.driver_email).toLowerCase(), van_registration: cleanCell(values.van_registration).toUpperCase()
  }));
  const accountRows = rows.filter((row) => row.record_type === 'parent' || row.record_type === 'driver');
  const driverRows = rows.filter((row) => row.record_type === 'driver');
  const studentRows = rows.filter((row) => row.record_type === 'student');
  const userIds = new Map(accountRows.map((row) => [row.email, new mongoose.Types.ObjectId()]));
  const newVanIds = new Map(driverRows.map((row) => [row.van_registration, new mongoose.Types.ObjectId()]));
  const importId = new mongoose.Types.ObjectId();
  const createdAt = new Date();
  const userDocs = await Promise.all(accountRows.map(async (row) => ({
    _id: userIds.get(row.email), schoolId, name: cleanCell(row.name), email: row.email, phone: cleanCell(row.phone) || undefined,
    passwordHash: await bcrypt.hash(randomBytes(48).toString('base64url'), 12), role: row.record_type, isActive: true, accountStatus: 'pending_activation', createdAt, updatedAt
  })));
  const vanDocs = driverRows.map((row) => ({ _id: newVanIds.get(row.van_registration), schoolId, registrationNumber: row.van_registration, assignedDriver: userIds.get(row.email), isActive: true, createdAt, updatedAt }));
  const parentEmailList = [...new Set(studentRows.flatMap((row) => row.parent_emails))];
  const existingParentDocs = parentEmailList.length ? await User.find({ schoolId, role: 'parent', isActive: true, email: { $in: parentEmailList }, $or: [{ accountStatus: 'active' }, { accountStatus: { $exists: false } }] }).select('_id email').lean() : [];
  const parentIds = new Map(existingParentDocs.map((parent) => [parent.email, parent._id]));
  for (const row of accountRows.filter((item) => item.record_type === 'parent')) parentIds.set(row.email, userIds.get(row.email));
  const existingVanDocs = studentRows.length ? await Van.find({ schoolId, registrationNumber: { $in: [...new Set(studentRows.map((row) => row.van_registration))] } }).select('_id registrationNumber assignedDriver').lean() : [];
  const vanIds = new Map(existingVanDocs.map((van) => [van.registrationNumber, van._id]));
  for (const [registration, id] of newVanIds) vanIds.set(registration, id);
  const studentDocs = studentRows.map((row) => ({
    _id: new mongoose.Types.ObjectId(), schoolId, name: cleanCell(row.name), className: cleanCell(row.class_name) || undefined,
    parentIds: [...new Set(row.parent_emails.map((email) => parentIds.get(email)).filter(Boolean))], assignedVanId: vanIds.get(row.van_registration),
    ...(cleanCell(row.pickup_latitude) && { pickupLocation: { latitude: Number(row.pickup_latitude), longitude: Number(row.pickup_longitude) } }), isActive: true
  }));
  const audit = new RosterImport({ _id: importId, schoolId, importedBy: adminId, created: { parents: accountRows.filter((row) => row.record_type === 'parent').length, drivers: driverRows.length, students: studentRows.length, vans: vanDocs.length }, invitations: userDocs.map((user) => ({ userId: user._id, email: user.email, role: user.role, status: 'pending' })) });
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      if (userDocs.length) await User.insertMany(userDocs, { ordered: true, session });
      if (vanDocs.length) await Van.insertMany(vanDocs, { ordered: true, session });
      if (studentDocs.length) await Student.insertMany(studentDocs, { ordered: true, session });
      await audit.save({ session });
    });
  } catch (error) {
    if (error?.code === 11000) throw new AppError(409, 'ROSTER_CONFLICT', 'An email or van registration was added by another request. Preview the workbook again.');
    if (/Transaction numbers are only allowed|replica set|mongos/i.test(error.message || '')) throw new AppError(503, 'TRANSACTIONS_REQUIRED', 'Bulk import requires MongoDB transactions. Configure MongoDB as a replica set or use a replica-set deployment.');
    throw error;
  } finally { await session.endSession(); }

  let sent = 0;
  for (const user of userDocs) {
    try {
      const { expiresAt } = await issueAccountLink(user, 'activation');
      await RosterImport.updateOne({ _id: importId, 'invitations.userId': user._id }, { $set: { 'invitations.$.status': 'sent', 'invitations.$.sentAt': new Date(), 'invitations.$.expiresAt': expiresAt } });
      sent += 1;
    } catch {
      await RosterImport.updateOne({ _id: importId, 'invitations.userId': user._id }, { $set: { 'invitations.$.status': 'failed' } });
    }
  }
  return { importId: String(importId), created: { parents: audit.created.parents, drivers: audit.created.drivers, students: audit.created.students, vans: audit.created.vans }, invitations: { total: userDocs.length, sent, failed: userDocs.length - sent } };
}

export async function listRosterImports({ schoolId }) {
  return RosterImport.find({ schoolId }).sort({ createdAt: -1 }).limit(50).select('created invitations importedBy createdAt').populate('importedBy', 'name email').lean();
}

export async function resendRosterImportInvitations({ schoolId, importId }) {
  if (!mongoose.isValidObjectId(importId)) throw new AppError(400, 'INVALID_IMPORT_ID', 'Import ID is invalid');
  const rosterImport = await RosterImport.findOne({ _id: importId, schoolId });
  if (!rosterImport) throw new AppError(404, 'IMPORT_NOT_FOUND', 'Roster import not found');
  let sent = 0;
  for (const invitation of rosterImport.invitations.filter((item) => item.status !== 'sent')) {
    const user = await User.findOne({ _id: invitation.userId, schoolId, accountStatus: 'pending_activation', isActive: true });
    if (!user) { invitation.status = 'not_needed'; continue; }
    try {
      const { expiresAt } = await issueAccountLink(user, 'activation');
      invitation.status = 'sent'; invitation.sentAt = new Date(); invitation.expiresAt = expiresAt; sent += 1;
    } catch { invitation.status = 'failed'; }
  }
  await rosterImport.save();
  return { sent, failed: rosterImport.invitations.filter((item) => item.status === 'failed').length };
}

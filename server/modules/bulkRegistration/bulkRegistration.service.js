import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import * as xlsx from 'xlsx';
import User from '../auth/User.model.js';
import Student from '../student/student.model.js';
import { AppError } from '../../src/utils/AppError.js';

const HEADERS = ['record_type', 'name', 'email', 'password', 'phone', 'class_name', 'parent_emails', 'pickup_latitude', 'pickup_longitude'];
const MAX_ROWS = 500;
const PASSWORD_MIN = 12;

export async function buildRegistrationTemplate() {
  const workbook = xlsx.utils.book_new();
  const roster = xlsx.utils.aoa_to_sheet([HEADERS]);
  roster['!cols'] = HEADERS.map((header) => ({ wch: Math.max(16, header.length + 3) }));
  xlsx.utils.book_append_sheet(workbook, roster, 'Roster');
  const instructions = xlsx.utils.aoa_to_sheet([
    ['Column', 'How to fill it'],
    ['record_type', 'student, parent, or driver'],
    ['name', 'Required full name for every row'],
    ['email', 'Required for parent and driver; leave blank for student'],
    ['password', 'Required for parent and driver; 12–128 characters. Leave blank for student.'],
    ['phone', 'Optional for parent and driver; leave blank for student'],
    ['class_name', 'Optional for student; leave blank for parent and driver'],
    ['parent_emails', 'Required for student. Separate multiple parent emails with commas. Parents may be listed in this file or already exist in the school.'],
    ['pickup_latitude', 'Optional student pickup location latitude from -90 to 90. Leave blank if unknown.'],
    ['pickup_longitude', 'Optional student pickup location longitude from -180 to 180. Provide together with pickup_latitude.'],
    ['Import rule', 'The entire workbook must validate before any row is imported.']
  ]);
  instructions['!cols'] = [{ wch: 22 }, { wch: 105 }];
  xlsx.utils.book_append_sheet(workbook, instructions, 'Instructions');
  return xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true });
}

function cleanCell(value) {
  return String(value ?? '').trim();
}

function parseWorkbook(buffer) {
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
  const duplicateHeaders = headers.filter((header, index) => header && headers.indexOf(header) !== index);
  for (const header of [...new Set(duplicateHeaders)]) fileErrors.push({ column: header, message: `Column "${header}" appears more than once` });
  const unknownHeaders = headers.filter((header) => header && !HEADERS.includes(header));
  for (const header of [...new Set(unknownHeaders)]) fileErrors.push({ column: header, message: `Unknown column "${header}"` });
  const rows = matrix.slice(1).map((cells, index) => ({
    rowNumber: index + 2,
    values: Object.fromEntries(headers.map((header, columnIndex) => [header, cleanCell(cells[columnIndex])]))
  })).filter(({ values }) => Object.values(values).some(Boolean));
  if (rows.length > MAX_ROWS) fileErrors.push({ column: 'record_type', message: `A file can contain at most ${MAX_ROWS} non-empty data rows` });
  if (!rows.length) fileErrors.push({ column: 'record_type', message: 'Add at least one non-empty data row' });
  return { rows, fileErrors };
}

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export async function validateBulkRegistration({ buffer, schoolId }) {
  const { rows, fileErrors } = parseWorkbook(buffer);
  const errorsByRow = new Map(rows.map(({ rowNumber }) => [rowNumber, []]));
  const emailRows = new Map();
  const normalized = rows.map(({ rowNumber, values }) => ({
    rowNumber,
    record_type: cleanCell(values.record_type).toLowerCase(),
    name: cleanCell(values.name),
    email: cleanCell(values.email).toLowerCase(),
    password: cleanCell(values.password),
    phone: cleanCell(values.phone),
    class_name: cleanCell(values.class_name),
    parent_emails: cleanCell(values.parent_emails).split(/[\n,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean),
    pickup_latitude: cleanCell(values.pickup_latitude),
    pickup_longitude: cleanCell(values.pickup_longitude)
  }));
  const addError = (row, column, message) => errorsByRow.get(row).push({ column, message });

  for (const row of normalized) {
    if (!['student', 'parent', 'driver'].includes(row.record_type)) addError(row.rowNumber, 'record_type', 'Use student, parent, or driver');
    if (!row.name || row.name.length < 2 || row.name.length > 100) addError(row.rowNumber, 'name', 'Name must be between 2 and 100 characters');
    if (row.record_type === 'student') {
      if (row.email) addError(row.rowNumber, 'email', 'Student rows must leave email blank');
      if (row.password) addError(row.rowNumber, 'password', 'Student rows must leave password blank');
      if (row.class_name.length > 50) addError(row.rowNumber, 'class_name', 'Class must be 50 characters or fewer');
      if (!row.parent_emails.length) addError(row.rowNumber, 'parent_emails', 'At least one parent email is required');
      if (row.parent_emails.length > 5) addError(row.rowNumber, 'parent_emails', 'A student can have at most 5 parent emails');
      if (Boolean(row.pickup_latitude) !== Boolean(row.pickup_longitude)) addError(row.rowNumber, 'pickup_latitude', 'Provide both pickup coordinates or leave both blank');
      if (row.pickup_latitude && (!Number.isFinite(Number(row.pickup_latitude)) || Number(row.pickup_latitude) < -90 || Number(row.pickup_latitude) > 90)) addError(row.rowNumber, 'pickup_latitude', 'Latitude must be a number from -90 to 90');
      if (row.pickup_longitude && (!Number.isFinite(Number(row.pickup_longitude)) || Number(row.pickup_longitude) < -180 || Number(row.pickup_longitude) > 180)) addError(row.rowNumber, 'pickup_longitude', 'Longitude must be a number from -180 to 180');
    } else if (row.record_type === 'parent' || row.record_type === 'driver') {
      if (!validEmail(row.email) || row.email.length > 254) addError(row.rowNumber, 'email', 'Enter a valid email address (254 characters maximum)');
      if (!row.password || row.password.length < PASSWORD_MIN || row.password.length > 128) addError(row.rowNumber, 'password', `Password must be ${PASSWORD_MIN} to 128 characters`);
      if (row.phone.length > 20) addError(row.rowNumber, 'phone', 'Phone must be 20 characters or fewer');
      if (row.class_name) addError(row.rowNumber, 'class_name', 'Account rows must leave class_name blank');
      if (row.parent_emails.length) addError(row.rowNumber, 'parent_emails', 'Account rows must leave parent_emails blank');
      if (row.pickup_latitude || row.pickup_longitude) addError(row.rowNumber, 'pickup_latitude', 'Account rows must leave pickup coordinates blank');
      if (emailRows.has(row.email)) {
        addError(row.rowNumber, 'email', `Email is duplicated in row ${emailRows.get(row.email)}`);
        addError(emailRows.get(row.email), 'email', `Email is duplicated in row ${row.rowNumber}`);
      } else emailRows.set(row.email, row.rowNumber);
    }
  }

  const emails = [...emailRows.keys()].filter(validEmail);
  const existingUsers = emails.length ? await User.find({ email: { $in: emails } }).select('email').lean() : [];
  const existingEmails = new Set(existingUsers.map((user) => user.email));
  for (const row of normalized) if (emailRows.has(row.email) && existingEmails.has(row.email)) addError(row.rowNumber, 'email', 'This email is already registered');

  const parentRows = new Set(normalized.filter((row) => row.record_type === 'parent' && validEmail(row.email)).map((row) => row.email));
  const referencedParentEmails = [...new Set(normalized.flatMap((row) => row.record_type === 'student' ? row.parent_emails : []))];
  const existingParents = referencedParentEmails.length
    ? await User.find({ schoolId, role: 'parent', isActive: true, email: { $in: referencedParentEmails } }).select('email').lean()
    : [];
  const existingParentEmails = new Set(existingParents.map((parent) => parent.email));
  const declaredRole = new Map(normalized.filter((row) => validEmail(row.email)).map((row) => [row.email, row.record_type]));
  const parentRowByEmail = new Map(normalized.filter((row) => row.record_type === 'parent' && validEmail(row.email)).map((row) => [row.email, row.rowNumber]));
  for (const row of normalized.filter((item) => item.record_type === 'student')) {
    for (const email of row.parent_emails) {
      if (declaredRole.has(email) && declaredRole.get(email) !== 'parent') addError(row.rowNumber, 'parent_emails', `${email} is listed as a ${declaredRole.get(email)}, not a parent`);
      else if (parentRowByEmail.has(email) && errorsByRow.get(parentRowByEmail.get(email)).length) addError(row.rowNumber, 'parent_emails', `Parent account for ${email} on row ${parentRowByEmail.get(email)} has validation errors`);
      else if (!parentRows.has(email) && !existingParentEmails.has(email)) addError(row.rowNumber, 'parent_emails', `No active parent account exists or is included for ${email}`);
    }
  }

  const previewRows = normalized.map((row) => ({ rowNumber: row.rowNumber, recordType: row.record_type || '', name: row.name || '', email: row.email || '', parentEmails: row.parent_emails, errors: errorsByRow.get(row.rowNumber) }));
  const errorCount = fileErrors.length + previewRows.reduce((sum, row) => sum + row.errors.length, 0);
  return { valid: errorCount === 0, fileErrors, rows: previewRows, summary: { totalRows: rows.length, validRows: previewRows.filter((row) => row.errors.length === 0).length, errorRows: previewRows.filter((row) => row.errors.length > 0).length, errorCount } };
}

export async function previewBulkRegistration({ buffer, schoolId }) {
  return validateBulkRegistration({ buffer, schoolId });
}

export async function commitBulkRegistration({ buffer, schoolId }) {
  const preview = await validateBulkRegistration({ buffer, schoolId });
  if (!preview.valid) throw new AppError(400, 'IMPORT_VALIDATION_FAILED', 'Fix every preview error before importing; no records were created', [{ field: 'preview', message: JSON.stringify(preview) }]);

  const { rows } = parseWorkbook(buffer);
  const createdUserIds = [];
  const createdStudentIds = [];
  try {
    const accountRows = rows.map(({ values }) => values).filter((row) => ['parent', 'driver'].includes(String(row.record_type).trim().toLowerCase()));
    if (accountRows.length) {
      const now = new Date();
      const userDocs = await Promise.all(accountRows.map(async (row) => ({
        _id: new mongoose.Types.ObjectId(), schoolId, name: cleanCell(row.name), email: cleanCell(row.email).toLowerCase(),
        passwordHash: await bcrypt.hash(cleanCell(row.password), 12), role: cleanCell(row.record_type).toLowerCase(),
        phone: cleanCell(row.phone) || undefined, isActive: true, createdAt: now, updatedAt: now
      })));
      createdUserIds.push(...userDocs.map((user) => user._id));
      await User.insertMany(userDocs, { ordered: true });
    }
    const studentRows = rows.map(({ values }) => values).filter((row) => String(row.record_type).trim().toLowerCase() === 'student');
    if (studentRows.length) {
      const parents = await User.find({ schoolId, role: 'parent', isActive: true, email: { $in: [...new Set(studentRows.flatMap((row) => cleanCell(row.parent_emails).split(/[\n,;]+/).map((email) => email.trim().toLowerCase()).filter(Boolean)))] } }).select('_id email').lean();
      const idsByEmail = new Map(parents.map((parent) => [parent.email, parent._id]));
      const studentDocs = studentRows.map((row) => ({
        _id: new mongoose.Types.ObjectId(), schoolId, name: cleanCell(row.name), className: cleanCell(row.class_name) || undefined,
        parentIds: [...new Set(cleanCell(row.parent_emails).split(/[\n,;]+/).map((email) => idsByEmail.get(email.trim().toLowerCase())).filter(Boolean))],
        ...(cleanCell(row.pickup_latitude) && { pickupLocation: { latitude: Number(row.pickup_latitude), longitude: Number(row.pickup_longitude) } }), isActive: true
      }));
      createdStudentIds.push(...studentDocs.map((student) => student._id));
      await Student.insertMany(studentDocs, { ordered: true });
    }
    return { created: { parents: accountRows.filter((row) => String(row.record_type).trim().toLowerCase() === 'parent').length, drivers: accountRows.filter((row) => String(row.record_type).trim().toLowerCase() === 'driver').length, students: studentRows.length } };
  } catch (error) {
    if (createdStudentIds.length) await Student.deleteMany({ _id: { $in: createdStudentIds }, schoolId });
    if (createdUserIds.length) await User.deleteMany({ _id: { $in: createdUserIds }, schoolId });
    throw error;
  }
}

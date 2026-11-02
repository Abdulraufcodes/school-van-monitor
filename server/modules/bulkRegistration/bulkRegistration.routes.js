import { Router } from 'express';
import multer from 'multer';
import { AppError } from '../../src/utils/AppError.js';
import { authenticate } from '../../src/middleware/authenticate.js';
import { authorize } from '../../src/middleware/authorize.js';
import { requireAdminSchool } from '../../src/middleware/requireAdminSchool.js';
import { success } from '../../src/utils/response.js';
import { buildRegistrationTemplate, commitBulkRegistration, listRosterImports, previewBulkRegistration, resendRosterImportInvitations } from './bulkRegistration.service.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, done) => {
    if (!/\.xlsx$/i.test(file.originalname)) return done(new AppError(400, 'INVALID_FILE_TYPE', 'Upload an .xlsx Excel file'));
    return done(null, true);
  }
});

export const bulkRegistrationRouter = Router();
bulkRegistrationRouter.use(authenticate, authorize('admin'), requireAdminSchool);

bulkRegistrationRouter.get('/template', async (_req, res, next) => {
  try {
    const buffer = await buildRegistrationTemplate();
    res.type('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="school-registration-template.xlsx"');
    return res.send(buffer);
  } catch (error) { return next(error); }
});

bulkRegistrationRouter.get('/history', async (req, res, next) => {
  try { return success(res, await listRosterImports({ schoolId: req.schoolId }), 'Roster import history retrieved'); }
  catch (error) { return next(error); }
});

bulkRegistrationRouter.post('/history/:importId/resend-invitations', async (req, res, next) => {
  try { return success(res, await resendRosterImportInvitations({ schoolId: req.schoolId, importId: req.params.importId }), 'Pending invitations processed'); }
  catch (error) { return next(error); }
});

function parseUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    if (error.code === 'LIMIT_FILE_SIZE') return next(new AppError(413, 'FILE_TOO_LARGE', 'Excel files must be 5 MB or smaller'));
    if (error instanceof multer.MulterError) return next(new AppError(400, 'INVALID_FILE_UPLOAD', 'Upload exactly one Excel workbook in the file field'));
    return next(error);
  });
}

function requireFile(req) {
  if (!req.file) throw new AppError(400, 'FILE_REQUIRED', 'Choose an Excel file to continue');
}

bulkRegistrationRouter.post('/preview', parseUpload, async (req, res, next) => {
  try {
    requireFile(req);
    return success(res, await previewBulkRegistration({ buffer: req.file.buffer, schoolId: req.schoolId }), 'Import preview generated');
  } catch (error) { return next(error); }
});

bulkRegistrationRouter.post('/commit', parseUpload, async (req, res, next) => {
  try {
    requireFile(req);
    const result = await commitBulkRegistration({ buffer: req.file.buffer, schoolId: req.schoolId, adminId: req.user.id });
    return success(res, result, 'All records imported successfully', 201);
  } catch (error) { return next(error); }
});

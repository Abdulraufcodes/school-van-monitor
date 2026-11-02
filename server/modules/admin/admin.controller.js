import { success } from '../../src/utils/response.js';
import { createSchoolStudent, createSchoolUser, listSchoolPeople, updateSchoolStudentPickupLocation, updateStudentParents } from './admin.service.js';

export async function listSchoolPeopleController(req, res, next) {
  try { return success(res, await listSchoolPeople(req.schoolId), 'School people retrieved successfully'); }
  catch (error) { return next(error); }
}

export async function createSchoolUserController(req, res, next) {
  try {
    const user = await createSchoolUser({ schoolId: req.schoolId, ...req.validated.body });
    return success(res, user, 'Account created successfully', 201);
  } catch (error) { return next(error); }
}

export async function createSchoolStudentController(req, res, next) {
  try {
    const student = await createSchoolStudent({ schoolId: req.schoolId, ...req.validated.body });
    return success(res, student, 'Student created successfully', 201);
  } catch (error) { return next(error); }
}

export async function updateStudentParentsController(req, res, next) {
  try {
    const student = await updateStudentParents({ schoolId: req.schoolId, studentId: req.validated.params.studentId, ...req.validated.body });
    return success(res, student, 'Student parent links updated successfully');
  } catch (error) { return next(error); }
}

export async function updateStudentPickupLocationController(req, res, next) {
  try {
    const student = await updateSchoolStudentPickupLocation({ schoolId: req.schoolId, studentId: req.validated.params.studentId, ...req.validated.body });
    return success(res, student, 'Student pickup location updated successfully');
  } catch (error) { return next(error); }
}

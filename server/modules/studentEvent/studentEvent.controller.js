import { success } from '../../src/utils/response.js';
import {
    requestPickupOtp,
    verifyPickupOtpAndRecord,
    requestDropoffOtp,
    verifyDropoffOtpAndRecord,
    getStudentEventHistory,
    getTripStudentStatuses,
    getStudentTripStatus
} from './studentEvent.service.js';

export async function requestPickupOtpController(req, res, next) {
    try {
        const result = await requestPickupOtp({
            tripId: req.validated.params.tripId,
            studentId: req.validated.params.studentId,
            driverId: req.user.id,
            schoolId: req.user.schoolId
        });

        return success(res, result, 'Pickup OTP sent successfully');
    } catch (error) {
        return next(error);
    }
}

export async function verifyPickupOtpController(req, res, next) {
    try {
        const result = await verifyPickupOtpAndRecord({
            tripId: req.validated.params.tripId,
            studentId: req.validated.params.studentId,
            driverId: req.user.id,
            schoolId: req.user.schoolId,
            otp: req.validated.body.otp
        });

        return success(res, result, 'Student pickup verified successfully');
    } catch (error) {
        return next(error);
    }
}


export async function requestDropoffOtpController(req, res, next) {
    try {
        const result = await requestDropoffOtp({
            tripId: req.validated.params.tripId,
            studentId: req.validated.params.studentId,
            driverId: req.user.id,
            schoolId: req.user.schoolId
        });

        return success(res, result, 'Drop-off OTP sent successfully');
    } catch (error) {
        return next(error);
    }
}

export async function verifyDropoffOtpController(req, res, next) {
    try {
        const result = await verifyDropoffOtpAndRecord({
            tripId: req.validated.params.tripId,
            studentId: req.validated.params.studentId,
            driverId: req.user.id,
            schoolId: req.user.schoolId,
            otp: req.validated.body.otp
        });

        return success(res, result, 'Student dropped off successfully');
    } catch (error) {
        return next(error);
    }
}


export async function getStudentEventHistoryController(req, res, next) {
    try {
        const result = await getStudentEventHistory({
            studentId: req.validated.params.studentId,
            userId: req.user.id,
            schoolId: req.user.schoolId,
            role: req.user.role,
            page: req.validated.query.page,
            limit: req.validated.query.limit
        });

        return success(res, result, 'Student event history retrieved successfully');
    } catch (error) {
        return next(error);
    }
}

export async function getTripStudentStatusesController(req, res, next) {
    try {
        const result = await getTripStudentStatuses({
            tripId: req.validated.params.tripId,
            driverId: req.user.id,
            schoolId: req.user.schoolId
        });

        return success(
            res,
            result,
            'Trip student statuses retrieved successfully'
        );
    } catch (error) {
        return next(error);
    }
}

// Retrieves an individual student's status for a particular trip.
export async function getStudentTripStatusController(req, res, next) {
    try {
        const result = await getStudentTripStatus({
            tripId: req.validated.params.tripId,
            studentId: req.validated.params.studentId,
            userId: req.user.id,
            schoolId: req.user.schoolId,
            role: req.user.role
        });

        return success(
            res,
            result,
            'Student trip status retrieved successfully'
        );
    } catch (error) {
        return next(error);
    }
}
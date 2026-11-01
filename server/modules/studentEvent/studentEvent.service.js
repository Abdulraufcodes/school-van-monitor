import PickupOtp from './pickupOtp.model.js';
import StudentEvent from './studentEvent.model.js';
import Student from '../student/student.model.js';
import User from '../auth/User.model.js';
import { Trip } from '../trip/trip.model.js';
import { Van } from '../van/van.model.js';
import { AppError } from '../../src/utils/AppError.js';
import mongoose from 'mongoose';

import { sendPickupOtpEmail } from '../notification/email.service.js';
import {
    generatePickupOtp,
    hashPickupOtp,
    verifyPickupOtp
} from './pickupOtp.utils.js';

import { emitStudentEvent } from '../../src/sockets/socketServer.js';

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const OTP_RESEND_COOLDOWN_MS = 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;

// Verify the driver's active trip and the student's assignment.
async function getPickupContext({ tripId, studentId, driverId, schoolId }) {
    const trip = await Trip.findOne({
        _id: tripId,
        driverId,
        schoolId,
        status: 'active'
    }).lean();

    if (!trip) {
        throw new AppError(404, 'ACTIVE_TRIP_NOT_FOUND', 'Active trip not found');
    }

    const van = await Van.findOne({
        _id: trip.vanId,
        schoolId,
        assignedDriver: driverId,
        isActive: true
    }).lean();

    if (!van) {
        throw new AppError(403, 'VAN_ACCESS_DENIED', 'Driver is not assigned to this van');
    }

    const student = await Student.findOne({
        _id: studentId,
        schoolId,
        assignedVanId: van._id,
        isActive: true
    }).lean();

    if (!student) {
        throw new AppError(
            404,
            'STUDENT_NOT_ASSIGNED',
            'Active student assigned to this trip was not found'
        );
    }

    return { trip, van, student };
}

export async function getTripStudentStatuses({
    tripId,
    driverId,
    schoolId
}) {
    const trip = await Trip.findOne({
        _id: tripId,
        driverId,
        schoolId,
        status: 'active'
    }).lean();

    if (!trip) {
        throw new AppError(
            404,
            'ACTIVE_TRIP_NOT_FOUND',
            'Active trip not found'
        );
    }

    const van = await Van.findOne({
        _id: trip.vanId,
        schoolId,
        assignedDriver: driverId,
        isActive: true
    }).lean();

    if (!van) {
        throw new AppError(
            403,
            'VAN_ACCESS_DENIED',
            'Driver is not assigned to this van'
        );
    }

    const students = await Student.find({
        schoolId,
        assignedVanId: van._id,
        isActive: true
    })
        .select('_id name className')
        .sort({ name: 1 })
        .lean();

    const studentIds = students.map(student => student._id);

    const events = studentIds.length
        ? await StudentEvent.find({
            schoolId,
            tripId: trip._id,
            studentId: { $in: studentIds }
        })
            .select('studentId type occurredAt')
            .lean()
        : [];

    const eventMap = new Map();

    for (const event of events) {
        const id = String(event.studentId);

        if (!eventMap.has(id)) {
            eventMap.set(id, {});
        }

        const status = eventMap.get(id);

        if (event.type === 'picked_up') {
            status.pickupTime = event.occurredAt;
        }

        if (event.type === 'dropped_off') {
            status.dropoffTime = event.occurredAt;
        }
    }

    return {
        tripId: String(trip._id),
        vanId: String(van._id),
        totalStudents: students.length,
        students: students.map(student => {
            const status = eventMap.get(String(student._id)) ?? {};

            return {
                studentId: String(student._id),
                name: student.name,
                className: student.className,
                pickupStatus: status.pickupTime ? 'picked_up' : 'pending',
                pickupTime: status.pickupTime ?? null,
                dropoffStatus: status.dropoffTime ? 'dropped_off' : 'pending',
                dropoffTime: status.dropoffTime ?? null
            };
        })
    };
}

/**
 * Retrieves one student's pickup/drop-off status for a particular trip.
 *
 * Access rules:
 * - Driver: must own the trip.
 * - Parent: must be linked to the student.
 * - Admin: must belong to the same school.
 *
 * The student must be assigned to the van associated with the trip.
 */
export async function getStudentTripStatus({
    tripId,
    studentId,
    userId,
    schoolId,
    role
}) {
    // Find the trip inside the authenticated user's school.
    const tripFilter = {
        _id: tripId,
        schoolId
    };

    // Drivers can only inspect their own trips.
    if (role === 'driver') {
        tripFilter.driverId = userId;
    }

    const trip = await Trip.findOne(tripFilter).lean();

    if (!trip) {
        throw new AppError(
            404,
            'TRIP_NOT_FOUND',
            'Trip was not found or you do not have access'
        );
    }

    // Find the student in the same school and assigned to this trip's van.
    const studentFilter = {
        _id: studentId,
        schoolId,
        assignedVanId: trip.vanId,
        isActive: true
    };

    // Parents can only access their own linked children.
    if (role === 'parent') {
        studentFilter.parentIds = userId;
    }

    const student = await Student.findOne(studentFilter)
        .select('_id name className')
        .lean();

    if (!student) {
        throw new AppError(
            404,
            'STUDENT_NOT_FOUND',
            'Student was not found or you do not have access'
        );
    }

    // Retrieve both events for this student and trip.
    const events = await StudentEvent.find({
        schoolId,
        tripId: trip._id,
        studentId: student._id
    })
        .select('type occurredAt')
        .lean();

    const pickupEvent = events.find(
        event => event.type === 'picked_up'
    );

    const dropoffEvent = events.find(
        event => event.type === 'dropped_off'
    );

    return {
        tripId: String(trip._id),
        student: {
            id: String(student._id),
            name: student.name,
            className: student.className
        },
        pickup: {
            status: pickupEvent ? 'picked_up' : 'pending',
            occurredAt: pickupEvent?.occurredAt ?? null
        },
        dropoff: {
            status: dropoffEvent ? 'dropped_off' : 'pending',
            occurredAt: dropoffEvent?.occurredAt ?? null
        }
    };
}

// Step 1: Generate and email a pickup OTP to all linked active parents.
export async function requestPickupOtp({
    tripId,
    studentId,
    driverId,
    schoolId,
    sendEmail = sendPickupOtpEmail
}) {
    const { trip, student } = await getPickupContext({
        tripId,
        studentId,
        driverId,
        schoolId
    });

    // A student cannot be picked up twice on the same trip.
    const existingEvent = await StudentEvent.exists({
        tripId: trip._id,
        studentId: student._id,
        type: 'picked_up'
    });

    if (existingEvent) {
        throw new AppError(409, 'ALREADY_PICKED_UP', 'Student has already been picked up');
    }

    // Only active parent accounts linked to this student receive the OTP.
    const parents = await User.find({
        _id: { $in: student.parentIds ?? [] },
        schoolId,
        role: 'parent',
        isActive: true
    })
        .select('_id email')
        .lean();

    if (!parents.length) {
        throw new AppError(
            400,
            'PARENT_EMAIL_NOT_FOUND',
            'No active linked parent account is available'
        );
    }

    if (parents.some((parent) => !parent.email)) {
        throw new AppError(
            400,
            'PARENT_EMAIL_NOT_FOUND',
            'A linked parent account does not have an email address'
        );
    }

    const now = new Date();

    const existingOtp = await PickupOtp.findOne({
        tripId: trip._id,
        studentId: student._id,
        purpose: 'pickup'
    }).lean();

    // Prevent repeated emails while an existing OTP is still active.
    if (
        existingOtp &&
        !existingOtp.consumedAt &&
        existingOtp.expiresAt > now &&
        now.getTime() - new Date(existingOtp.lastSentAt).getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
        throw new AppError(
            429,
            'OTP_RESEND_COOLDOWN',
            'Please wait before requesting another OTP'
        );
    }

    const otp = generatePickupOtp();

    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV ONLY] Pickup OTP: ${otp}`);
    }

    // Replace the previous OTP so only the newest code can be used.
    const otpRecord = await PickupOtp.findOneAndUpdate(
        {
            tripId: trip._id,
            studentId: student._id,
            purpose: 'pickup'
        },
        {
            $set: {
                schoolId,
                driverId,
                purpose: 'pickup',
                parentIds: parents.map((parent) => parent._id),
                otpHash: hashPickupOtp(otp),
                expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
                attempts: 0,
                consumedAt: null,
                lastSentAt: now
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    try {
        // Send separately so parents do not see each other's email addresses.
        if (
            process.env.NODE_ENV === 'development' &&
            sendEmail === sendPickupOtpEmail
        ) {
            console.log('[DEV ONLY] Skipping pickup OTP email.');
        } else {
            await Promise.all(
                parents.map((parent) =>
                    sendEmail({
                        to: parent.email,
                        studentName: student.name,
                        otp
                    })
                )
            );
        }
    } catch (error) {
        // Do not leave a usable OTP if email delivery failed.
        await PickupOtp.deleteOne({ _id: otpRecord._id });
        throw error;
    }

    return {
        studentId: String(student._id),
        expiresInSeconds: 300,
        resendAvailableInSeconds: 60
    };
}

// Step 2: Verify the OTP and record the official pickup event.
export async function verifyPickupOtpAndRecord({
    tripId,
    studentId,
    driverId,
    schoolId,
    otp
}) {
    const { trip, van, student } = await getPickupContext({
        tripId,
        studentId,
        driverId,
        schoolId
    });

    const otpRecord = await PickupOtp.findOne({
        tripId: trip._id,
        studentId: student._id,
        schoolId,
        driverId,
        purpose: 'pickup'
    }).select('+otpHash');

    if (!otpRecord || otpRecord.consumedAt) {
        throw new AppError(400, 'OTP_INVALID', 'OTP is invalid or has already been used');
    }

    const now = new Date();

    if (otpRecord.expiresAt <= now) {
        throw new AppError(400, 'OTP_EXPIRED', 'OTP has expired. Request a new one');
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        throw new AppError(429, 'OTP_ATTEMPTS_EXCEEDED', 'Too many incorrect attempts');
    }

    if (!verifyPickupOtp(otp, otpRecord.otpHash)) {
        // Increment attempts atomically to limit repeated guesses.
        await PickupOtp.updateOne(
            {
                _id: otpRecord._id,
                consumedAt: null,
                attempts: { $lt: MAX_OTP_ATTEMPTS }
            },
            { $inc: { attempts: 1 } }
        );

        throw new AppError(400, 'OTP_INVALID', 'Incorrect OTP');
    }

    // Consume the OTP atomically so it cannot verify twice.
    const consumedOtp = await PickupOtp.findOneAndUpdate(
        {
            _id: otpRecord._id,
            consumedAt: null,
            expiresAt: { $gt: now },
            attempts: { $lt: MAX_OTP_ATTEMPTS }
        },
        { $set: { consumedAt: now } },
        { new: true }
    );

    if (!consumedOtp) {
        throw new AppError(400, 'OTP_INVALID', 'OTP is expired or has already been used');
    }

    try {
        const event = await StudentEvent.create({
            schoolId,
            studentId: student._id,
            tripId: trip._id,
            vanId: van._id,
            driverId,
            type: 'picked_up',
            occurredAt: now
        });

        emitStudentEvent(event);

        return {
            id: String(event._id),
            studentId: String(student._id),
            tripId: String(trip._id),
            type: event.type,
            occurredAt: event.occurredAt.toISOString()
        };
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                409,
                'ALREADY_PICKED_UP',
                'Student has already been picked up'
            );
        }

        const eventExists = await StudentEvent.exists({
            tripId: trip._id,
            studentId: student._id,
            type: 'picked_up'
        });

        if (!eventExists) {
            await PickupOtp.updateOne(
                {
                    _id: consumedOtp._id,
                    consumedAt: now
                },
                {
                    $set: { consumedAt: null }
                }
            );
        }

        throw error;
    }
}


// Step 3: Generate and email a separate OTP for student drop-off.
export async function requestDropoffOtp({
    tripId,
    studentId,
    driverId,
    schoolId,
    sendEmail = sendPickupOtpEmail
}) {
    const { trip, student } = await getPickupContext({
        tripId,
        studentId,
        driverId,
        schoolId
    });

    // A student must have boarded this van before they can be dropped off.
    const pickupEvent = await StudentEvent.exists({
        tripId: trip._id,
        studentId: student._id,
        type: 'picked_up'
    });

    if (!pickupEvent) {
        throw new AppError(
            409,
            'STUDENT_NOT_PICKED_UP',
            'Student must be picked up before drop-off'
        );
    }

    // Prevent a second drop-off for the same student on this trip.
    const existingDropoff = await StudentEvent.exists({
        tripId: trip._id,
        studentId: student._id,
        type: 'dropped_off'
    });

    if (existingDropoff) {
        throw new AppError(
            409,
            'ALREADY_DROPPED_OFF',
            'Student has already been dropped off'
        );
    }

    // Send the OTP only to active parent accounts linked to this student.
    const parents = await User.find({
        _id: { $in: student.parentIds ?? [] },
        schoolId,
        role: 'parent',
        isActive: true
    })
        .select('_id email')
        .lean();

    if (!parents.length || parents.some((parent) => !parent.email)) {
        throw new AppError(
            400,
            'PARENT_EMAIL_NOT_FOUND',
            'No active linked parent with an email address is available'
        );
    }

    const now = new Date();

    const existingOtp = await PickupOtp.findOne({
        tripId: trip._id,
        studentId: student._id,
        purpose: 'dropoff'
    }).lean();

    // Enforce the same 60-second resend cooldown as pickup.
    if (
        existingOtp &&
        !existingOtp.consumedAt &&
        existingOtp.expiresAt > now &&
        now.getTime() - new Date(existingOtp.lastSentAt).getTime() <
        OTP_RESEND_COOLDOWN_MS
    ) {
        throw new AppError(
            429,
            'OTP_RESEND_COOLDOWN',
            'Please wait before requesting another OTP'
        );
    }

    const otp = generatePickupOtp();

    if (process.env.NODE_ENV === 'development') {
        console.log(`[DEV ONLY] Pickup OTP: ${otp}`);
    }

    // Store a hash and keep this OTP separate from the pickup OTP.
    const otpRecord = await PickupOtp.findOneAndUpdate(
        {
            tripId: trip._id,
            studentId: student._id,
            purpose: 'dropoff'
        },
        {
            $set: {
                schoolId,
                driverId,
                purpose: 'dropoff',
                parentIds: parents.map((parent) => parent._id),
                otpHash: hashPickupOtp(otp),
                expiresAt: new Date(now.getTime() + OTP_EXPIRY_MS),
                attempts: 0,
                consumedAt: null,
                lastSentAt: now
            }
        },
        {
            upsert: true,
            new: true,
            runValidators: true,
            setDefaultsOnInsert: true
        }
    );

    try {
        // Send individual emails so parents cannot see each other's addresses.
        if (
            process.env.NODE_ENV === 'development' &&
            sendEmail === sendPickupOtpEmail
        ) {
            console.log('[DEV ONLY] Skipping drop-off OTP email.');
        } else {
            await Promise.all(
                parents.map((parent) =>
                    sendEmail({
                        to: parent.email,
                        studentName: student.name,
                        otp
                    })
                )
            );
        }
    } catch (error) {
        await PickupOtp.deleteOne({ _id: otpRecord._id });
        throw error;
    }

    return {
        studentId: String(student._id),
        expiresInSeconds: 300,
        resendAvailableInSeconds: 60
    };
}

// Step 4: Verify the drop-off OTP and record the official drop-off event.
export async function verifyDropoffOtpAndRecord({
    tripId,
    studentId,
    driverId,
    schoolId,
    otp
}) {
    const { trip, van, student } = await getPickupContext({
        tripId,
        studentId,
        driverId,
        schoolId
    });

    // Recheck the pickup prerequisite at verification time.
    const pickupEvent = await StudentEvent.exists({
        tripId: trip._id,
        studentId: student._id,
        type: 'picked_up'
    });

    if (!pickupEvent) {
        throw new AppError(
            409,
            'STUDENT_NOT_PICKED_UP',
            'Student must be picked up before drop-off'
        );
    }

    const existingDropoff = await StudentEvent.exists({
        tripId: trip._id,
        studentId: student._id,
        type: 'dropped_off'
    });

    if (existingDropoff) {
        throw new AppError(
            409,
            'ALREADY_DROPPED_OFF',
            'Student has already been dropped off'
        );
    }

    const otpRecord = await PickupOtp.findOne({
        tripId: trip._id,
        studentId: student._id,
        schoolId,
        driverId,
        purpose: 'dropoff'
    }).select('+otpHash');

    if (!otpRecord || otpRecord.consumedAt) {
        throw new AppError(
            400,
            'OTP_INVALID',
            'OTP is invalid or has already been used'
        );
    }

    const now = new Date();

    if (otpRecord.expiresAt <= now) {
        throw new AppError(
            400,
            'OTP_EXPIRED',
            'OTP has expired. Request a new one'
        );
    }

    if (otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
        throw new AppError(
            429,
            'OTP_ATTEMPTS_EXCEEDED',
            'Too many incorrect attempts'
        );
    }

    if (!verifyPickupOtp(otp, otpRecord.otpHash)) {
        await PickupOtp.updateOne(
            {
                _id: otpRecord._id,
                consumedAt: null,
                attempts: { $lt: MAX_OTP_ATTEMPTS }
            },
            { $inc: { attempts: 1 } }
        );

        throw new AppError(400, 'OTP_INVALID', 'Incorrect OTP');
    }

    // Atomically consume the drop-off OTP before creating the event.
    const consumedOtp = await PickupOtp.findOneAndUpdate(
        {
            _id: otpRecord._id,
            consumedAt: null,
            expiresAt: { $gt: now },
            attempts: { $lt: MAX_OTP_ATTEMPTS }
        },
        { $set: { consumedAt: now } },
        { new: true }
    );

    if (!consumedOtp) {
        throw new AppError(
            400,
            'OTP_INVALID',
            'OTP is expired or has already been used'
        );
    }

    try {
        const event = await StudentEvent.create({
            schoolId,
            studentId: student._id,
            tripId: trip._id,
            vanId: van._id,
            driverId,
            type: 'dropped_off',
            occurredAt: now
        });

        emitStudentEvent(event);

        return {
            id: String(event._id),
            studentId: String(student._id),
            tripId: String(trip._id),
            type: event.type,
            occurredAt: event.occurredAt.toISOString()
        };
    } catch (error) {
        if (error?.code === 11000) {
            throw new AppError(
                409,
                'ALREADY_DROPPED_OFF',
                'Student has already been dropped off'
            );
        }

        const eventExists = await StudentEvent.exists({
            tripId: trip._id,
            studentId: student._id,
            type: 'dropped_off'
        });

        if (!eventExists) {
            await PickupOtp.updateOne(
                {
                    _id: consumedOtp._id,
                    consumedAt: now
                },
                {
                    $set: { consumedAt: null }
                }
            );
        }

        throw error;
    }
}


export async function getStudentEventHistory({
    studentId,
    userId,
    schoolId,
    role,
    page = 1,
    limit = 20
}) {
    // Parents can access only students linked to their account.
    const studentFilter = {
        _id: studentId,
        schoolId,
        isActive: true
    };

    if (role === 'parent') {
        studentFilter.parentIds = userId;
    }

    const student = await Student.findOne(studentFilter).lean();

    if (!student) {
        throw new AppError(
            404,
            'STUDENT_NOT_FOUND',
            'Student was not found or you do not have access'
        );
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));

    const filter = {
        schoolId,
        studentId: student._id
    };

    const [events, total] = await Promise.all([
        StudentEvent.find(filter)
            .sort({ occurredAt: -1 })
            .skip((safePage - 1) * safeLimit)
            .limit(safeLimit)
            .lean(),

        StudentEvent.countDocuments(filter)
    ]);

    return {
        student: {
            id: String(student._id),
            name: student.name
        },
        events: events.map((event) => ({
            id: String(event._id),
            tripId: String(event.tripId),
            vanId: String(event.vanId),
            driverId: String(event.driverId),
            type: event.type,
            occurredAt: event.occurredAt
        })),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit)
        }
    };
}

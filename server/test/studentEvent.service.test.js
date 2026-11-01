import 'dotenv/config';
import test from 'node:test';
import assert from 'node:assert/strict';

import { Trip } from '../modules/trip/trip.model.js';
import { Van } from '../modules/van/van.model.js';
import Student from '../modules/student/student.model.js';
import User from '../modules/auth/User.model.js';
import PickupOtp from '../modules/studentEvent/pickupOtp.model.js';
import StudentEvent from '../modules/studentEvent/studentEvent.model.js';

import {
    requestPickupOtp,
    verifyPickupOtpAndRecord
} from '../modules/studentEvent/studentEvent.service.js';

import {
    generatePickupOtp,
    hashPickupOtp
} from '../modules/studentEvent/pickupOtp.utils.js';

import {
    requestDropoffOtp,
    verifyDropoffOtpAndRecord,
    getStudentEventHistory
} from '../modules/studentEvent/studentEvent.service.js';

const schoolId = '507f1f77bcf86cd799439012';
const driverId = '507f1f77bcf86cd799439011';
const vanId = '507f1f77bcf86cd799439013';
const tripId = '507f1f77bcf86cd799439014';
const studentId = '507f1f77bcf86cd799439015';
const parentId = '507f1f77bcf86cd799439016';

const driverRequest = { tripId, studentId, driverId, schoolId };

function mockPickupContext(t, studentOverrides = {}) {
    t.mock.method(Trip, 'findOne', () => ({
        lean: async () => ({
            _id: tripId,
            vanId,
            driverId,
            schoolId,
            status: 'active'
        })
    }));

    t.mock.method(Van, 'findOne', () => ({
        lean: async () => ({
            _id: vanId,
            schoolId,
            assignedDriver: driverId,
            isActive: true
        })
    }));

    t.mock.method(Student, 'findOne', () => ({
        lean: async () => ({
            _id: studentId,
            name: 'Test Student',
            schoolId,
            assignedVanId: vanId,
            parentIds: [parentId],
            isActive: true,
            ...studentOverrides
        })
    }));
}

function mockParents(t) {
    t.mock.method(User, 'find', () => ({
        select() { return this; },
        lean: async () => [{
            _id: parentId,
            email: 'parent@example.com'
        }]
    }));
}

function mockNoExistingPickup(t) {
    t.mock.method(StudentEvent, 'exists', async () => null);
}

function mockOtpLookup(t, otpRecord) {
    t.mock.method(PickupOtp, 'findOne', () => ({
        lean: async () => otpRecord
    }));
}

test('pickup OTP request rejects a student without linked parents', async (t) => {
    mockPickupContext(t, { parentIds: [] });
    mockNoExistingPickup(t);

    t.mock.method(User, 'find', () => ({
        select() { return this; },
        lean: async () => []
    }));

    await assert.rejects(
        requestPickupOtp(driverRequest),
        { code: 'PARENT_EMAIL_NOT_FOUND' }
    );
});

test('pickup OTP request rejects a student already picked up', async (t) => {
    mockPickupContext(t);

    t.mock.method(StudentEvent, 'exists', async () => ({ _id: 'existing-event' }));

    await assert.rejects(
        requestPickupOtp(driverRequest),
        { code: 'ALREADY_PICKED_UP' }
    );
});

test('pickup OTP request rejects another driver or inactive trip', async (t) => {
    t.mock.method(Trip, 'findOne', () => ({
        lean: async () => null
    }));

    await assert.rejects(
        requestPickupOtp(driverRequest),
        { code: 'ACTIVE_TRIP_NOT_FOUND' }
    );
});

test('pickup OTP request enforces the resend cooldown', async (t) => {
    mockPickupContext(t);
    mockNoExistingPickup(t);
    mockParents(t);

    const now = new Date();

    mockOtpLookup(t, {
        consumedAt: null,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        lastSentAt: now
    });

    await assert.rejects(
        requestPickupOtp(driverRequest),
        { code: 'OTP_RESEND_COOLDOWN' }
    );
});


test('pickup OTP request stores a hash and emails the OTP to linked parents', async (t) => {
    mockPickupContext(t);
    mockNoExistingPickup(t);
    mockParents(t);
    mockOtpLookup(t, null);

    let savedOtp;
    let savedFilter;
    let emailPayload;

    t.mock.method(PickupOtp, 'findOneAndUpdate', async (filter, update) => {
        savedFilter = filter;
        savedOtp = update.$set;
        return { _id: 'otp-record-id' };
    });

    const result = await requestPickupOtp({
        ...driverRequest,
        sendEmail: async (payload) => {
            emailPayload = payload;
        }
    });

    assert.deepEqual(savedFilter, {
        tripId,
        studentId,
        purpose: 'pickup'
    });
    assert.equal(savedOtp.purpose, 'pickup');

    assert.equal(savedOtp.parentIds.length, 1);
    assert.equal(String(savedOtp.parentIds[0]), parentId);
    assert.equal(savedOtp.attempts, 0);
    assert.equal(savedOtp.consumedAt, null);

    assert.ok(savedOtp.otpHash);
    assert.equal(savedOtp.otpHash.length, 64);

    assert.equal(emailPayload.to, 'parent@example.com');
    assert.equal(emailPayload.studentName, 'Test Student');
    assert.match(emailPayload.otp, /^\d{6}$/);

    assert.notEqual(savedOtp.otpHash, emailPayload.otp);

    assert.equal(result.studentId, studentId);
    assert.equal(result.expiresInSeconds, 300);
    assert.equal(result.resendAvailableInSeconds, 60);
});


test('incorrect OTP increments the attempt count', async (t) => {
    mockPickupContext(t);

    const otp = generatePickupOtp();

    const record = {
        _id: 'otp-record-id',
        otpHash: hashPickupOtp(otp),
        attempts: 0,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null
    };

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => record
    }));

    let update;
    t.mock.method(PickupOtp, 'updateOne', async (filter, values) => {
        update = values;
        return { modifiedCount: 1 };
    });

    await assert.rejects(
        verifyPickupOtpAndRecord({ ...driverRequest, otp: '000000' }),
        { code: 'OTP_INVALID' }
    );

    assert.deepEqual(update, { $inc: { attempts: 1 } });
});

test('third incorrect OTP attempt is blocked', async (t) => {
    mockPickupContext(t);

    const record = {
        _id: 'otp-record-id',
        otpHash: hashPickupOtp(generatePickupOtp()),
        attempts: 3,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
        consumedAt: null
    };

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => record
    }));

    await assert.rejects(
        verifyPickupOtpAndRecord({ ...driverRequest, otp: '000000' }),
        { code: 'OTP_ATTEMPTS_EXCEEDED' }
    );
});

test('expired OTP is rejected', async (t) => {
    mockPickupContext(t);

    const record = {
        _id: 'otp-record-id',
        otpHash: hashPickupOtp(generatePickupOtp()),
        attempts: 0,
        expiresAt: new Date(Date.now() - 1000),
        consumedAt: null
    };

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => record
    }));

    await assert.rejects(
        verifyPickupOtpAndRecord({ ...driverRequest, otp: '123456' }),
        { code: 'OTP_EXPIRED' }
    );
});

test('consumed OTP cannot be reused', async (t) => {
    mockPickupContext(t);

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => ({
            consumedAt: new Date(),
            attempts: 0
        })
    }));

    await assert.rejects(
        verifyPickupOtpAndRecord({ ...driverRequest, otp: '123456' }),
        { code: 'OTP_INVALID' }
    );
});


test('correct OTP creates a pickup event and consumes the OTP', async (t) => {
    mockPickupContext(t);

    const otp = generatePickupOtp();
    const now = new Date();

    const record = {
        _id: 'otp-record-id',
        otpHash: hashPickupOtp(otp),
        attempts: 0,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        consumedAt: null
    };

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => record
    }));

    let consumeFilter;
    let createdEvent;

    t.mock.method(PickupOtp, 'findOneAndUpdate', async (filter) => {
        consumeFilter = filter;
        return { ...record, consumedAt: now };
    });

    t.mock.method(StudentEvent, 'create', async (data) => {
        createdEvent = data;

        return {
            _id: '507f1f77bcf86cd799439017',
            ...data
        };
    });

    const result = await verifyPickupOtpAndRecord({
        ...driverRequest,
        otp
    });

    assert.equal(consumeFilter._id, record._id);
    assert.equal(consumeFilter.consumedAt, null);

    assert.equal(createdEvent.type, 'picked_up');
    assert.equal(String(createdEvent.studentId), studentId);
    assert.equal(String(createdEvent.tripId), tripId);
    assert.equal(String(createdEvent.vanId), vanId);
    assert.equal(String(createdEvent.driverId), driverId);

    assert.equal(result.type, 'picked_up');
    assert.equal(result.studentId, studentId);
    assert.equal(result.tripId, tripId);
});



test('drop-off OTP cannot be requested before student pickup', async (t) => {
    mockPickupContext(t);

    t.mock.method(StudentEvent, 'exists', async (filter) => {
        if (filter.type === 'picked_up') return null;
        return null;
    });

    await assert.rejects(
        requestDropoffOtp({
            ...driverRequest,
            sendEmail: async () => {}
        }),
        { code: 'STUDENT_NOT_PICKED_UP' }
    );
});

test('drop-off OTP rejects a student already dropped off', async (t) => {
    mockPickupContext(t);

    t.mock.method(StudentEvent, 'exists', async (filter) => {
        if (filter.type === 'picked_up') return { _id: 'pickup-event-id' };
        if (filter.type === 'dropped_off') return { _id: 'dropoff-event-id' };
        return null;
    });

    await assert.rejects(
        requestDropoffOtp({
            ...driverRequest,
            sendEmail: async () => {}
        }),
        { code: 'ALREADY_DROPPED_OFF' }
    );
});


test('drop-off OTP request stores a separate hashed OTP and emails the parent', async (t) => {
    mockPickupContext(t);
    mockParents(t);

    t.mock.method(StudentEvent, 'exists', async (filter) => {
        if (filter.type === 'picked_up') return { _id: 'pickup-event-id' };
        return null;
    });

    t.mock.method(PickupOtp, 'findOne', () => ({
        lean: async () => null
    }));

    let savedFilter;
    let savedOtp;
    let emailPayload;

    t.mock.method(PickupOtp, 'findOneAndUpdate', async (filter, update) => {
        savedFilter = filter;
        savedOtp = update.$set;
        return { _id: 'dropoff-otp-id' };
    });

    const result = await requestDropoffOtp({
        ...driverRequest,
        sendEmail: async (payload) => {
            emailPayload = payload;
        }
    });

    assert.deepEqual(savedFilter, {
        tripId,
        studentId,
        purpose: 'dropoff'
    });

    assert.equal(savedOtp.purpose, 'dropoff');
    assert.equal(savedOtp.attempts, 0);
    assert.equal(savedOtp.consumedAt, null);
    assert.equal(savedOtp.parentIds.length, 1);

    assert.equal(emailPayload.to, 'parent@example.com');
    assert.match(emailPayload.otp, /^\d{6}$/);
    assert.notEqual(savedOtp.otpHash, emailPayload.otp);

    assert.equal(result.studentId, studentId);
});


test('correct drop-off OTP creates a dropped_off event and consumes the OTP', async (t) => {
    mockPickupContext(t);

    t.mock.method(StudentEvent, 'exists', async (filter) => {
        if (filter.type === 'picked_up') return { _id: 'pickup-event-id' };
        return null;
    });

    const otp = generatePickupOtp();
    const now = new Date();

    const record = {
        _id: 'dropoff-otp-id',
        otpHash: hashPickupOtp(otp),
        attempts: 0,
        expiresAt: new Date(now.getTime() + 5 * 60 * 1000),
        consumedAt: null
    };

    t.mock.method(PickupOtp, 'findOne', () => ({
        select: async () => record
    }));

    let consumeFilter;
    let createdEvent;

    t.mock.method(PickupOtp, 'findOneAndUpdate', async (filter) => {
        consumeFilter = filter;
        return { ...record, consumedAt: now };
    });

    t.mock.method(StudentEvent, 'create', async (data) => {
        createdEvent = data;

        return {
            _id: '507f1f77bcf86cd799439018',
            ...data
        };
    });

    const result = await verifyDropoffOtpAndRecord({
        ...driverRequest,
        otp
    });

    assert.equal(consumeFilter._id, record._id);
    assert.equal(consumeFilter.consumedAt, null);

    assert.equal(createdEvent.type, 'dropped_off');
    assert.equal(String(createdEvent.studentId), studentId);
    assert.equal(String(createdEvent.tripId), tripId);
    assert.equal(String(createdEvent.vanId), vanId);
    assert.equal(String(createdEvent.driverId), driverId);

    assert.equal(result.type, 'dropped_off');
    assert.equal(result.studentId, studentId);
    assert.equal(result.tripId, tripId);
});


test('parent can retrieve history for their linked student with pagination', async (t) => {
    let studentFilter;
    let eventFilter;

    t.mock.method(Student, 'findOne', (filter) => {
        studentFilter = filter;

        return {
            lean: async () => ({
                _id: studentId,
                name: 'Test Student'
            })
        };
    });

    const events = [
        {
            _id: '507f1f77bcf86cd799439017',
            tripId,
            vanId,
            driverId,
            type: 'picked_up',
            occurredAt: new Date()
        }
    ];

    t.mock.method(StudentEvent, 'find', (filter) => {
        eventFilter = filter;

        return {
            sort() { return this; },
            skip() { return this; },
            limit() { return this; },
            lean: async () => events
        };
    });

    t.mock.method(StudentEvent, 'countDocuments', async () => 1);

    const result = await getStudentEventHistory({
        studentId,
        userId: parentId,
        schoolId,
        role: 'parent',
        page: 1,
        limit: 20
    });

    assert.equal(String(studentFilter.parentIds), parentId);
    assert.equal(String(studentFilter.schoolId), schoolId);
    assert.equal(String(eventFilter.studentId), studentId);

    assert.equal(result.events.length, 1);
    assert.equal(result.events[0].type, 'picked_up');
    assert.equal(result.pagination.total, 1);
    assert.equal(result.pagination.page, 1);
});

test('parent cannot retrieve history for an unlinked student', async (t) => {
    t.mock.method(Student, 'findOne', () => ({
        lean: async () => null
    }));

    await assert.rejects(
        getStudentEventHistory({
            studentId,
            userId: parentId,
            schoolId,
            role: 'parent'
        }),
        { code: 'STUDENT_NOT_FOUND' }
    );
});

test('admin event history is scoped to the admin school', async (t) => {
    let studentFilter;

    t.mock.method(Student, 'findOne', (filter) => {
        studentFilter = filter;

        return {
            lean: async () => ({
                _id: studentId,
                name: 'Test Student'
            })
        };
    });

    t.mock.method(StudentEvent, 'find', () => ({
        sort() { return this; },
        skip() { return this; },
        limit() { return this; },
        lean: async () => []
    }));

    t.mock.method(StudentEvent, 'countDocuments', async () => 0);

    await getStudentEventHistory({
        studentId,
        userId: '507f1f77bcf86cd799439019',
        schoolId,
        role: 'admin'
    });

    assert.equal(String(studentFilter.schoolId), schoolId);
});

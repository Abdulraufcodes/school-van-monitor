import { z } from 'zod';

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ID');

const pickupParams = z.object({
    tripId: objectId,
    studentId: objectId
});

export const requestPickupOtpSchema = z.object({
    params: pickupParams,
    query: z.object({}).passthrough(),
    body: z.object({}).strict()
});

export const verifyPickupOtpSchema = z.object({
    params: pickupParams,
    query: z.object({}).passthrough(),
    body: z.object({
        otp: z.string().regex(/^\d{6}$/, 'OTP must contain exactly 6 digits')
    }).strict()
});

export const requestDropoffOtpSchema = requestPickupOtpSchema;

export const verifyDropoffOtpSchema = verifyPickupOtpSchema;



export const studentEventHistorySchema = z.object({
    params: z.object({
        studentId: objectId
    }),
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20)
    }),
    body: z.object({}).strict()
});

export const tripStudentStatusesSchema = z.object({
    params: z.object({
        tripId: objectId
    }),
    query: z.object({}).passthrough(),
    body: z.object({}).strict()
});

// Validates IDs for retrieving one student's status on a specific trip.
export const studentTripStatusSchema = z.object({
    params: z.object({
        tripId: objectId,
        studentId: objectId
    }),
    query: z.object({}).strict(),
    body: z.object({}).strict()
});
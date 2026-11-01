
import mongoose from 'mongoose';

const { Schema, model, models } = mongoose;

const pickupOtpSchema = new Schema(
    {
        schoolId: {
            type: Schema.Types.ObjectId,
            ref: 'School',
            required: true
        },
        tripId: {
            type: Schema.Types.ObjectId,
            ref: 'Trip',
            required: true
        },
        studentId: {
            type: Schema.Types.ObjectId,
            ref: 'Student',
            required: true
        },
        driverId: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        parentIds: [{
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true
        }],
        purpose: {
            type: String,
            enum: ['pickup', 'dropoff'],
            required: true,
            default: 'pickup'
        },

        // Only the hash is stored, never the actual six-digit OTP.
        otpHash: {
            type: String,
            required: true,
            select: false
        },

        expiresAt: {
            type: Date,
            required: true
        },
        attempts: {
            type: Number,
            default: 0
        },
        consumedAt: {
            type: Date,
            default: null
        },
        lastSentAt: {
            type: Date,
            required: true
        }
    },
    { timestamps: true }
);

// One current OTP record per student for a particular trip.
pickupOtpSchema.index(
    { tripId: 1, studentId: 1, purpose: 1 },
    { unique: true }
);

// Automatically clean up expired OTP records.
pickupOtpSchema.index(
    { expiresAt: 1 },
    { expireAfterSeconds: 0 }
);

const PickupOtp =
    models.PickupOtp || model('PickupOtp', pickupOtpSchema);

export default PickupOtp;

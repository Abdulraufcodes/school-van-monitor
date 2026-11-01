import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

export function generatePickupOtp() {
    return String(randomInt(100000, 1000000));
}

// HMAC prevents someone with only the database from cheaply guessing OTPs.
export function hashPickupOtp(otp) {
    const secret = process.env.OTP_HASH_SECRET;

    if (!secret || secret.length < 32) {
        throw new Error('OTP_HASH_SECRET must contain at least 32 characters');
    }

    return createHmac('sha256', secret).update(otp).digest('hex');
}

export function verifyPickupOtp(otp, storedHash) {
    const submitted = Buffer.from(hashPickupOtp(otp), 'hex');
    const expected = Buffer.from(storedHash, 'hex');

    return submitted.length === expected.length &&
        timingSafeEqual(submitted, expected);
}

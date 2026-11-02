
import nodemailer from 'nodemailer';
import { AppError } from '../../src/utils/AppError.js';

// Create one reusable SMTP transporter for the application.
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

export async function sendPickupOtpEmail({ to, studentName, otp }) {
    if (
        !process.env.SMTP_HOST ||
        !process.env.SMTP_USER ||
        !process.env.SMTP_PASS ||
        !process.env.EMAIL_FROM
    ) {
        throw new AppError(
            503,
            'EMAIL_NOT_CONFIGURED',
            'Email delivery is not configured'
        );
    }

    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject: 'Student pickup verification code',
            text: [
                `A pickup verification was requested for ${studentName}.`,
                '',
                `Your OTP is: ${otp}`,
                '',
                'This code expires in 5 minutes.',
                'Share it only with the authorized school van driver.',
                'If you did not expect this request, contact your school.'
            ].join('\n')
        });
    } catch (error) {
        // Do not log email addresses, OTPs, or SMTP credentials.
        console.error('Pickup OTP email delivery failed:', error.message);

        throw new AppError(
            502,
            'EMAIL_DELIVERY_FAILED',
            'Could not send the pickup verification email'
        );
    }
}

export async function sendAccountLinkEmail({ to, name, purpose, link, expiresAt }) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.EMAIL_FROM) {
        if (process.env.NODE_ENV === 'development') {
            console.info(`[DEV ONLY] ${purpose} link for ${to}: ${link}`);
            return;
        }
        throw new AppError(503, 'EMAIL_NOT_CONFIGURED', 'Email delivery is not configured');
    }
    const activation = purpose === 'activation';
    try {
        await transporter.sendMail({
            from: process.env.EMAIL_FROM,
            to,
            subject: activation ? 'Activate your school transport account' : 'Reset your school transport password',
            text: [
                `Hello ${name},`, '',
                activation ? 'Set a password to activate your school transport account:' : 'Use this link to choose a new password:',
                link, '',
                `This single-use link expires at ${expiresAt.toISOString()}.`,
                'If you did not expect this email, you can ignore it.'
            ].join('\n')
        });
    } catch (error) {
        console.error('Account email delivery failed:', error.message);
        throw new AppError(502, 'EMAIL_DELIVERY_FAILED', 'Could not send the account email');
    }
}

// Simple in-memory rate limiter for GPS updates.
// Allows a driver to send at most 2 requests per second.
// NOTE: Limits reset when the server restarts and are not shared
// across multiple server instances. Suitable for initial development.

import { AppError } from '../utils/AppError.js';

const WINDOW_MS = 2000;
const MAX_REQUESTS = 2;

// Track request counts separately for each authenticated driver.
const driverRequests = new Map();

export function gpsRateLimit(req, res, next) {
    const driverId = req.user?.id;

    // Authentication middleware must run before this middleware.
    if (!driverId) {
        return next(
            new AppError(401, 'UNAUTHORIZED', 'Authentication is required')
        );
    }

    const now = Date.now();
    const driverState = driverRequests.get(String(driverId));

    // Start a new rate-limit window when no window exists or the old one expires.
    if (!driverState || now - driverState.windowStartedAt >= WINDOW_MS) {
        driverRequests.set(String(driverId), {
            windowStartedAt: now,
            requestCount: 1
        });

        return next();
    }

    // Reject requests beyond the allowed limit for this time window.
    if (driverState.requestCount >= MAX_REQUESTS) {
        res.set(
            'Retry-After',
            String(Math.ceil(
                (WINDOW_MS - (now - driverState.windowStartedAt)) / 1000
            ))
        );

        return next(
            new AppError(
                429,
                'GPS_RATE_LIMIT_EXCEEDED',
                'Too many GPS updates. Please retry shortly.'
            )
        );
    }

    // Count this request before allowing it to continue.
    driverState.requestCount += 1;
    driverRequests.set(String(driverId), driverState);

    return next();
}
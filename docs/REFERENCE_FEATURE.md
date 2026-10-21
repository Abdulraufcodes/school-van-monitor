# Reference Feature: Driver Updates Van Location

This is the canonical example for how to add a backend feature. The runnable example is implemented under `server/modules/van/`.

## Files and responsibilities

| File | Responsibility |
|---|---|
| `van.routes.js` | HTTP route and middleware order |
| `van.validation.js` | Zod schema for URL parameters and body |
| `van.controller.js` | HTTP request/response only |
| `van.service.js` | Assignment/trip checks and persistence |
| `van.model.js` | Van persistence schema |
| `../trip/trip.model.js` | Active trip lookup |
| `../location/location.model.js` | Location history schema |
| `server/src/middleware/authenticate.js` | Verify bearer JWT and attach `req.user` |
| `server/src/middleware/authorize.js` | Role-based access |
| `server/src/middleware/validate.js` | Parse params/body/query |
| `server/src/utils/response.js` | Standard success response |
| `server/src/middleware/errorHandler.js` | Standard error response |

## Request flow

1. Express matches `POST /api/vans/:vanId/location`.
2. `authenticate` verifies the JWT signature/expiry and attaches `{ id, role }`.
3. `authorize('driver')` rejects non-drivers.
4. `validate(locationUpdateSchema)` checks `vanId`, latitude, longitude and optional `recordedAt`.
5. Controller passes validated values and authenticated identity to the service.
6. Service confirms the van exists, driver is assigned, and an active trip exists.
7. Service stores the location with server `receivedAt`.
8. Controller returns the documented success shape. Real-time event emission is intentionally a follow-up integration point; use `docs/REALTIME_CONTRACT.md`.

## Request

```http
POST /api/vans/:vanId/location
Authorization: Bearer <accessToken>
Content-Type: application/json
```

```json
{
  "latitude": 23.0225,
  "longitude": 72.5714,
  "recordedAt": "2026-10-21T13:30:00.000Z"
}
```

`recordedAt` is optional and must be an ISO date if provided. The server always records `receivedAt`.

## Success: 200

```json
{
  "success": true,
  "message": "Location updated",
  "data": {
    "vanId": "exampleVanId",
    "tripId": "exampleTripId",
    "latitude": 23.0225,
    "longitude": 72.5714,
    "recordedAt": "2026-10-21T13:30:00.000Z",
    "receivedAt": "2026-10-21T13:30:01.000Z"
  }
}
```

## Failure cases

- `400 VALIDATION_ERROR`: malformed ID, invalid coordinates or invalid date.
- `401 UNAUTHENTICATED`: missing/invalid/expired token.
- `403 FORBIDDEN`: role is not driver, or driver is not assigned to this van.
- `404 VAN_NOT_FOUND`: van ID does not exist.
- `409 NO_ACTIVE_TRIP`: van has no active trip.
- `500 INTERNAL_ERROR`: unexpected server error; no stack trace returned to client.

## How to implement another feature

1. Create `server/modules/<feature>/`.
2. Define the contract in `docs/API_CONTRACT.md` before implementation.
3. Add or reuse model(s); do not duplicate existing models.
4. Write a validation schema.
5. Add route with middleware in the correct order.
6. Keep controller thin; move business logic to service.
7. Use shared response/error conventions.
8. Add tests for success and failure/authorization cases.
9. Add frontend service under `client/src/services/`.
10. Update this repository's API/schema docs and open a PR.

## Important production hardening still needed

- Rate limiting tuned for GPS frequency.
- Device clock skew and stale/out-of-order update policy.
- Location retention/deletion policy.
- Integration tests using a test database.
- Socket.IO emission after successful persistence.
- Authentication token issuance/refresh/revocation flows.

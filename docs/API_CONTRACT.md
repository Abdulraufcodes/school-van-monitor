# API Contract

This document is the cross-team agreement. Change it in the same PR as API behavior.

## Conventions

- Base URL: `/api`
- JSON request/response bodies, except health checks.
- IDs are MongoDB ObjectId strings.
- API timestamps are UTC ISO 8601 strings.
- Bearer token: `Authorization: Bearer <accessToken>`.
- Never trust role or ownership sent in a request body.
- Success envelope: `{ "success": true, "message": "...", "data": ... }`
- Error envelope: `{ "success": false, "message": "...", "code": "...", "errors": [] }`
- `errors` is optional; for validation failures each entry has `field` and `message`.

## Status codes

| Code | Use |
|---|---|
| 200 | Successful read/update |
| 201 | Resource created |
| 204 | Successful operation with no response body (only if explicitly documented) |
| 400 | Invalid params/query/body |
| 401 | Missing, invalid or expired authentication |
| 403 | Authenticated but not allowed |
| 404 | Resource does not exist or is intentionally hidden from this caller |
| 409 | Valid request conflicts with current state |
| 429 | Rate limit exceeded |
| 500 | Unexpected server error |

## Implemented endpoints

### `GET /health`
No auth. Returns `{ "success": true, "message": "API is healthy", "data": { "status": "ok" } }`.

### `POST /auth/login`
Public login for existing active `admin`, `driver`, and `parent` User accounts. Request body is `{ "email": "...", "password": "..." }`; clients do not submit a role. The server derives the role from the matched database account and signs it into the access token. Invalid credentials and inactive accounts return HTTP 401 using the standard error envelope. On success, the existing response envelope is preserved with `data.accessToken` and `data.user` (`id`, `name`, `email`, `role`, and nullable `schoolId`). The access token expires after 15 minutes.

### `POST /vans/:vanId/location`
Driver-only; requires driver assignment and active trip. See `REFERENCE_FEATURE.md`.

## Planned endpoint contracts (not implemented yet)

These are proposed endpoints to help the team split work. Treat them as design placeholders until implemented and tested.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Admin / invitation flow | Create account under controlled onboarding |
| POST | `/auth/refresh` | Authenticated session / refresh token | Rotate session tokens |
| POST | `/auth/logout` | Authenticated | Revoke session |
| GET | `/auth/me` | Any authenticated user | Current user profile |
| GET | `/students/:studentId` | Parent/admin | Read student with ownership check |
| POST | `/students` | Admin | Create student |
| POST | `/vans` | Admin | Create van |
| PATCH | `/vans/:vanId/assignment` | Admin | Assign driver / route |
| POST | `/trips` | Driver/admin | Start trip subject to assignment rules |
| PATCH | `/trips/:tripId/end` | Assigned driver/admin | End trip |
| POST | `/trips/:tripId/events` | Assigned driver | Record pickup/drop-off event |
| GET | `/parents/me/students` | Parent | List only linked students |
| GET | `/students/:studentId/trips/current` | Linked parent/admin | Current trip status |
| GET | `/students/:studentId/events` | Linked parent/admin | Authorized event history |

## Location endpoint details

Request path param: `vanId` (MongoDB ObjectId string).

Request body:
- `latitude`: number in `[-90, 90]`
- `longitude`: number in `[-180, 180]`
- `recordedAt`: optional ISO date string from device

Response data fields:
- `vanId`, `tripId`
- `latitude`, `longitude`
- `recordedAt` (device timestamp or server fallback)
- `receivedAt` (server timestamp)

## Change process

1. Propose contract change in the PR description.
2. Update this document and any schema/realtime docs.
3. Notify frontend/backend owner.
4. Add contract tests and only then merge.

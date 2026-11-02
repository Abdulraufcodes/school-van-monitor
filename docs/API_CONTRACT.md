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
Public login for existing active `admin`, `driver`, and `parent` User accounts. Request body is `{ "email": "...", "password": "..." }`; clients do not submit a role. The server derives the role from the matched database account. Invalid credentials and inactive accounts return HTTP 401 using the standard error envelope. On success, the existing response envelope is preserved with `data.accessToken` and `data.user` (`id`, `name`, `email`, `role`, and nullable `schoolId`). The access token expires after 15 minutes.

### `GET /auth/me`
Authenticated session verification. The server verifies the bearer token, reloads the active user from the database, and returns `data.user` (`id`, `name`, `email`, `role`, and nullable `schoolId`). The database role is authoritative if it has changed since the token was issued. Missing, invalid, expired, deleted-user, or inactive-user sessions return HTTP 401.

### `POST /vans/:vanId/location`
Driver-only; requires driver assignment and active trip. See `REFERENCE_FEATURE.md`.


### `GET /vans`
Admin-only. Requires a valid active school association.

Returns only vans belonging to the authenticated admin's school.

Success: `200`

### `POST /vans`
Admin-only. Requires a valid active school association.

Request body:
- `registrationNumber`: required string, 1–20 characters
- `assignedDriver`: required MongoDB ObjectId of an active driver in the same school

The server determines `schoolId` from the authenticated admin's school context. Client-supplied `schoolId` is rejected.

Success: `201`

Errors:
- `400 VALIDATION_ERROR`: invalid request body
- `400 INVALID_DRIVER`: assigned driver is not an active driver in the admin's school
- `401 UNAUTHENTICATED`: missing or invalid authentication
- `403 FORBIDDEN`: caller is not an admin
- `403 SCHOOL_ACCESS_DENIED`: school association is missing or unavailable
- `409 VAN_ALREADY_EXISTS`: registration number already exists

### `GET /drivers`
Admin-only. Requires a valid bearer token and a valid active school association. The school scope is taken from the authenticated admin's database-backed account; request-supplied school IDs are not used.

Returns HTTP `200` with the standard success envelope. `data` is an array containing only active users with role `driver` in the authenticated admin's school. Each item contains only `_id`, `name`, and `email`. The array is empty when there are no matching drivers.

```json
{
  "success": true,
  "message": "Drivers retrieved successfully",
  "data": [
    {
      "_id": "MONGODB_OBJECT_ID",
      "name": "Driver Name",
      "email": "driver@example.test"
    }
  ]
}
```

Unauthenticated requests receive `401 UNAUTHENTICATED`. Non-admin roles receive `403 FORBIDDEN`. An admin without a valid active school association receives `403 SCHOOL_ACCESS_DENIED`.

### School people management

All routes below require an authenticated admin with an active school association. The school is derived from the admin account; submitted school IDs are not accepted.

- `GET /admin/people` returns the admin school's parent and driver accounts plus students and their linked parent names/emails.
- `POST /admin/users` creates an active `parent` or `driver` account. Required fields: `name`, `email`, `password` (minimum 12 characters), and `role`; `phone` is optional. The initial password is selected by the admin and must be shared securely with the account holder. Duplicate email returns `409 EMAIL_ALREADY_EXISTS`. Admin role creation is not supported by this endpoint.
- `POST /admin/students` creates a student with `name`, optional `className`, and one or more `parentEmails`. Every parent email must resolve to an active parent in the same school; otherwise the request fails without creating the student.
- `PATCH /admin/students/:studentId/parents` replaces a student's linked parents. `parentEmails` must contain one or more active parent emails from the same school. Students outside the admin's school are returned as not found.
- Student creation may include both `pickupLatitude` (`-90..90`) and `pickupLongitude` (`-180..180`); supply both or neither. `PATCH /admin/students/:studentId/pickup-location` accepts `{ "pickupLocation": { "latitude": 22.3, "longitude": 72.6 } }` or `{ "pickupLocation": null }` to clear the location.

The admin people interface is available at `/dashboard/people`.

### Bulk school registration

All routes require an authenticated admin with an active school association. Uploads are limited to one `.xlsx` file, up to 5 MB and 500 non-empty rows. Download the workbook template from `GET /admin/import/template`.

The roster sheet uses these columns: `record_type`, `name`, `email`, `password`, `phone`, `class_name`, `parent_emails`, `pickup_latitude`, `pickup_longitude`. `record_type` is `student`, `parent`, or `driver`. Parent/driver rows require an email and an initial password of 12–128 characters. Student rows require one or more parent emails, separated by commas, semicolons, or line breaks. Parent accounts may be in the same workbook or already exist in the admin's school. Student rows may include both pickup coordinates or leave both blank. Account rows must leave student-only columns blank.

- `POST /admin/import/preview` accepts multipart form data with file field `file`. It returns file-level column errors, every row's validation errors, and valid/error row counts. It never writes records.
- `POST /admin/import/commit` accepts the same workbook and repeats all validation against current school data. If any error exists, the request fails and no rows are imported. If valid, it creates all accounts and students and links parent accounts. A database write failure triggers cleanup of records created by that request.

The admin interface is available at `/dashboard/import`. Import remains disabled in the UI until a preview has no errors; the server independently enforces the same all-or-nothing validation rule.

### `GET /dashboard/summary`

Admin-only and school-scoped. Returns school totals (`vans`, active `drivers`, active `trips`, active `students`), aggregate progress for students assigned to currently active trips, and the same progress by active trip. Pickup counts use verified morning-trip events; afternoon drop-off counts use verified afternoon-trip events. For afternoon trips, pending drop-off counts include students with a verified pickup who have not yet been dropped off. If there are no active trips, progress totals are zero while school resource totals remain available.

### `GET /notifications`

Parent-only. Returns the authenticated parent's latest 50 persisted notifications with linked student, van, trip and timestamp details. A parent cannot specify another account or school in the request.


### `GET /drivers/me/vans`

Driver-only. Driver and school are derived from the authenticated database user; the request has no body, query parameters, or client-supplied IDs. Returns HTTP `200` with the standard envelope. `data` is an array of `{ id, registrationNumber, isActive }` for all vans assigned to the driver, including inactive vans; no assignments returns `[]`.

### `POST /trips/start`

Driver-only. Starts a trip using an active van assigned to the authenticated driver in the same school.

Request body:

```json
{
  "vanId": "VALID_MONGODB_OBJECT_ID",
  "tripType": "morning_pickup"
}
```

`tripType` must be `morning_pickup` or `afternoon_dropoff`. The server calculates `serviceDate` as the `Asia/Kolkata` local calendar date at start time; clients cannot provide it.

Success: `201`. `data.trip` includes `id`, `schoolId`, `vanId`, `driverId`, `tripType`, `serviceDate` (`YYYY-MM-DD`), `status`, `startedAt`, `endedAt`, `createdAt`, and `updatedAt`.

Errors:
- `400 VALIDATION_ERROR`: invalid van ID or request body
- `401 UNAUTHENTICATED`: missing or invalid token
- `403 FORBIDDEN`: caller is not a driver
- `403 SCHOOL_ACCESS_DENIED`: missing valid school association
- `404 ASSIGNED_VAN_NOT_FOUND`: van is inactive, missing, or not assigned to this driver in their school
- `409 ACTIVE_TRIP_EXISTS`: driver or van already has an active trip
- `409 TRIP_ALREADY_EXISTS`: this van already has that trip type for the service date

The unique trip key is school + van + service date + trip type. Morning and afternoon are separate trip records. A driver and van may still have only one active trip at a time.

### `GET /trips/active`

Driver-only. Returns the authenticated driver's active trip, including `tripType` and `serviceDate`. Legacy trips without these fields serialize them as `null`.

Success: `200`

When no active trip exists, `data.trip` is `null`.

### `POST /trips/:tripId/end`

Driver-only. Completes an active trip owned by the authenticated driver in their school.

The server sets `endedAt` using server time. The returned trip includes `tripType` and `serviceDate`.

Success: `200`

Errors:
- `400 VALIDATION_ERROR`: invalid trip ID
- `401 UNAUTHENTICATED`: missing or invalid token
- `403 FORBIDDEN`: caller is not a driver
- `403 SCHOOL_ACCESS_DENIED`: missing valid school association
- `404 TRIP_NOT_FOUND`: trip does not belong to the authenticated driver and school, or does not exist
- `409 TRIP_NOT_ACTIVE`: trip has already ended or is no longer active

### `GET /trips/admin/locations`

Admin-only; requires the authenticated admin's active school association. Returns only active trips for that school. Each data item includes `trip` (`id`, `status`, `startedAt`, `tripType`, `serviceDate`), nullable `van` and `driver`, and nullable `location`. A location contains `latitude`, `longitude`, `recordedAt`, `receivedAt`, `ageInSeconds`, and `isStale`. Active trips without location updates are included with `location: null`.

### `GET /trips/:tripId/location`

Parent or admin. Admin access is school-scoped. Parent access requires an active linked student assigned to the trip's van. The `trip` object includes `tripType` and `serviceDate` (null for legacy trips); `location` is null until the first GPS update.

### `GET /student-events/:tripId/students`

Driver-only and limited to the authenticated driver's active trip. Returns `tripType` and `serviceDate`, plus student pickup/drop-off statuses and timestamps. For an afternoon trip, pickup comes from the matching morning trip and drop-off from the afternoon trip.

### Separate-trip student event workflow

Pickup OTP request and verification are allowed only on an active `morning_pickup` trip. Drop-off OTP request and verification are allowed only on an active `afternoon_dropoff` trip. Both event records carry the server-derived trip `serviceDate`; the events link by student, van, school, and service date, not by trip ID.

Drop-off requires a verified pickup event whose referenced trip is a `morning_pickup` for the same student, van, school, and service date. A duplicate pickup/drop-off for that student, school, and service date is rejected with `409 ALREADY_PICKED_UP` or `409 ALREADY_DROPPED_OFF`, even if a later van assignment differs. Wrong trip type returns `409 TRIP_TYPE_MISMATCH`; absent or mismatched morning pickup returns `409 STUDENT_NOT_PICKED_UP`.



## Planned endpoint contracts (not implemented yet)

These are proposed endpoints to help the team split work. Treat them as design placeholders until implemented and tested.

| Method | Path | Role | Purpose |
|---|---|---|---|
| POST | `/auth/register` | Admin / invitation flow | Create account under controlled onboarding |
| POST | `/auth/refresh` | Authenticated session / refresh token | Rotate session tokens |
| POST | `/auth/logout` | Authenticated | Revoke session |
| GET | `/students/:studentId` | Parent/admin | Read student with ownership check |
| POST | `/students` | Admin | Create student |
| PATCH | `/vans/:vanId/assignment` | Admin | Assign driver / route |
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


# Student Events API

Student events track when a student boards or leaves a school van.

Supported event types:
- `picked_up`
- `dropped_off`

All event timestamps are generated by the backend.

## 1. Request Pickup OTP

**Endpoint:** `POST /api/student-events/:tripId/students/:studentId/pickup/otp`

**Authentication:** Required

**Authorization:** Driver only

Generates a six-digit OTP and sends it to the registered email addresses of the student's linked active parents.

### Parameters

| Parameter | Type | Description |
|---|---|---|
| tripId | ObjectId | Active trip ID |
| studentId | ObjectId | Student ID |

### Success response

- HTTP 200
- Returns student ID, OTP expiry duration and resend cooldown.

### Security rules

- Driver must own the active trip.
- Student must be active and assigned to the trip's van.
- OTP expires after 5 minutes.
- Maximum 3 verification attempts.
- Resend cooldown is 60 seconds.
- OTP is single-use and stored as an HMAC hash.
- OTP is sent to linked active parents with registered email addresses.

## 2. Verify Pickup OTP

**Endpoint:** `POST /api/student-events/:tripId/students/:studentId/pickup/verify`

**Authentication:** Required

**Authorization:** Driver only

### Request body

```json
{
  "otp": "123456"
}
```

### Success response

Creates a `picked_up` student event with a server-generated timestamp.

### Possible errors

| Error code | Meaning |
|---|---|
| `OTP_INVALID` | Incorrect, missing or already consumed OTP |
| `OTP_EXPIRED` | OTP has expired |
| `OTP_ATTEMPTS_EXCEEDED` | Maximum attempts reached |
| `ALREADY_PICKED_UP` | Student already picked up |
| `ACTIVE_TRIP_NOT_FOUND` | Active trip not found |

## 3. Request Drop-off OTP

**Endpoint:** `POST /api/student-events/:tripId/students/:studentId/dropoff/otp`

**Authentication:** Required

**Authorization:** Driver only

Generates a separate six-digit OTP for drop-off and emails it to the linked active parents.

### Security rules

- Student must have a verified `picked_up` event on the matching morning trip (same student, van, school, and service date).
- Student must not already have a `dropped_off` event.
- Uses a separate OTP with purpose `dropoff`.
- Uses the same five-minute expiry, three-attempt limit and 60-second resend cooldown.

## 4. Verify Drop-off OTP

**Endpoint:** `POST /api/student-events/:tripId/students/:studentId/dropoff/verify`

**Authentication:** Required

**Authorization:** Driver only

### Request body

```json
{
  "otp": "123456"
}
```

### Success response

Creates a `dropped_off` event with a server-generated timestamp.

### Possible errors

| Error code | Meaning |
|---|---|
| `OTP_INVALID` | Incorrect or already consumed OTP |
| `OTP_EXPIRED` | OTP has expired |
| `OTP_ATTEMPTS_EXCEEDED` | Maximum attempts reached |
| `STUDENT_NOT_PICKED_UP` | Student has not been picked up on this trip |
| `ALREADY_DROPPED_OFF` | Student already dropped off |

## 5. Get Parent Student Event History

**Endpoint:** `GET /api/student-events/students/:studentId/history`

**Authentication:** Required

**Authorization:** Parent only

Retrieves pickup and drop-off events for a student linked to the authenticated parent.

### Query parameters

| Parameter | Type | Default | Description |
|---|---|---|---|
| page | Number | 1 | Page number |
| limit | Number | 20 | Results per page; maximum 100 |

### Access rules

- Parent can only access their linked students.
- Student must belong to the parent's school.
- Events are returned newest first.

## 6. Get Admin Student Event History

**Endpoint:** `GET /api/student-events/admin/students/:studentId/history`

**Authentication:** Required

**Authorization:** Admin only

Retrieves student event history within the authenticated admin's school.

### Access rules

- Admin can only access students belonging to their school.
- Student must be active.
- Events are returned newest first.

## Event History Response

The history endpoints return the standard success response envelope.

```json
{
  "success": true,
  "message": "Student event history retrieved successfully",
  "data": {
    "student": {
      "id": "STUDENT_OBJECT_ID",
      "name": "Test Student"
    },
    "events": [
      {
        "id": "EVENT_OBJECT_ID",
        "tripId": "TRIP_OBJECT_ID",
        "vanId": "VAN_OBJECT_ID",
        "driverId": "DRIVER_OBJECT_ID",
        "type": "picked_up",
        "occurredAt": "2026-10-31T09:30:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

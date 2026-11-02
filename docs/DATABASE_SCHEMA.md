# Database Schema and Relationships

This document describes the current runtime schema and relationships. School, User, Student, Van, Trip, LocationUpdate, StudentEvent, and PickupOtp models are implemented.

## Relationships

```text
School 1 ── * User (admin/staff)
School 1 ── * Student
Parent User * ── * Student (via Student.parentIds)
Driver User 1 ── * Van assignments (current assignment)
Van 1 ── * Trip
Trip 1 ── * LocationUpdate
Trip 1 ── * StudentEvent
Student 1 ── * StudentEvent
```

## Entity 

### School

Represents a school registered on the School Van Monitoring System.

| Field | Type | Rules |
|---|---|---|
| _id | ObjectId | Primary identifier |
| name | String | Required, trimmed, 2–150 characters |
| email | String | Optional, lowercase, trimmed |
| isActive | Boolean | Required, defaults to true |
| createdAt | Date | Automatically managed by Mongoose |
| updatedAt | Date | Automatically managed by Mongoose |

Relationships:
- One School has many Users through User.schoolId.
- One School has many Students through Student.schoolId.
- A school admin manages records belonging to their own school.

### User (implemented)
- `_id`
- `name`
- `email` (unique, normalized)
- `passwordHash` (never returned)
- `role`: `admin | driver | parent`
- `schoolId`
- `isActive`
- timestamps

### Student (implemented)
- `_id`
- `schoolId`
- `name`
- `className` (avoid unnecessary data)
- `parentIds: ObjectId[]`
- `assignedRouteId` (optional)
- `pickupLocation.latitude` and `pickupLocation.longitude` (optional finite coordinates used only for pickup proximity alerts)
- `isActive`
- timestamps

### Van (implemented)
- `_id`
- `registrationNumber` (unique)
- `schoolId` (required School ObjectId; indexed for school-scoped access)
- `assignedDriver` (User ObjectId)
- `isActive`
- timestamps

### Trip (implemented)
- `_id`
- `vanId`
- `driverId`
- `tripType`: `morning_pickup | afternoon_dropoff`
- `serviceDate`: `YYYY-MM-DD`, calculated by the backend in `Asia/Kolkata`
- `status`: `active | completed | cancelled`
- `startedAt`
- `endedAt`
- timestamps

### LocationUpdate (implemented reference)
- `_id`
- `vanId`
- `tripId`
- `driverId`
- `latitude`
- `longitude`
- `recordedAt`
- `receivedAt`
- timestamps

### StudentEvent (implemented)
- `_id`
- `studentId`
- `tripId`
- `driverId`
- `vanId`
- `serviceDate`: copied from the server-owned trip date
- `type`: `picked_up | dropped_off`
- `occurredAt` (server time)
- `recordedAt` (optional device time)
- `notes` (optional, strictly limited)
- timestamps

### Notification (pickup approach)
- `schoolId`, `parentId`, `studentId`, `tripId`, `vanId`
- `type: pickup_approaching`
- `distanceMeters`, `occurredAt`, optional `readAt`
- Unique `{ tripId, studentId, parentId, type }` index suppresses repeated alerts to the same parent for a student's pickup during a trip.

## Indexes and constraints

- Unique normalized user email.
- Unique van registration number.
- Unique daily trip `{ schoolId, vanId, serviceDate, tripType }` when the new date/type fields exist.
- Unique active trip by van and by driver (existing partial unique indexes).
- Index van records by school for tenant-scoped queries.
- `LocationUpdate`: compound index `{ tripId: 1, receivedAt: -1 }`.
- `StudentEvent`: indexes on `{ studentId: 1, occurredAt: -1 }` and `{ tripId: 1, occurredAt: -1 }`.
- `StudentEvent`: unique `{ tripId, studentId, type }` and unique `{ schoolId, studentId, serviceDate, type }` when a string service date exists.
- Validate state transitions in service logic.
- Prevent multiple active trips for the same van/driver with a transaction or carefully designed atomic update when production concurrency matters.
- Add school/tenant scoping to every admin query.
- Decide retention/deletion rules for GPS history and student records before launch.
- Every school-owned resource must be queried within the authenticated user's school scope. Trip school ownership must match its van, and driver assignment must be verified independently.



# Student Event and Pickup OTP Schema

## StudentEvent

The `StudentEvent` collection records student pickup and drop-off activity during a trip.

### Fields

| Field | Type | Description |
|---|---|---|
| schoolId | ObjectId | School associated with the event |
| studentId | ObjectId | Student associated with the event |
| tripId | ObjectId | Trip associated with the event |
| vanId | ObjectId | Van associated with the event |
| serviceDate | String | School-local service date copied from the trip (`YYYY-MM-DD`) |
| driverId | ObjectId | Driver who recorded the event |
| type | String | `picked_up` or `dropped_off` |
| occurredAt | Date | Server-generated event timestamp |
| recordedAt | Date | Optional timestamp for recording context |
| notes | String | Optional event notes |

### Indexes

| Index | Purpose |
|---|---|
| `{ tripId: 1, studentId: 1, type: 1 }` unique | Prevents duplicate pickup or drop-off events for a student on a trip |
| `{ schoolId: 1, studentId: 1, serviceDate: 1, type: 1 }` unique, partial | Prevents duplicate pickup or drop-off for the same student and service day across trips or vans |
| Student history index | Supports student event history queries |
| Trip history index | Supports trip event history queries |

## PickupOtp

The `PickupOtp` collection stores the current OTP for a student's pickup or drop-off on a trip.

### Fields

| Field | Type | Description |
|---|---|---|
| schoolId | ObjectId | School associated with the OTP |
| tripId | ObjectId | Associated trip |
| studentId | ObjectId | Associated student |
| driverId | ObjectId | Driver requesting the OTP |
| purpose | String | `pickup` or `dropoff` |
| parentIds | ObjectId[] | Linked parent accounts receiving the OTP |
| otpHash | String | HMAC hash of the OTP; excluded from normal queries |
| expiresAt | Date | OTP expiry timestamp |
| attempts | Number | Number of incorrect verification attempts |
| consumedAt | Date | Timestamp when OTP was used; null until consumed |
| lastSentAt | Date | Timestamp when OTP was last sent |

### Indexes

| Index | Purpose |
|---|---|
| `{ tripId: 1, studentId: 1, purpose: 1 }` unique | Allows one current OTP per purpose for each student and trip |
| `{ expiresAt: 1 }` TTL | Automatically removes expired OTP records |

### OTP Security Rules

- OTP contains six cryptographically secure digits.
- OTP expires after five minutes.
- Maximum three incorrect attempts.
- Resend cooldown is 60 seconds.
- OTP can only be consumed once.
- Only the HMAC hash is stored in the database.
- OTP is tied to its school, trip, student, driver and purpose.
- Separate OTP records are maintained for pickup and drop-off.

### Event Workflow

1. Driver requests a pickup OTP.
2. Backend verifies trip, driver and student assignment.
3. OTP is sent to linked active parents.
4. Driver verifies the OTP.
5. Backend records a `picked_up` event.
6. Before drop-off, backend checks that a verified pickup belongs to the corresponding morning trip for the same student, van, school, and service date.
7. Driver requests and verifies a separate drop-off OTP.
8. Backend records a `dropped_off` event.

## Existing record compatibility

The partial unique indexes apply only when the new `tripType`/`serviceDate` fields are present, so existing legacy trip and event documents are not rewritten. Legacy trips remain readable and serialize the new metadata as `null`; they cannot be used for new OTP operations, which require a typed trip and service date. No backfill or migration runs automatically. Plan an explicit backfill if historical reporting needs service dates.

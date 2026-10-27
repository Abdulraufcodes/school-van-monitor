# Database Schema and Relationships

The following is the agreed conceptual model. The Van, Trip and LocationUpdate models are represented in the reference scaffold; the remaining entities are design guidance and must be implemented before those workflows are built.

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

### User (planned)
- `_id`
- `name`
- `email` (unique, normalized)
- `passwordHash` (never returned)
- `role`: `admin | driver | parent`
- `schoolId`
- `isActive`
- timestamps

### Student (planned)
- `_id`
- `schoolId`
- `name`
- `className` (avoid unnecessary data)
- `parentIds: ObjectId[]`
- `assignedRouteId` (optional)
- `isActive`
- timestamps

### Van (implemented)
- `_id`
- `registrationNumber` (unique)
- `schoolId` (required School ObjectId; indexed for school-scoped access)
- `assignedDriver` (User ObjectId)
- `isActive`
- timestamps

### Trip (implemented reference)
- `_id`
- `vanId`
- `driverId`
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

### StudentEvent (planned)
- `_id`
- `studentId`
- `tripId`
- `driverId`
- `type`: `picked_up | dropped_off`
- `occurredAt` (server time)
- `recordedAt` (optional device time)
- `notes` (optional, strictly limited)
- timestamps

## Indexes and constraints

- Unique normalized user email.
- Unique van registration number.
- Index van records by school for tenant-scoped queries.
- `LocationUpdate`: compound index `{ tripId: 1, receivedAt: -1 }`.
- `StudentEvent`: indexes on `{ studentId: 1, occurredAt: -1 }` and `{ tripId: 1, occurredAt: -1 }`.
- Validate state transitions in service logic.
- Prevent multiple active trips for the same van/driver with a transaction or carefully designed atomic update when production concurrency matters.
- Add school/tenant scoping to every admin query.
- Decide retention/deletion rules for GPS history and student records before launch.
- Every school-owned resource must be queried within the authenticated user's school scope. Trip school ownership must match its van, and driver assignment must be verified independently.

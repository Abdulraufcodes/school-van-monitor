# School Van Monitoring System
# Backend Development Roadmap

**Problem ID:** PS000121  
**Industry:** District Development Office – Banaskantha  
**Project:** Enhancing Child Safety and Transparency in School Transportation: A Van Monitoring System

---

## 1. Purpose of This Document

This document defines the revised backend development roadmap for the School Van Monitoring System.

It serves as the central reference for:

- Understanding the backend development plan.
- Tracking completed and pending features.
- Understanding the purpose of each development phase.
- Defining feature requirements and acceptance criteria.
- Coordinating development among team members.
- Preventing unnecessary development outside the problem statement.
- Planning testing and integration before deployment.

All backend development should follow this roadmap unless the team explicitly agrees to revise it.

---

## 2. Problem Statement and Project Objectives

The problem statement identifies the following challenges:

1. Parents and school management do not have a comprehensive system for monitoring school van locations during pickup and drop-off.
2. Parents need timely information when the school van is approaching their child's home for pickup.
3. School management requires real-time information about the number of children being picked up and dropped off.
4. Timestamped information related to student pickup and drop-off must be maintained.
5. A transparent monitoring mechanism is required to improve the safety and management of school transportation.

### 2.1 Expected Outcomes

The backend must support all five expected outcomes:

| ID | Expected outcome | Required backend capability |
|---|---|---|
| EO-01 | Accurate, real-time tracking of school vans | GPS ingestion, location persistence and real-time broadcasting |
| EO-02 | Parents and school management can monitor van locations on a map | Authorized location retrieval and active trip APIs |
| EO-03 | Alerts when a van approaches a child's home for pickup | Student pickup locations, distance calculation and notifications |
| EO-04 | School management can access real-time pickup/drop-off data | Trip-student status and dashboard aggregation APIs |
| EO-05 | Timestamped pickup/drop-off information | Pickup/drop-off records with server-generated timestamps |

### 2.2 Development Principle

The project will prioritize the simplest implementation that completely satisfies the problem statement.

We will not prioritize additional complexity unless it is necessary for:

- Child safety.
- Data security.
- Correct business logic.
- Reliability.
- The five expected outcomes.

The objective is to build a functional and reliable system, not to introduce unnecessary architectural complexity.

---

## 3. Current Backend Architecture

The backend uses the MERN ecosystem.

### Technologies

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT authentication
- bcrypt password hashing
- Socket.IO
- Zod validation

### Main user roles

1. School administrator
2. Driver
3. Parent

### Important architectural requirements

- Every school must have isolated data.
- School administrators must only access their own school's records.
- Parents must only access their linked children.
- Drivers must only perform operations permitted for their assigned vans and active trips.
- GPS updates must be associated with valid active trips.
- Pickup and drop-off records must be associated with the correct student and trip.

---

## 4. Authentication Strategy

### Current decision: Retain JWT authentication

The project will continue using its existing JWT-based authentication system.

Rotating refresh-token authentication will not be implemented as a priority in the current development phase.

### Required authentication features

- JWT-based authentication.
- Password hashing using bcrypt.
- Role-based authorization.
- School-level access restrictions.
- Access-token expiration.
- Proper handling of expired and invalid tokens.
- Secure handling of authentication credentials.
- Appropriate logout behavior.

### Deferred enhancement

Rotating refresh tokens may be introduced during production hardening if persistent sessions are required.

This decision must not result in tightly coupling authentication with trip, GPS, pickup or drop-off business logic.

Existing protected APIs should continue using centralized authentication and authorization middleware.

---

# 5. Backend Development Phases

## Phase 1 — Backend Foundation and Verification

**Priority:** High  
**Status:** Core implementation completed; full regression verification remains part of Phase 6.

### Objective

Verify that the existing backend functionality is reliable before adding new features.

### Tasks

#### Authentication and authorization

- [ ] Verify admin authentication.
- [ ] Verify driver authentication.
- [ ] Verify parent authentication and onboarding.
- [ ] Verify role-based authorization.
- [ ] Verify expired-token handling.
- [ ] Verify logout behavior.

#### School isolation

- [ ] Verify school-level tenant isolation.
- [ ] Verify administrators cannot access another school's data.
- [ ] Verify parents can access only their linked children.
- [ ] Verify drivers cannot access another school's vans or trips.

#### Van management

- [ ] Verify van creation.
- [ ] Verify van updates and retrieval.
- [ ] Verify driver-to-van assignment.
- [ ] Verify school ownership of vans.

#### Trip management

- [ ] Verify trip start.
- [ ] Verify trip completion.
- [ ] Prevent multiple active trips for the same van.
- [ ] Verify driver assignment.
- [ ] Verify trip status transitions.

#### GPS and Socket.IO

- [x] Driver GPS endpoint implemented.
- [x] GPS validation and persistence implemented.
- [x] Socket.IO authentication implemented.
- [x] Parent trip subscription implemented.
- [x] Parent authorization for trip subscription implemented.
- [x] Real-time GPS broadcasting implemented.
- [x] Manual end-to-end GPS test completed.
- [ ] Verify completed-trip GPS rejection.
- [ ] Verify GPS authorization edge cases.
- [ ] Verify socket reconnection behavior.

### Acceptance criteria

- Existing APIs work correctly.
- Role restrictions are enforced.
- School-level isolation is verified.
- Only authorized drivers can update GPS locations.
- Only authorized parents can subscribe to trips.
- Completed trips cannot receive valid new GPS updates.

### Completion condition

Existing backend functionality passes its relevant tests and can safely support the next development phases.

---

## Phase 2 — Student Pickup and Drop-off Management

**Priority:** Critical  
**Status:** Implemented; full integration verification remains part of Phase 6.

### Objective

Implement the functionality required to record when students are picked up and dropped off.

This capability is implemented. Pickup and drop-off events use OTP verification, database-backed authorization, and server-generated timestamps.

### 2.1 Data Model Design

Before implementing APIs, review the existing:

- Student model.
- Trip model.
- Van model.
- Parent-child relationship.

The implemented `StudentEvent` record links a student, school, trip, van, and authenticated driver. Pickup and drop-off events are tied to the server-derived school-local service date.

### 2.2 Pickup functionality

- [x] Implement pickup OTP request and verification APIs.
- [x] Validate active trip, assigned driver, student assignment, and school.
- [x] Record pickup event with server timestamp.
- [x] Prevent duplicate pickup actions.

### 2.3 Drop-off functionality

- [x] Implement drop-off OTP request and verification APIs.
- [x] Validate active trip, assigned driver, student assignment, and verified morning pickup.
- [x] Record drop-off event with server timestamp.
- [x] Prevent duplicate drop-off actions.

### 2.4 Retrieval APIs

- [x] Retrieve student statuses for a driver's active trip.
- [x] Retrieve an individual student's trip status with role and ownership checks.
- [x] Retrieve parent and school-admin event history.
- [x] Allow parents to retrieve only linked children's statuses.
- [x] Allow school administrators to retrieve only school records.

### Acceptance criteria

- Drivers can update only eligible students belonging to their active trip.
- Pickup and drop-off timestamps are generated by the server.
- Duplicate and invalid status transitions are rejected.
- Parents can access only their linked children.
- School administrators can access the relevant records for their school.
- All records are associated with the correct trip.

### Completion condition

A complete pickup and drop-off workflow works through the backend, with accurate timestamps and authorization.

---

## Phase 3 — Live Van Tracking Integration

**Priority:** Critical  
**Status:** Implemented; full integration verification remains part of Phase 6.

### Objective

Provide reliable tracking information to parents and school management.

### Existing implementation

- [x] Driver sends GPS coordinates through HTTP.
- [x] Backend validates GPS updates.
- [x] GPS coordinates are saved in MongoDB.
- [x] Socket.IO broadcasts location updates.
- [x] Authorized parents receive location events.

### Implemented integration tasks

#### Latest location retrieval

- [x] Retrieve the latest van location for an authorized active trip.
- [x] Scope parent location access to linked students and their assigned van.
- [x] Scope admin fleet locations to the admin's school.

#### Active trip information

- [x] Provide active trip, van, driver, and trip status details.

#### Real-time reliability

- [x] Reconnect clients and restore authorized trip subscriptions.
- [x] Poll/fetch saved locations after reconnect and on screen resume.
- [x] Identify stale GPS locations and missing updates.
- [x] Reflect completed trips and driver disconnection.

### Acceptance criteria

- Parents can retrieve the latest location when opening the tracking screen.
- Parents receive live GPS updates while connected.
- School management can retrieve authorized van locations.
- Clients can recover after temporary disconnection.
- Stale location data can be identified.
- Completed trips are no longer treated as active tracking sessions.

### Completion condition

The backend supports both initial location retrieval and ongoing real-time tracking for authorized users.

---

## Phase 4 — Van Approaching Child's Home Alerts

**Priority:** Critical  
**Status:** Implemented; field threshold and operating radius should be calibrated by each school.

### Objective

Notify parents when the school van approaches their child's pickup location.

This directly addresses one of the main requirements in the problem statement.

### 4.1 Pickup location management

- [x] Store optional pickup coordinates on the student.
- [x] Validate coordinate ranges and require both latitude and longitude.
- [x] Keep pickup coordinates school-admin scoped and omit them from parent notifications.

### 4.2 Proximity calculation

- [x] Evaluate newly persisted GPS coordinates against assigned students' pickup points.
- [x] Calculate distance using the Haversine formula.
- [x] Configure a proximity radius with a 500 metre default.
- [x] Trigger the first approach alert within the radius during an active morning pickup trip.

An initial configurable radius, such as 500 metres, can be used for testing. The final value should be validated in the actual operating environment.

### 4.3 Alert generation

- [x] Generate and persist per-parent, per-student, per-trip alerts.
- [x] Notify only active linked parent accounts through authorized parent rooms.
- [x] Suppress duplicate alerts using a unique database index.
- [x] Skip alerts for stale or missing GPS data.

### Initial notification approach

Use in-app notifications or Socket.IO events for the first implementation.

External SMS or paid push-notification infrastructure can be considered later if required.

### Acceptance criteria

- A parent receives an alert when the van approaches their child's pickup location.
- Unrelated parents do not receive the alert.
- Repeated GPS updates do not generate repeated alerts for the same pickup event.
- Alerts are associated with the correct student and trip.
- Missing GPS data does not produce misleading proximity alerts.

### Completion condition

The system can reliably detect van proximity and notify the correct parent.

---

## Phase 5 — School Management Dashboard APIs

**Priority:** Critical  
**Status:** Implemented; requires full regression verification.

### Objective

Provide school management with real-time transportation information.

### Required dashboard information

#### Active trips

- [x] Retrieve active trips with school-scoped van, driver, latest location, and status.

#### Student statistics

- [x] Count assigned students, verified pickups, pending pickups, verified drop-offs, and pending drop-offs.

#### Trip records

- [x] Retrieve timestamped pickup and drop-off event history.
- [x] Retrieve trip student status information.

### Example dashboard response

```json
{
  "tripId": "exampleTripId",
  "totalStudents": 20,
  "pickedUp": 12,
  "pendingPickup": 8,
  "droppedOff": 0,
  "pendingDropOff": 12
}
```

This is an illustrative response contract.

Counts must be derived from actual trip-student records rather than maintained as unrelated counters.

### Acceptance criteria

- School administrators can see all relevant active trips for their school.
- Pickup and drop-off counts are accurate.
- Student statuses are accurate.
- Latest van locations are available.
- Data is isolated by school.
- Dashboard information reflects the underlying records.

### Completion condition

School management can retrieve accurate trip, van, location and student-status information through backend APIs.

---

## Phase 6 — Backend Integration and Testing

**Priority:** Critical  
**Status:** Pending complete integration pass.

### Objective

Verify that all implemented features work together as one complete system.

### End-to-end test scenarios

| Scenario | Expected result |
|---|---|
| Driver starts trip | Trip becomes active |
| Driver sends GPS | Location is saved |
| Parent subscribes | Authorized subscription succeeds |
| Parent receives GPS | Correct location event is received |
| Driver picks up student | Status and timestamp are recorded |
| Van approaches pickup location | Relevant parent receives alert |
| Driver drops off student | Status and timestamp are recorded |
| Admin opens dashboard | Correct counts are displayed |
| Trip ends | Trip becomes completed |
| Driver sends GPS after completion | Update is rejected |
| Parent accesses unrelated student | Access is denied |
| Other-school admin accesses trip | Access is denied |

### Additional testing

- [ ] Invalid requests.
- [ ] Invalid ObjectIds.
- [ ] Duplicate pickup actions.
- [ ] Duplicate drop-off actions.
- [ ] Unauthorized driver actions.
- [ ] Cross-school access.
- [ ] Missing GPS updates.
- [ ] Stale GPS updates.
- [ ] Socket disconnection.
- [ ] Socket reconnection.
- [ ] Invalid or expired authentication tokens.
- [ ] Notification duplication.
- [ ] Database failure handling.

### Completion condition

All essential workflows pass integration testing, and no critical authorization or data-integrity issues remain.

---

## Phase 7 — Deployment and Documentation

**Priority:** High  
**Status:** Documentation updated; production deployment and operations remain pending.

### Deployment preparation

- [ ] Configure production environment variables.
- [ ] Configure production MongoDB.
- [ ] Configure allowed frontend origins.
- [ ] Configure secure authentication settings.
- [ ] Verify Socket.IO in the production environment.
- [ ] Configure production logging, backups, and monitoring.
- [x] Centralized error handling returns safe messages.
- [ ] Deploy backend and frontend.
- [ ] Verify deployed APIs and live tracking.

### Documentation

- [x] Document authentication, van, trip, student event, and GPS APIs.
- [x] Document Socket.IO events and pickup notification behavior.
- [x] Document admin dashboard APIs.
- [x] Document individual and Excel onboarding flows.
- [x] Document development setup and manual test scenarios.

### Completion condition

The backend is deployed, documented and ready for an end-to-end project demonstration.

---

# 6. Feature Dependencies and Development Order

The following dependencies should guide implementation.

```text
Backend foundation
       |
       v
Student pickup/drop-off records
       |
       +----------------------+
       |                      |
       v                      v
Live tracking integration   Admin dashboard APIs
       |
       v
Pickup proximity alerts
       |
       v
Complete integration testing
       |
       v
Deployment and documentation
```

Note: Dashboard work can begin once the relevant data contracts are agreed upon. The dashboard depends on accurate trip-student records for its counts and reports.

The order is intended to prevent features from being implemented using incomplete or temporary data structures.

---

# 7. GitHub Development Workflow

Each meaningful feature should be implemented in a separate branch.

Suggested branches:

| Branch | Responsibility |
|---|---|
| `feature/backend-verification` | Phase 1 verification and fixes |
| `feature/student-trip-status` | Pickup and drop-off |
| `feature/live-tracking-integration` | Remaining tracking integration |
| `feature/pickup-alerts` | Proximity detection and notifications |
| `feature/admin-dashboard-api` | Dashboard and reporting APIs |
| `test/backend-integration` | Integration testing |
| `chore/backend-deployment` | Deployment and documentation |

### Development process

1. Create a GitHub Issue for the feature.
2. Define the user story and acceptance criteria.
3. Agree on API contracts and expected data changes.
4. Create a feature branch from updated `main`.
5. Implement the feature.
6. Write relevant tests.
7. Test the API using Postman or an automated test.
8. Update documentation.
9. Push the branch.
10. Open a Pull Request.
11. Request teammate review.
12. Merge after checks pass.

### Pull Request requirements

Every PR should explain:

- What feature was implemented.
- Which problem-statement outcome it supports.
- Which APIs or models were changed.
- How the feature was tested.
- Whether documentation was updated.
- Whether any known limitations remain.

Do not commit `.env` files, tokens, passwords, real student data or unrelated files.

---

# 8. Scope Management: What We Are Deferring

To keep the project focused, the following are not priorities for the current implementation:

- Rotating refresh-token authentication.
- Advanced session-management infrastructure.
- SMS notification integration.
- Complex analytics and reporting.
- Unnecessary microservice architecture.
- Advanced monitoring infrastructure beyond what is required for a reliable demonstration.

These may be considered later if deployment requirements or real-world feedback justify them.

Deferring these features must not compromise essential authorization, school isolation or child safety.

---

# 9. Current Progress Summary

The following features have been implemented or manually verified based on the current development progress.

### Implemented

- [x] JWT authentication foundation.
- [x] Role-based authorization.
- [x] School-level access restrictions implemented.
- [x] School admin seed script.
- [x] Van creation and management.
- [x] Trip start and completion functionality.
- [x] Driver GPS endpoint.
- [x] GPS persistence.
- [x] Socket.IO authentication.
- [x] Parent trip subscription and authorization.
- [x] Real-time GPS broadcasting.
- [x] Manual end-to-end real-time GPS test.
- [x] Student registration, parent linking, and school-scoped user management.
- [x] All-or-nothing Excel import with validation preview.
- [x] Parent live tracking screen with saved-location recovery.
- [x] Pickup proximity notifications and parent notification history.
- [x] School dashboard totals and trip student progress.

### Verification or deployment still required

- [ ] Complete backend regression and tenant-isolation testing.
- [ ] Complete integration testing.
- [ ] Run automated backend and frontend regression suites.
- [ ] Complete production deployment and operations setup.
- [ ] Set student/GPS/notification retention and deletion policies.

**Important:** Implementation is not the same as verified completion. Automated and manual integration checks are still pending for this branch.

---

# 10. Definition of Project Completion

The backend can be considered functionally complete when:

1. School administrators can manage their school's transportation data.
2. Drivers can start and complete trips.
3. Drivers can submit GPS locations during active trips.
4. Parents can view the correct van location in real time.
5. Parents receive pickup proximity alerts for their children.
6. Drivers can record student pickup and drop-off.
7. Pickup and drop-off timestamps are maintained.
8. School management can view accurate live pickup/drop-off counts.
9. Unauthorized access and cross-school data access are prevented.
10. The complete workflow passes integration testing.

The final system must demonstrate all five expected outcomes of PS000121.

---

# 11. Development Priority

The immediate development sequence is:

**First:** Complete Phase 1 verification.

**Second:** Implement Phase 2 — Student Pickup and Drop-off Management.

**Third:** Complete Phase 3 — Live Tracking Integration.

**Fourth:** Implement Phase 4 — Van Approaching Child's Home Alerts.

**Fifth:** Implement Phase 5 — School Management Dashboard APIs.

**Sixth:** Complete Phase 6 — Integration Testing.

**Seventh:** Complete Phase 7 — Deployment and Documentation.

All team members should use this document as the central reference when planning backend tasks.

The guiding principle is:

**Build the essential functionality first. Keep the architecture extensible. Avoid unnecessary complexity. Ensure every major feature contributes to child safety and transportation transparency.**

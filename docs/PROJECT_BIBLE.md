# Project Bible

## Product goal

Give parents and school staff timely, access-controlled visibility into school van trips, including current location, near-home alerts and reliable student pickup/drop-off records.

## Primary roles

- **Admin / school staff:** manage students, parents, drivers, vans, assignments, routes and reports.
- **Driver:** view assigned van/trip, start/end a trip, send location updates and record pickup/drop-off events.
- **Parent:** view only their linked student(s), the assigned active trip and permitted trip/event history.

A role alone is not enough for authorization. Every resource must also be checked for ownership/assignment.

## Suggested feature order

1. Project setup, environment and health endpoint
2. Authentication, users and role authorization
3. School/student/parent relationships
4. Van and driver assignment
5. Trip lifecycle
6. Driver location ingestion and real-time fan-out
7. Parent live map and stale-GPS state
8. Pickup/drop-off event capture and audit history
9. Near-home geofence/ETA alerts
10. Admin screens and reports
11. Security hardening, integration tests, deployment and documentation

## Architecture

Backend uses feature modules and a controller/service/model split. Shared middleware is centralized. The frontend uses pages, components, context, hooks, services and routes.

## Core rules

- Store timestamps in UTC; render local time in the UI.
- Distinguish `recordedAt` (device time) from `receivedAt` (server time).
- Do not claim a van is live if its latest update is stale. Define a stale threshold with the team (starter suggestion: 60 seconds).
- The driver may update only a van assigned to them and only during an active trip.
- Parents may view only students linked to their account.
- Pickup/drop-off events must be attributable to an authorized driver and an active trip.
- GPS points and student events are sensitive data. Minimize retention, access and logging.
- Do not use a driver's device timestamp as the sole source of truth.
- A notification is a best-effort alert; the app should still show authoritative trip/event state.

## Non-goals for first milestone

- Payment processing
- Publicly accessible live tracking links
- Tracking when a trip is not active
- Storing a student's destination or unrelated personal movement data

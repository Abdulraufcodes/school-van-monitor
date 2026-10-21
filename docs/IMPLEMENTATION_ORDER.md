# Implementation Order for the Team

## Milestone 1: Foundation
- [ ] Install packages and confirm backend health / frontend build.
- [ ] Add lint configuration and environment validation.
- [ ] Add User model and real login/logout/current-user flows.
- [ ] Add integration-test database setup.

## Milestone 2: School data and access
- [ ] Student, parent linkage and school-scoped admin.
- [ ] Van CRUD and assignment management.
- [ ] Permission matrix and tests for every role.

## Milestone 3: Trip lifecycle
- [ ] Start/end/cancel trip state machine.
- [ ] Prevent multiple active trips for one van.
- [ ] Validate driver-to-van assignment.

## Milestone 4: Live location
- [ ] Complete GPS ingestion with stale/out-of-order rules and rate limits.
- [ ] Emit `location:updated` after persistence.
- [ ] Add secure room subscription with parent/student authorization.
- [ ] Build Leaflet map and last-updated/offline state.

## Milestone 5: Pickup/drop-off and alerts
- [ ] Student event model and routes.
- [ ] Duplicate/idempotency policy.
- [ ] Near-home geofence/ETA and duplicate alert suppression.
- [ ] Notification provider integration only after in-app flow is reliable.

## Milestone 6: Release readiness
- [ ] Full role/ownership integration tests.
- [ ] Data retention/privacy review.
- [ ] Production environment/secrets/CORS/rate limits.
- [ ] Deployment, monitoring, backup and incident procedures.

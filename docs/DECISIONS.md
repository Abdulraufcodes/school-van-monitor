# Architecture Decisions

## AD-001: Feature modules
**Decision:** Group backend files by domain feature (`auth`, `van`, `trip`, `location`, etc.).

**Why:** Related routes, validation, controller, service and model files are discoverable together.

## AD-002: Controller/service separation
**Decision:** Controllers handle HTTP concerns; services handle business rules and persistence orchestration.

**Why:** Business logic can be tested without Express request/response objects.

## AD-003: Shared response and error format
**Decision:** All JSON endpoints use a consistent success/error envelope.

**Why:** Frontend services can handle errors predictably.

## AD-004: REST for commands, Socket.IO for updates
**Decision:** Start with REST for authenticated commands and use Socket.IO for authorized real-time fan-out.

**Why:** REST gives clear status codes and testable contracts; sockets improve freshness without replacing database truth.

## AD-005: UTC timestamps
**Decision:** Persist timestamps in UTC and render local time in the client.

**Why:** Avoids timezone ambiguity across devices.

## AD-006: Separate daily pickup and drop-off trips
**Decision:** Store morning pickup and afternoon drop-off as separate Trip records, keyed by school, van, India-local service date, and trip type. The backend derives `serviceDate` in `Asia/Kolkata`; event records copy that date and link by student, van, school, and date.

**Why:** Pickup and drop-off happen on distinct runs while preserving a verifiable same-day student journey. UTC timestamps remain authoritative for event ordering; service date is only the school-day grouping key.

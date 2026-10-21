# Test Plan

## Automated checks

### Reference location endpoint
- Valid assigned driver + active trip + valid coordinates → 200 and location saved.
- Missing Authorization header → 401.
- Invalid or expired JWT → 401.
- Parent/admin token → 403.
- Malformed `vanId` → 400.
- Latitude outside `[-90, 90]` → 400.
- Longitude outside `[-180, 180]` → 400.
- Van does not exist → 404.
- Driver not assigned to van → 403.
- No active trip → 409.
- Database failure → generic 500 without stack trace.

### Future feature tests
- Parent cannot read a student not linked to their account.
- Driver cannot start a trip for another driver's van.
- A trip cannot be ended twice without an explicit idempotency rule.
- Duplicate pickup/drop-off event behavior is specified and tested.
- Unauthorized socket connection and room join are rejected.
- Stale GPS is clearly represented in UI.
- Admin queries cannot cross school/tenant boundaries.

## Manual smoke test

1. Start MongoDB and backend.
2. `GET /api/health` returns healthy.
3. Create a test driver, van assignment and active trip in local DB.
4. Create a development JWT using `scripts/create-dev-token.js`.
5. Submit a valid location request with the token.
6. Check response and database record.
7. Repeat with invalid coordinates, wrong role and unassigned driver.
8. Confirm error envelopes do not reveal secrets or stack traces.

## Test data safety

Use synthetic student names and fake data. Never paste real student records, access tokens or live location traces into issues, screenshots or logs.

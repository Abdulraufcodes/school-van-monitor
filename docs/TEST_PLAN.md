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

### Role and tenant regression cases
- Parent cannot read a student not linked to their account.
- Driver cannot start a trip for another driver's van.
- A trip cannot be ended twice without an explicit idempotency rule.
- Duplicate pickup/drop-off event behavior is specified and tested.
- Unauthorized socket connection and room join are rejected.
- Stale GPS is clearly represented in UI.
- Admin queries cannot cross school/tenant boundaries.

### Admin registration and Excel import

- Create a parent and a driver individually; verify duplicate email is rejected and no password hash is returned.
- Create a student linked to one or more active parents in the admin's school; reject missing or cross-school parent emails.
- Download the template, validate a workbook containing new parents, drivers, and linked students.
- Upload a workbook with a missing/unknown column, invalid coordinate, duplicate email, short password, and unknown parent. Confirm the preview identifies each row/column and the import action remains unavailable.
- Submit a malformed file directly to the commit endpoint; confirm the server returns validation errors and creates no users or students.
- Correct the workbook and confirm the valid upload creates all rows and parent links together.
- Force a database write failure during commit and confirm records created by that request are cleaned up.
- Verify a school admin cannot view or import data into another school's records.

### Parent live tracking and pickup alerts

- Parent sees only linked active students and their assigned active van trips.
- Parent opens tracking after GPS has already been saved and receives the latest point and stale status.
- Parent receives location updates after an authorized socket subscription and recovers after reconnect.
- Admin saves both pickup coordinates; invalid ranges or only one coordinate are rejected.
- A fresh morning-trip GPS point inside the configured radius creates one notification for each linked active parent.
- Repeated updates within the radius do not create duplicate notifications.
- Outside-radius, stale-location, afternoon-trip, unlinked-parent, and other-school scenarios do not generate an alert.
- Persisted parent notifications remain visible after a page reload or temporary socket disconnection.
- Parent event history includes only linked children, supports pagination, and shows server-recorded pickup/drop-off timestamps.

## Manual smoke test

1. Start MongoDB and backend.
2. `GET /api/health` returns healthy.
3. Create a test driver, van assignment and active trip in local DB.
4. Create a development JWT using `scripts/create-dev-token.js`.
5. Submit a valid location request with the token.
6. Check response and database record.
7. Repeat with invalid coordinates, wrong role and unassigned driver.
8. Confirm error envelopes do not reveal secrets or stack traces.

Use the [Development seed guide](DEVELOPMENT_SEED.md) to create the fictional school, user accounts, and linked students before exercising the UI workflows.

## Test data safety

Use synthetic student names and fake data. Never paste real student records, access tokens or live location traces into issues, screenshots or logs.


### Admin van management
- Admin lists vans and receives only vans from their own school.
- Admin creates a van with an active driver from the same school.
- Request containing a client-supplied `schoolId` is rejected.
- Missing or invalid admin school association is rejected.
- Inactive, missing, non-driver or cross-school assigned driver is rejected.
- Duplicate registration number returns 409.
- Parent cannot list or create vans.
- Existing assigned-driver GPS update workflow still works.


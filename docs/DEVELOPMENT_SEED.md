# Development workflow seed

`npm run seed:dev` from `server/` creates a small fictional school setup for local development. The script uses the existing MongoDB connection helper and refuses to run unless `NODE_ENV=development` and `MONGODB_URI` points to `localhost`, `127.0.0.1`, or `::1`.

## Configuration and command

Set these variables in the local `server/.env` file:

- `NODE_ENV=development`
- `MONGODB_URI` for a local MongoDB database
- `DEV_DEMO_PASSWORD`, a development-only password of at least 12 characters
- `JWT_ACCESS_SECRET`, required by the API when signing in

Do not use these demo accounts or password in production. The seed script hashes `DEV_DEMO_PASSWORD` with bcrypt using the same cost factor as the existing admin seed. It never prints the password. The environment example should contain only a placeholder, not a configured credential.

Run:

```bash
cd server
npm run seed:dev
```

## Fictional records

The script creates or safely reuses records after checking existing demo records before its first write. It obtains a MongoDB advisory lock in the `seed_locks` collection before preflight. MongoDB's built-in unique `_id` constraint makes concurrent invocations fail closed instead of racing to create duplicate schools. If a process is forcibly terminated, its lock may remain; confirm that no seed process is running before manually removing the `seed-dev-workflow` lock document. No School schema index or migration is required.

- 1 school: Cedar Grove Community School (`office@cedargrove.example`)
- 1 active admin: `admin@cedargrove.example`
- 3 active drivers: `driver1@cedargrove.example`, `driver2@cedargrove.example`, `driver3@cedargrove.example`
- 3 active parents: `parent1@cedargrove.example`, `parent2@cedargrove.example`, `parent3@cedargrove.example`
- 3 active vans: `CG-DEMO-001` through `CG-DEMO-003`, one assigned to each driver
- 3 fictional students, each linked to one demo parent and assigned to the corresponding demo van

All addresses use the reserved `.example` domain. The seed hashes the local `DEV_DEMO_PASSWORD` when it creates an account. Because existing users are reused without changing their password, an already-seeded account keeps the password set when that account was first created; changing `DEV_DEMO_PASSWORD` later does not reset it. The seed uses the project’s actual roles `admin`, `driver`, and `parent`, plus `isActive: true` and each account’s `schoolId`. The School schema supports only `isActive`; there is no approval or verification field.

Repeated runs preserve existing passwords and fields. Existing records that conflict with the expected role, school, active state, or driver assignment cause an error before new records are written. If a later write fails, the script attempts to remove only records created in that invocation, identified by their newly assigned MongoDB IDs and identifying fields. Reused records are never deleted. This compensating cleanup is used instead of a transaction because local MongoDB may be a standalone server; if cleanup itself fails, inspect the error and local collections before retrying. The School schema has no unique email index, so the lock serializes seed runs while school reuse checks the stable demo email or name.

## Database integration tests

Seed database tests use only `MONGODB_TEST_URI`; they never fall back to `MONGODB_URI`. Configure it in the shell running the test command and use a database name ending in `_test` or `-test`, for example `school_van_monitor_test`. The test guard rejects a missing URI, a non-MongoDB URL, or a database name without that test suffix before connecting. Keep this database dedicated to these tests because tests create and remove fixtures by their own MongoDB IDs.

From `server/`, configure `MONGODB_TEST_URI` to your dedicated test database and run:

```bash
npm run test:seed:db
```

The integration suite covers repeat-run counts, reused account/password preservation, invalid van associations before writes, cleanup after injected post-write failures, preservation of reused records after a later failure, and concurrent seed locking. It is intentionally separate from `npm test`, and must not be run against a development, production, or shared database. No connection string or credential belongs in this documentation or `.env.example`.

The Van schema requires `schoolId`, and each seeded van is associated with the demo school as well as its assigned driver. An existing van with a missing or mismatched school, driver, registration number, or active state causes the preflight to fail before any writes. Review and resolve such records deliberately; the seed never updates or deletes reused records.

## Inspecting the seed

In MongoDB Compass, inspect the `schools`, `users`, and `vans` collections. Confirm the school is active; users have the expected role and matching `schoolId`; and each van has the expected school, assigned driver, and active state. To verify sign-in, start the backend and frontend, then use the email and local demo password configured for the account.

## Current demo limitations

The seed creates linked students but intentionally does not create active trips, GPS points, or pickup coordinates. To demonstrate approach alerts, set fictional pickup coordinates on a student in the admin People page, start a morning trip, and send a fresh GPS point within the configured radius. Never use real home coordinates in development or screenshots.

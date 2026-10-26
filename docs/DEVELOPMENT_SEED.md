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

The script creates or safely reuses records after checking existing demo records before its first write:

- 1 school: Cedar Grove Community School (`office@cedargrove.example`)
- 1 active admin: `admin@cedargrove.example`
- 3 active drivers: `driver1@cedargrove.example`, `driver2@cedargrove.example`, `driver3@cedargrove.example`
- 3 active parents: `parent1@cedargrove.example`, `parent2@cedargrove.example`, `parent3@cedargrove.example`
- 3 active vans: `CG-DEMO-001` through `CG-DEMO-003`, one assigned to each driver

All addresses use the reserved `.example` domain. The seed hashes the local `DEV_DEMO_PASSWORD` when it creates an account. Because existing users are reused without changing their password, an already-seeded account keeps the password set when that account was first created; changing `DEV_DEMO_PASSWORD` later does not reset it. The seed uses the project’s actual roles `admin`, `driver`, and `parent`, plus `isActive: true` and each account’s `schoolId`. The School schema supports only `isActive`; there is no approval or verification field.

Repeated runs preserve existing passwords and fields. Existing records that conflict with the expected role, school, active state, or driver assignment cause an error before new records are written. If a later write fails, the script attempts to remove only records created in that invocation, identified by their newly assigned MongoDB IDs and identifying fields. Reused records are never deleted. This compensating cleanup is used instead of a transaction because local MongoDB may be a standalone server; if cleanup itself fails, inspect the error and local collections before retrying. The School schema has no unique email index, so the script reuses a school by its stable demo email or name before creating one.

The current Van schema and canonical `DATABASE_SCHEMA.md` define a Van's registration number, assigned driver, and active state; they do not define `schoolId`. Seeded vans therefore have no persisted school association. Do not infer tenant ownership from these seed records. Adding school-scoped van ownership requires an explicit schema and API design change.

## Inspecting the seed

In MongoDB Compass, inspect the `schools`, `users`, and `vans` collections. Confirm the school is active; users have the expected role and matching `schoolId`; each van has the expected assigned driver and active state. Vans do not currently store a school ID. To verify the admin in the app, start the backend and frontend, then sign in with the admin email and local demo password.

## Current schema limitations

There is no Student model, no parent-to-student relationship, and no route/route-assignment model. Parents can be seeded only as user accounts; students and parent links cannot be created without adding unsupported schema. Trips and location updates are also omitted so the seed does not create artificial trip activity or GPS coordinates. The current API contract has no van-list endpoint for verifying the seeded vans; student and parent workflows require backend models and endpoints first.

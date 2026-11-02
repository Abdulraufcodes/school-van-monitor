# School Van Monitoring System

A school transport monitoring app built with React, Vite, Tailwind, Express, MongoDB, and Socket.IO. It supports school-scoped admin management, driver trips and student events, live van tracking for parents and admins, pickup approach alerts, and an all-or-nothing Excel registration workflow.

## Current features

- Admin login, school van and driver views, student and parent account management.
- Individual student, parent, and driver registration.
- Excel roster upload with a complete row/column preview. Import is blocked until every row validates, and the server validates again before writing.
- Student-to-parent linking and optional pickup coordinates.
- Driver trip start/end, GPS location submission, student roster, and OTP-verified pickup/drop-off records.
- Parent live tracking with saved location recovery, live Socket.IO updates, and stale-location indication.
- Parent pickup/drop-off history for linked children.
- Configurable pickup proximity alerts, persisted for linked parents and delivered in-app.
- School dashboard totals and pickup/drop-off progress.

SMS delivery, paid push notifications, refresh-token rotation, automated deployment, and production operations are not configured in this repository.

## Requirements

- Node.js 20 or newer
- MongoDB (local or Atlas)

## Local setup

1. In `server/`, copy `.env.example` to `.env` and set `MONGODB_URI` and `JWT_ACCESS_SECRET`.
2. Install and start the backend:

   ```powershell
   cd server
   npm install
   npm run dev
   ```

3. In another terminal, install and start the frontend:

   ```powershell
   cd client
   npm install
   npm run dev
   ```

4. Open the Vite URL shown in the terminal. `GET /api/health` reports backend connectivity.

## Seed fictional development data

Set `NODE_ENV=development`, `DEV_DEMO_PASSWORD` (at least 12 characters), and the local MongoDB URI in `server/.env`, then run from `server/`:

```powershell
npm run seed:dev
```

The seed creates a fictional school, admin, drivers, parents, vans, and linked students. It refuses non-local databases and does not overwrite reused account passwords. It does not create trips or GPS history. See [Development seed guide](docs/DEVELOPMENT_SEED.md).

## School registration

Admins can add a parent or driver individually at `/dashboard/people`, then add students linked to their parent email addresses. For large rosters, use `/dashboard/import` to download the Excel template and upload it. The preview shows missing/unknown columns, invalid values, duplicate emails, and student-parent linking errors. The upload is all-or-nothing; no valid subset is imported when any row has an error.

Parent and driver accounts require an initial password of at least 12 characters. The school admin must share it securely with the account holder. Do not place real student data in development files or screenshots.

## Main workflows

- **Admin:** `/dashboard` for school totals and student trip progress; `/dashboard/live-tracking` for active trips; `/dashboard/people` for accounts and student pickup points; `/dashboard/import` for bulk registration.
- **Driver:** `/driver/dashboard` to start a trip and `/driver/trip` to send GPS updates and record verified student events.
- **Parent:** `/parent/live-tracking` for linked children’s active vans, `/parent/activity-history` for verified pickup/drop-off records, and `/parent/dashboard` for saved pickup alerts.

See [API contract](docs/API_CONTRACT.md), [database schema](docs/DATABASE_SCHEMA.md), [real-time contract](docs/REALTIME_CONTRACT.md), and [manual test plan](docs/TEST_PLAN.md) for implementation details.

## Privacy and deployment

Use fictional development data. Store production credentials only in deployment secrets, restrict allowed origins, and determine GPS/student-data retention before launch. Deployment, monitoring, backups, and incident procedures still need environment-specific setup.

# School Van Monitoring System

A school transport monitoring app with separate admin, driver, and parent workflows. The frontend uses React, Vite, Tailwind, React Router, Axios, and Leaflet. The backend uses Node.js, Express, MongoDB/Mongoose, JWT, Zod, and Socket.IO.

## Implemented features

- **Admins:** school dashboard, driver and van management, parent and student accounts, spreadsheet roster preview and all-or-nothing import, student pickup locations, live fleet map, and pickup-alert settings.
- **Drivers:** start and end morning pickup or afternoon drop-off trips, report browser GPS while a trip is active, view the student roster, and record OTP-verified pickup/drop-off events.
- **Parents:** view linked students’ active van locations, receive authorized live location updates and pickup alerts, and review pickup/drop-off history.
- **Backend:** authenticated, school-scoped APIs; persistent location history; Socket.IO trip updates; configurable location freshness and pickup proximity alerts.

## Requirements

- Node.js 20 or newer
- MongoDB

## Local setup

1. Copy `server/.env.example` to `server/.env`. Set `MONGODB_URI` and `JWT_ACCESS_SECRET`. Keep secrets in the local environment file; do not commit it.
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

4. Open the Vite URL shown in the terminal. The frontend proxies API and Socket.IO traffic to the backend on port 5000 by default. `GET /api/health` reports API health.

The complete configuration list is in `server/.env.example`. `NODE_ENV`, `MONGODB_URI`, and `JWT_ACCESS_SECRET` are needed for local use. `PORT` and `CLIENT_ORIGIN` configure the backend. SMTP settings enable email delivery; `LOCATION_STALE_THRESHOLD_SECONDS`, `PICKUP_ALERT_RADIUS_METERS`, and `OTP_HASH_SECRET` configure related features. The development seed and GPS simulator require a local MongoDB database.

## Seed fictional development data

Set `NODE_ENV=development`, a local `MONGODB_URI`, and a private `DEV_DEMO_PASSWORD` of at least 12 characters in `server/.env`. From `server/`, run:

```powershell
npm run seed:dev
```

This creates or reuses a fictional school, admin, drivers, parents, vans, and linked students. It refuses non-local databases and does not change reused account passwords. It does **not** create active trips, GPS points, or pickup coordinates. See [Development seed guide](docs/DEVELOPMENT_SEED.md).

## Development GPS simulator

The simulator sends a preset route through the existing authenticated GPS endpoint for seeded demo vans `CG-DEMO-001` through `CG-DEMO-003`. It requires an active demo trip, local API and database, `NODE_ENV=development`, and `DEMO_GPS_SIMULATOR_ENABLED=true`.

Start a trip for a demo van with browser location blocked, then leave the driver page so its real GPS watcher stops. Keep a linked demo parent or school admin tracking page open in another session. From `server/`, run:

```powershell
npm run simulate:gps -- CG-DEMO-001
```

By default it sends 44 points over five minutes, pauses for 17 seconds at three route points, and observes the backend GPS rate limit. The total run takes about 5 minutes 51 seconds. Configure `DEMO_GPS_ROUTE_DURATION_MINUTES` (3–20), `DEMO_GPS_INTERVAL_MS` (2500–30000), and `DEMO_GPS_STOP_DURATION_MS` (0–120000) in `server/.env`. The optional `DEMO_GPS_API_URL` must be a local API origin. Set stop duration to `0` to disable pauses. The simulator creates no student pickup/drop-off events, but the normal location service can still process configured demo pickup proximity alerts. Saved GPS points remain in the demo trip. See [GPS simulator guide](docs/DEMO_GPS_SIMULATOR.md).

## Available scripts

Run client commands from `client/` and server commands from `server/`.

| Package | Command | Purpose |
|---|---|---|
| Client | `npm run dev` | Start Vite development server |
| Client | `npm run build` | Build frontend assets |
| Client | `npm run preview` | Preview the built frontend |
| Server | `npm run dev` / `npm start` | Start backend in development / normal mode |
| Server | `npm test` | Run server Node.js tests |
| Server | `npm run seed:admin` / `npm run seed:dev` | Create admin / fictional development data |
| Server | `npm run simulate:gps -- CG-DEMO-001` | Simulate the selected seeded demo van |
| Server | `npm run test:seed:db` | Run seed database tests using a dedicated `MONGODB_TEST_URI` database |

The `lint` scripts are placeholders and ESLint is not configured. There is no client test script.

## Limitations

- The GPS simulator follows a preset local trace; it is not turn-by-turn road routing and is development-only.
- SMS and paid push notification providers are not configured. SMTP settings are needed to deliver email messages.
- Production deployment, monitoring, backups, and operational procedures need environment-specific setup.
- Use fictional student and location data for demos. Define data retention and privacy controls before production use.

## More documentation

- [API contract](docs/API_CONTRACT.md)
- [Database schema](docs/DATABASE_SCHEMA.md)
- [Realtime contract](docs/REALTIME_CONTRACT.md)
- [Manual test plan](docs/TEST_PLAN.md)
- [Development seed guide](docs/DEVELOPMENT_SEED.md)

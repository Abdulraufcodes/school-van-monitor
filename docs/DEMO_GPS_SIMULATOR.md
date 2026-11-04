# Development GPS simulator

The simulator sends a preset, connected route for a seeded fictional van through the existing authenticated `POST /api/vans/:vanId/location` endpoint. It creates no student pickup/drop-off events and does not change the browser geolocation tracker, API contract, or production GPS behavior.

## Safety checks

The simulator stops unless `NODE_ENV=development`, `DEMO_GPS_SIMULATOR_ENABLED=true`, and both the API and MongoDB point to loopback hosts. It accepts only `CG-DEMO-001`, `CG-DEMO-002`, or `CG-DEMO-003`, and verifies the seeded Cedar Grove school, matching seeded driver, van assignment, and active trip in both the local database and API.

It logs in as the matching seeded driver with `DEV_DEMO_PASSWORD`; it does not accept or print a token. GPS points are appended to the demo trip and the normal service broadcasts them and processes configured demo pickup proximity alerts. Do not run browser/device GPS tracking for the same demo driver at the same time. Block or deny browser location permission, start the trip, then leave the driver page before running the simulator.

## Run

1. Configure the local server environment and run `npm run seed:dev` from `server/` if the fictional demo records are not present.
2. Set `DEMO_GPS_SIMULATOR_ENABLED=true` in `server/.env`.
3. Start the backend and frontend. Start an active trip for one seeded demo van with its driver account, with browser location denied. Leave the driver page; keep the linked demo parent and/or school admin tracking page open in separate sessions.
4. From `server/`, select the same van:

   ```powershell
   npm run simulate:gps -- CG-DEMO-001
   ```

Use `CG-DEMO-002` or `CG-DEMO-003` for the other seeded vans. Press Ctrl+C to stop. The saved GPS history remains on that demo trip.

The parent map receives authorized Socket.IO updates as points arrive. The admin map refreshes the latest saved location on its existing 15-second cycle.

## Configuration

All settings are read from `server/.env`; defaults are safe for local demonstration:

| Variable | Default | Allowed values / behavior |
|---|---:|---|
| `DEMO_GPS_SIMULATOR_ENABLED` | `false` | Must be exactly `true` to run. |
| `DEMO_GPS_ROUTE_DURATION_MINUTES` | `5` | Integer 3–20; controls moving time. The route is sampled to about 44 points at defaults. |
| `DEMO_GPS_INTERVAL_MS` | `7000` | Integer 2500–30000 ms. Values below 2500 are rejected to stay below the backend limit of 2 requests per 2-second window. Actual spacing is adjusted slightly to fit the requested route duration. |
| `DEMO_GPS_STOP_DURATION_MS` | `17000` | Integer 0–120000 ms. The default pauses at three route points; set to `0` to disable stops. |
| `DEMO_GPS_API_URL` | blank | Optional local API origin. Blank uses `http://127.0.0.1:${PORT || 5000}`. |
| `DEV_DEMO_PASSWORD` | existing seed setting | Must match the password of the seeded demo accounts. |
| `NODE_ENV`, `MONGODB_URI`, `PORT` | existing server settings | Simulator requires development mode and loopback API/database hosts. |

The default moving route takes about 5 minutes. Three 17-second stops bring the expected total to about 5 minutes 51 seconds. No new package is required; the script uses Node's built-in `fetch`.

## Verification and limits

Automated tests cover configuration bounds, demo-only and active-trip guards, 44-point route generation, coordinate progression and speed, timestamp ordering, configured waits, no student-event calls, and parent Socket.IO/admin location paths. Persistence and map behavior against a live MongoDB/API still require a local seeded database and authenticated browser sessions. The preset path is a local demo trace, not turn-by-turn road routing.
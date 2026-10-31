# School Van Monitoring System

A team-ready starter repository for a school van monitoring system, built with React + Vite + Tailwind on the frontend and Express + MongoDB + Socket.IO on the backend.

## What this repository gives you

- EasyGuard-style feature modules and clear `routes → middleware → controller → service → model` responsibilities.
- A runnable reference feature: driver submits a van GPS location.
- Shared API response helpers, Zod request validation, authentication, role authorization and centralized error handling.
- API contracts, database relationship notes, Socket.IO conventions, testing guidance and team contribution rules.
- GitHub issue and pull-request templates.

**Important:** This is a development scaffold, not a finished production product. Login/registration UI, parent/driver/admin workflows, push/SMS notifications, geofencing, production-grade refresh-token rotation, and deployment configuration still need implementation. The reference endpoint requires a valid JWT issued by your eventual authentication flow. Do not use fake production credentials.

## Tech stack

- Frontend: React, Vite, Tailwind CSS, React Router, Axios
- Backend: Node.js, Express, Mongoose, Zod, JSON Web Tokens, Socket.IO
- Maps: Leaflet + OpenStreetMap (integration guide included; map screen not implemented yet)
- Tests: Node test runner / Supertest examples and a manual test plan

## Repository structure

```text
client/
  src/
    components/
    context/
    hooks/
    layouts/
    pages/
    routes/
    services/
    utils/
server/
  server.js
  src/
    app.js
    config/
    middleware/
    utils/
    sockets/
  modules/
    auth/
    student/
    van/
    trip/
    location/
    studentEvent/
    notification/
docs/
.github/
```

## Quick start

### 1. Prerequisites
- Node.js 20+ recommended
- MongoDB local instance or a MongoDB Atlas connection string

### 2. Backend

```bash
cd server
cp .env.example .env
npm install
npm run dev
```

Set `MONGODB_URI` and `JWT_ACCESS_SECRET` in `server/.env`. The API starts on `http://localhost:5000`. Check `GET /api/health`.

### 3. Frontend

In another terminal:

```bash
cd client
npm install
npm run dev
```

Vite starts on its printed local URL. The starter frontend is a landing/status screen, not the complete parent or driver UI.

### 4. Reference endpoint

```http
POST /api/vans/:vanId/location
Authorization: Bearer <valid-access-token>
Content-Type: application/json
```

```json
{
  "latitude": 23.0225,
  "longitude": 72.5714,
  "recordedAt": "2026-10-21T13:30:00.000Z"
}
```

The token must identify a `driver`, and that driver must be assigned to the van and have an active trip. See `docs/REFERENCE_FEATURE.md` and `docs/API_CONTRACT.md`.

### 5. Issue a development token (local testing only)

After starting the server, use Node from the `server` directory:

```bash
node scripts/create-dev-token.js <userId> driver
```

This only signs a token for a supplied user ID; it does **not** create a user or bypass the reference feature's van/trip assignment checks. Create the corresponding user, van assignment and active trip in your local database first. Never expose the JWT secret or use this helper in production. Remove/disable it before deployment if you do not need it.

## Team workflow

Read these before coding:
1. `docs/PROJECT_BIBLE.md`
2. `docs/API_CONTRACT.md`
3. `docs/DATABASE_SCHEMA.md`
4. `docs/REALTIME_CONTRACT.md`
5. `TEAM_WORKFLOW.md`
6. `CONTRIBUTING.md`

Agree on the API contract and schema before splitting frontend/backend tasks. Each feature PR should include tests and documentation updates.

## Environment and secrets

- Copy `.env.example` to `.env`.
- `.env` is ignored by Git. Never commit real credentials, JWT secrets, database URLs, or API keys.
- If a real secret was ever committed, rotate it; deleting it from the latest commit alone is not enough.

## Project Documentation

- [Backend Development Roadmap](docs/BACKEND_ROADMAP.md)
- [Testing Plan](docs/TEST_PLAN.md)
- [Real-time Contract](docs/REALTIME_CONTRACT.md)
- [Real-time Testing Guide](docs/REALTIME_TESTING.md)
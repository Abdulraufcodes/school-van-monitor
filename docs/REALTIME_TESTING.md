# Real-Time GPS Testing Guide

## Purpose

This guide explains how to test the School Van Monitoring System's real-time GPS updates using a driver account, a parent account, Postman and a Node.js Socket.IO client.

## Prerequisites

- MongoDB and the backend are running.
- Development test data exists.
- An active driver account is assigned to an active van.
- An active parent account is linked to an active student assigned to that van.
- The driver has an active trip.
- Node.js dependencies are installed.

## 1. Start the backend

From the `server` directory:

```bash
npm run dev
```

## 2. Log in as the driver

Send:

`POST /api/auth/login`

Use the driver's development credentials. Save the returned access token as `DRIVER_TOKEN`.

## 3. Start a trip

Send:

`POST /api/trips/start`

Use the driver token and assigned van ID. Save the returned active trip ID as `TRIP_ID`.

## 4. Log in as the parent

Send:

`POST /api/auth/login`

Use the parent's development credentials. Save the returned access token as `PARENT_TOKEN`.

The parent must be linked to at least one active student assigned to the trip's van.

## 5. Start the Socket.IO test client

Install the test client dependency if needed:

```bash
npm install socket.io-client
```

Run the `test-socket.js` client using the parent token and active trip ID.

PowerShell:

```powershell
$env:PARENT_TOKEN="YOUR_PARENT_ACCESS_TOKEN"
$env:TRIP_ID="YOUR_ACTIVE_TRIP_ID"
node test-socket.js
```

Expected output includes:

- `Connected`
- `Authentication confirmed`
- `Subscription response: { success: true }`

## 6. Send a driver GPS update

In Postman, send:

`POST /api/vans/:vanId/location`

Use the driver's Bearer token and a valid latitude/longitude payload.

Example:

```json
{
  "latitude": 22.3072,
  "longitude": 73.1812
}
```

## 7. Verify the live event

The Node.js client should receive:

`location:updated`

The event contains:

- `vanId`
- `tripId`
- `latitude`
- `longitude`
- `recordedAt`
- `receivedAt`

Verify that the coordinates match the driver's submitted update.

## 8. Authorization expectations

- A valid parent linked to a student assigned to the trip's van can subscribe.
- A parent without a linked student assigned to that van is denied.
- A parent from another school cannot subscribe.
- A driver cannot use the parent-only subscription handler.
- An invalid or expired token cannot connect.
- An invalid or inactive trip cannot be subscribed to.

## Security notes

- Never commit access tokens, passwords or `.env` files.
- Use fictional development data only.
- Do not share real student information or live GPS traces in screenshots or logs.
- Socket.IO subscription authorization is performed by the server; clients cannot choose arbitrary rooms.

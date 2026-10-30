# Socket.IO / Real-Time Contract

This is the proposed event contract; live parent-room subscription and location event broadcasting are not wired end-to-end in this scaffold yet.

## Transport and authentication

- Socket handshake uses an access token in `socket.handshake.auth.token`.
- Verify token signature and expiry on connection.
- Do not accept a client-provided role as proof of permission.
- A user may join only rooms authorized by server-side database checks.
- Never use a public room name or van ID alone as authorization.

## Room naming

- `van:<vanId>`: only assigned driver and authorized parent/admin sessions may subscribe.
- `trip:<tripId>`: only users permitted to see that trip.
- Room membership must be granted server-side after verifying assignment/parent linkage.

## Parent subscription

Parents request access using:

`trip:subscribe` with `{ tripId }`

The server must verify:
- The authenticated user is an active parent.
- The trip is active and belongs to the parent's school.
- At least one active student is linked to that parent and assigned to the trip's van.

The server acknowledges the request with `{ success: true, tripId }`
or `{ success: false, code }`.

Authorized subscribers receive `location:updated` only after
the location record has been persisted successfully.

Clients must not be allowed to join arbitrary rooms.

## Events

| Direction | Event | Payload |
|---|---|---|
| Driver client → server | `location:update` (optional future socket ingestion) | `{ vanId, latitude, longitude, recordedAt? }` |
| Server → authorized room | `location:updated` | `{ vanId, tripId, latitude, longitude, recordedAt, receivedAt }` |
| Server → authorized room | `trip:status` | `{ tripId, vanId, status, startedAt?, endedAt? }` |
| Server → authorized room | `student:event` | `{ eventId, studentId, tripId, type, occurredAt }` |
| Server → parent session | `notification:near-home` | `{ studentId, tripId, etaSeconds?, generatedAt }` |

## Rules

- Authenticate and authorize before room join.
- For location updates, persist and validate first; emit only after persistence succeeds.
- Validate every client-to-server payload as strictly as an HTTP request.
- Add throttling and out-of-order/stale update handling.
- Parents should receive only events for linked students/authorized trips.
- Use server time for `receivedAt` and event generation time.
- Reconnect should trigger a fresh REST fetch; socket events alone are not the source of truth.
- UI must show `Last updated ...` and a stale/offline state if no update arrives within the agreed threshold.
- Do not emit precise location to unauthorized users or log it unnecessarily.

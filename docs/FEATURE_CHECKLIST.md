# Feature Implementation Checklist

Copy this checklist into each feature issue/PR.

## Before coding
- [ ] User story and acceptance criteria are clear.
- [ ] API method/path, role, request and response are agreed.
- [ ] Ownership/assignment rules are defined.
- [ ] Data model changes and indexes are considered.
- [ ] Socket event contract is updated if needed.

## Backend
- [ ] Route is in the correct feature module.
- [ ] Authentication is applied where required.
- [ ] Role authorization and resource ownership are checked server-side.
- [ ] Params/query/body are validated.
- [ ] Controller remains thin; business rules live in service.
- [ ] Database constraints/indexes and state transitions are handled.
- [ ] Success/error envelopes and status codes match API contract.
- [ ] Sensitive fields are never returned/logged.
- [ ] Tests cover success, invalid input, missing auth, wrong role and wrong ownership.

## Frontend
- [ ] API call is in `services/`, not duplicated inside components.
- [ ] Types/shapes match API contract.
- [ ] Loading, success, empty, stale/offline and error states are handled where relevant.
- [ ] Role/ownership checks are not assumed to be secure just because UI hides controls.
- [ ] Accessible labels and responsive layout are included.

## Realtime / notifications (when relevant)
- [ ] Socket event and payload match `REALTIME_CONTRACT.md`.
- [ ] Room join permission is checked server-side.
- [ ] Persistence happens before broadcast.
- [ ] Reconnect refetch and stale data behavior are handled.

## Before merge
- [ ] Automated tests pass.
- [ ] Manual test steps recorded.
- [ ] API/schema docs updated.
- [ ] `.env` and personal data are not committed.
- [ ] Another teammate reviewed the PR.

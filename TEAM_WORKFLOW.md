# Team Workflow

## Branch naming

- `main`: stable branch
- `develop`: shared integration branch (use if the team wants a staging branch)
- `feature/<short-name>`: new feature
- `fix/<short-name>`: bug fix
- `docs/<short-name>`: documentation-only change

Examples: `feature/driver-location-update`, `feature/parent-dashboard`, `fix/stale-gps-state`.

## Before starting a task

1. Read the relevant requirement and API contract.
2. Confirm request/response shape with the teammate owning the other side.
3. Create or pick a GitHub issue with acceptance criteria.
4. Pull the latest base branch and create a focused branch.
5. Agree on touched files and event names before coding.

## Implementation sequence

1. Define/update the API contract and schema if needed.
2. Implement backend validation, authorization, controller/service/model changes.
3. Add tests for success, invalid input, unauthenticated access, wrong role and ownership violations.
4. Implement frontend service using the agreed contract.
5. Build UI states: loading, success, empty, stale/offline, and error.
6. Update docs and run checks.
7. Open a PR; request one teammate review.

## Commit convention

Use Conventional Commits:

- `feat(location): validate driver GPS updates`
- `fix(auth): reject expired access tokens`
- `test(van): cover unassigned driver`
- `docs(api): define location response`
- `refactor(trip): isolate trip state rules`

Commit small logical units. Do not commit broken intermediate work to `main`.

## PR checklist

- [ ] Requirement/issue linked
- [ ] API contract and schema updated if changed
- [ ] Validation and authorization are server-side
- [ ] Tests include failure/permission cases
- [ ] Frontend handles loading, empty, stale and error states as relevant
- [ ] No secrets, tokens, personal data or `.env` files committed
- [ ] README/docs updated
- [ ] Reviewed by another teammate

## Suggested 3-person split

- Teammate A: backend foundation, auth, users, roles and API contracts
- Teammate B: driver, van, trip and GPS flow
- Teammate C: parent/admin UI, maps, student events and notifications

Do not create isolated silos: each feature needs a named owner and reviewer. Agree on contracts first, then work in parallel. Rotate review responsibility.

## Definition of Done

A feature is done only when its acceptance criteria pass, server-side authorization and validation exist, tests are added, API docs match the code, and another teammate has reviewed it.

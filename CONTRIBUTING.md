# Contributing

## Architecture rule

Keep the request lifecycle understandable:

`route → authenticate/authorize → validate → controller → service → model/database`

- **Route:** HTTP method/path and middleware order only.
- **Middleware:** reusable authentication, authorization, validation, rate limits.
- **Validation:** parse untrusted input; reject invalid shape before business logic.
- **Controller:** translate HTTP request to service call and format success response.
- **Service:** business rules and database orchestration; no Express `req`/`res`.
- **Model:** persistence schema and model-level constraints.
- **Error handler:** one consistent place for errors; do not leak stack traces in production.

Not every feature needs every file. Reuse shared middleware and models where appropriate; do not create files just to satisfy a checklist.

## File placement

- Feature-specific files belong in `server/modules/<feature>/`.
- Shared middleware belongs in `server/src/middleware/`.
- Shared response/error utilities belong in `server/src/utils/`.
- Frontend API calls belong in `client/src/services/`.
- Shared frontend auth/session state belongs in `client/src/context/`.
- Pages are route-level screens; reusable UI goes in `components/`.
- Contracts and cross-team decisions belong in `docs/`.

## Validation and security

- Never trust IDs, role names, coordinates, timestamps or ownership claims supplied by the browser.
- Verify identity from a signed token, then check permissions against database state.
- Validate `params`, `query` and `body` separately.
- Never return password hashes, refresh tokens, secret values or raw internal errors.
- Use UTC ISO 8601 timestamps in APIs.
- Keep secrets in environment variables.
- Do not log access tokens, precise student travel histories, or unnecessary personal data.

## Error conventions

Use `AppError` for expected HTTP errors and let the centralized handler format the response. Do not return `200` for failed operations. Avoid swallowing errors in controllers.

## Before opening a PR

Run `npm test` and `npm run lint` in the changed package where available. If a script is not yet configured or a check cannot run, mention that explicitly in the PR.

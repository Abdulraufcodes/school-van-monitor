# Auth module (planned)

The reference API includes JWT verification middleware, but not a complete login/registration/session module.

Implement here:
- `auth.routes.js`
- `auth.controller.js`
- `auth.service.js`
- `auth.validation.js`
- `user.model.js` (or `modules/user/` if the team chooses a separate user module)
- password hashing (e.g. bcrypt/argon2), login throttling and account activation rules
- access-token issuance, refresh-token rotation/revocation if required

Do not accept arbitrary role claims from registration requests. Account creation and role assignment must follow an admin-controlled onboarding flow.

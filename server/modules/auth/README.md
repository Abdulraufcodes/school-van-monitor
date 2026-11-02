# Auth module

The module provides email/password login, bcrypt password hashing, 15-minute JWT access tokens, and an authenticated current-user endpoint. The database role is authoritative and user records are reloaded by authentication middleware. School-admin-controlled parent and driver creation lives in the admin module. Refresh-token rotation and server-side logout revocation are deferred.

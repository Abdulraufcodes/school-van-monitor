const SESSION_KEY = 'schoolVanSession';
const supportedRoles = new Set(['admin', 'driver', 'parent']);

function getJwtClaims(token) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(globalThis.atob(base64));
  } catch {
    return null;
  }
}

export function getJwtExpiry(token) {
  const claims = getJwtClaims(token);
  return typeof claims?.exp === 'number' ? claims.exp * 1000 : null;
}

export function isValidSession(session, now = Date.now()) {
  const { accessToken, user } = session ?? {};
  const expiresAt = typeof accessToken === 'string' ? getJwtExpiry(accessToken) : null;
  return Boolean(
    typeof accessToken === 'string' &&
    user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    supportedRoles.has(user.role) &&
    expiresAt !== null &&
    expiresAt > now
  );
}

export function restoreSession(storage) {
  try {
    const value = storage.getItem(SESSION_KEY);
    if (!value) return null;
    const session = JSON.parse(value);
    if (isValidSession(session)) return session;
  } catch {
    // Invalid JSON or unavailable storage is treated as an empty session.
  }
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // The caller still starts unauthenticated if storage cannot be cleared.
  }
  return null;
}

export function persistSession(storage, session) {
  if (!isValidSession(session)) return false;
  try {
    storage.setItem(SESSION_KEY, JSON.stringify(session));
    return true;
  } catch {
    return false;
  }
}

export function clearStoredSession(storage) {
  try {
    storage.removeItem(SESSION_KEY);
  } catch {
    // The in-memory token is cleared by the caller even if storage is unavailable.
  }
}

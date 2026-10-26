import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAccessToken, setAuthFailureHandler } from '../services/api.js';

const AuthContext = createContext(null);
const SESSION_KEY = 'schoolVanAdminSession';

function isValidAdminUser(user) {
  return Boolean(
    user &&
    typeof user.id === 'string' &&
    typeof user.name === 'string' &&
    typeof user.email === 'string' &&
    user.role === 'admin'
  );
}

function getJwtExpiry(token) {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const payload = JSON.parse(window.atob(base64));
    return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

function isUnexpiredJwt(token) {
  const expiresAt = getJwtExpiry(token);
  return expiresAt !== null && expiresAt > Date.now();
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    try {
      window.sessionStorage.removeItem(SESSION_KEY);
    } catch {
      // The in-memory session is still cleared if browser storage is unavailable.
    }
    setSession(null);
  }, []);

  useEffect(() => {
    try {
      const storedValue = window.sessionStorage.getItem(SESSION_KEY);
      if (storedValue) {
        const storedSession = JSON.parse(storedValue);
        const token = storedSession?.accessToken;
        const user = storedSession?.user;

        if (typeof token === 'string' && isValidAdminUser(user) && isUnexpiredJwt(token)) {
          setAccessToken(token);
          setSession({ accessToken: token, user });
        } else {
          window.sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      try {
        window.sessionStorage.removeItem(SESSION_KEY);
      } catch {
        // Ignore storage access errors; the user can still sign in for this page load.
      }
      setAccessToken(null);
      setSession(null);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
    return () => setAuthFailureHandler(null);
  }, [clearSession]);

  useEffect(() => {
    if (!session?.accessToken) return undefined;
    const expiresAt = getJwtExpiry(session.accessToken);
    if (!expiresAt) {
      clearSession();
      return undefined;
    }
    const timeout = window.setTimeout(clearSession, Math.max(0, expiresAt - Date.now()));
    return () => window.clearTimeout(timeout);
  }, [session, clearSession]);

  function signIn({ accessToken, user }) {
    if (typeof accessToken !== 'string' || !isValidAdminUser(user) || !isUnexpiredJwt(accessToken)) {
      clearSession();
      return false;
    }
    const nextSession = { accessToken, user };
    try {
      window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    } catch {
      // Do not claim a restorable login when session storage could not save it.
      clearSession();
      return false;
    }
    setAccessToken(accessToken);
    setSession(nextSession);
    return true;
  }

  const value = useMemo(() => ({
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),
    isInitializing,
    signIn,
    signOut: clearSession
  }), [session, isInitializing, clearSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

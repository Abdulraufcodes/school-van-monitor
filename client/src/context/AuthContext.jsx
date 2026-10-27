import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { setAccessToken, setAuthFailureHandler } from '../services/api.js';
import { getCurrentUser } from '../services/auth.service.js';
import { clearStoredSession, getJwtExpiry, persistSession, restoreSession } from './authSession.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const clearSession = useCallback(() => {
    setAccessToken(null);
    try { clearStoredSession(window.sessionStorage); } catch { /* Storage may be unavailable. */ }
    setSession(null);
  }, []);

  useEffect(() => {
    setAuthFailureHandler(clearSession);
    return () => setAuthFailureHandler(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;

    async function initializeSession() {
      try {
        const storedSession = restoreSession(window.sessionStorage);
        if (!storedSession) return;

        setAccessToken(storedSession.accessToken);
        const response = await getCurrentUser();
        const currentUser = response?.success ? response.data?.user : null;
        const verifiedSession = { accessToken: storedSession.accessToken, user: currentUser };
        if (!currentUser || !persistSession(window.sessionStorage, verifiedSession)) {
          throw new Error('The current session could not be verified.');
        }
        if (!cancelled) setSession(verifiedSession);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    }

    initializeSession();
    return () => { cancelled = true; };
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
    const nextSession = { accessToken, user };
    let stored = false;
    try { stored = persistSession(window.sessionStorage, nextSession); } catch { /* Storage may be unavailable. */ }
    if (!stored) {
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

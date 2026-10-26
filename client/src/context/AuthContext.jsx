import { createContext, useContext, useMemo, useState } from 'react';
import { setAccessToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);

  function signIn({ accessToken, user }) {
    setAccessToken(accessToken);
    setSession({ accessToken, user });
  }

  function signOut() {
    setAccessToken(null);
    setSession(null);
  }

  const value = useMemo(() => ({
    user: session?.user ?? null,
    isAuthenticated: Boolean(session?.accessToken && session?.user),
    signIn,
    signOut
  }), [session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}

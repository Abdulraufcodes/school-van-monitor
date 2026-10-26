import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { getProtectedRouteRedirect } from './roleAccess.js';

export function ProtectedRoute({ allowedRoles = ['admin'] }) {
  const { isAuthenticated, isInitializing, user } = useAuth();
  if (isInitializing) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-100 px-6 text-slate-600">
        <p className="flex items-center gap-3 text-sm" role="status">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-cyan-700" />
          Restoring your session…
        </p>
      </main>
    );
  }
  const redirectTo = getProtectedRouteRedirect(user, isAuthenticated, allowedRoles);
  return redirectTo ? <Navigate to={redirectTo} replace /> : <Outlet />;
}

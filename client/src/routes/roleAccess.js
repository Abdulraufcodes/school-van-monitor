export const roleHomePaths = Object.freeze({
  admin: '/dashboard',
  driver: '/driver/dashboard',
  parent: '/parent/dashboard'
});

export function getRoleHomePath(role) {
  return roleHomePaths[role] ?? null;
}

export function getProtectedRouteRedirect(user, isAuthenticated, allowedRoles) {
  if (!isAuthenticated) return '/login';
  if (user && allowedRoles.includes(user.role)) return null;
  return getRoleHomePath(user?.role) || '/login';
}

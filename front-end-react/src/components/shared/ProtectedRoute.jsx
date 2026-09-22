/**
 * LANNENT — ProtectedRoute  (src/components/shared/ProtectedRoute.jsx)
 *
 * Role-based route guard. Wrap any route that requires auth.
 *
 * @prop {string[]} [allowedRoles]  - If provided, user.role must be in this list.
 *                                    Omit to allow any authenticated user.
 * @prop {ReactNode} children
 *
 * Behaviour:
 *   • Not logged in           → <Navigate to="/login" />  (preserves intended URL)
 *   • Wrong role              → <Navigate to={getDashboardRoute(role)} />
 *   • Auth still loading      → renders null (prevents flash-of-redirect)
 *   • All checks pass         → renders children
 *
 * @example
 *   // Any authenticated user
 *   <ProtectedRoute><Messages /></ProtectedRoute>
 *
 *   // Only clients
 *   <ProtectedRoute allowedRoles={['client']}><ClientDashboard /></ProtectedRoute>
 *
 *   // Multiple staff roles
 *   <ProtectedRoute allowedRoles={['superuser','revenue-admin']}>
 *     <AdminRevenue />
 *   </ProtectedRoute>
 */

import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { getDashboardRoute } from '../../lib/auth';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { currentUser, isLoggedIn, loading } = useAuth();
  const location = useLocation();

  // Still reading localStorage — wait silently to avoid a redirect flicker
  if (loading) return null;

  // Not authenticated → send to /login, remember where they were going
  if (!isLoggedIn) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check
  if (allowedRoles && allowedRoles.length > 0) {
    if (!allowedRoles.includes(currentUser.role)) {
      return <Navigate to={getDashboardRoute(currentUser.role)} replace />;
    }
  }

  return children;
}

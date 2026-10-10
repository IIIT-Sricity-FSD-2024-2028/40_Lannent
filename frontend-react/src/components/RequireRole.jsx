/**
 * LANNENT — RequireRole
 * Route guard that replaces `Auth.requireRole(...)` at the top of each page.
 * Not signed in → /login. Wrong role → that user's own dashboard.
 *
 *   <RequireRole roles={['client']}><ClientDashboard /></RequireRole>
 */
import { Navigate } from 'react-router-dom';
import Auth from '../lib/auth';

export default function RequireRole({ roles, children }) {
  const redirectTo = Auth.getRoleRedirect(roles);
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return children;
}

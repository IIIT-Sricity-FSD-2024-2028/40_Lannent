/**
 * LANNENT — RequireRole
 * Route guard. Not signed in → /login. Wrong role → that user's own dashboard.
 *
 *   <RequireRole roles={['client']}><ClientDashboard /></RequireRole>
 */
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getRoleRedirect, selectCurrentUser } from '../store/slices/authSlice';

export default function RequireRole({ roles, children }) {
  const session = useSelector(selectCurrentUser);
  const redirectTo = getRoleRedirect(session, roles);
  if (redirectTo) return <Navigate to={redirectTo} replace />;
  return children;
}

/**
 * LANNENT — AdminDashboard
 *
 * The one admin desk became three (revenue, intake, compliance), each landing
 * on its own work. This route only exists for old bookmarks, and always
 * redirects:
 *   signed in  → that user's own dashboard
 *   signed out → login
 */
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { getDashboardUrl, selectCurrentUser } from '../store/slices/authSlice';

export default function AdminDashboard() {
  const u = useSelector(selectCurrentUser);
  if (!u) return <Navigate to="/login" replace />;
  return <Navigate to={getDashboardUrl(u.role)} replace />;
}

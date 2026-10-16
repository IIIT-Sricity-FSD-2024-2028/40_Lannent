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
import { useAuth } from '../context/AuthContext';

export default function AdminDashboard() {
  const Auth = useAuth();
  const u = Auth.getCurrentUser();
  if (!u) return <Navigate to="/login" replace />;
  return <Navigate to={Auth.getDashboardUrl(u.role)} replace />;
}

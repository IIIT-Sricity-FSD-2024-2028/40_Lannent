/**
 * LANNENT — Choose your password
 * Shown to an account that was created by someone else (a superuser making a
 * staff, client or worker account). Its creator chose the first password, so
 * the server refuses everything else until the owner replaces it.
 */
import { Navigate, useNavigate } from 'react-router-dom';
import ChangePasswordCard from '../components/ChangePasswordCard';
import { useAuth } from '../context/AuthContext';
import usePageTitle from '../hooks/usePageTitle';

export default function ChangePassword() {
  const Auth = useAuth();
  const navigate = useNavigate();
  usePageTitle('Choose your password — Lannent');
  const user = Auth.getCurrentUser();
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, background: 'var(--background)' }}>
      <div style={{ width: '100%', maxWidth: 480, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 28 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6 }}>Choose your own password</h1>
        <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20, lineHeight: 1.6 }}>
          {user.mustChangePassword
            ? 'This account was set up for you with a temporary password. Enter it below as your current password, then choose one only you know. You can use the account once this is done.'
            : 'Change the password for your account.'}
        </p>
        <ChangePasswordCard onChanged={() => navigate(Auth.getDashboardUrl(user.role), { replace: true })} />
        <button type="button" className="btn-outline" style={{ marginTop: 16, padding: '8px 16px', borderRadius: 10 }} onClick={() => Auth.logout()}>
          Sign out
        </button>
      </div>
    </div>
  );
}

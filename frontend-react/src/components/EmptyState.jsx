/**
 * LANNENT — EmptyState
 * An empty/error message inside the normal dashboard shell.
 * React version of renderEmptyState() in front-end/js/dashboard.js — used
 * instead of leaving the user on a blank page with no sidebar.
 */
import { Link } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';

export default function EmptyState({
  role = 'client',
  activePath = '',
  pageTitle = 'Nothing to show',
  message = 'There is nothing to display here yet.',
  linkHref = '',
  linkLabel = '',
}) {
  return (
    <DashboardLayout role={role} activePath={activePath} pageTitle={pageTitle} pageSubtitle="">
      <div style={{ padding: '56px 24px', textAlign: 'center', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16 }}>
        <div style={{ fontSize: 15, color: 'var(--muted-foreground)', marginBottom: linkHref ? 18 : 0 }}>{message}</div>
        {linkHref ? <Link to={linkHref} className="btn-primary" style={{ textDecoration: 'none' }}>{linkLabel || 'Go back'}</Link> : null}
      </div>
    </DashboardLayout>
  );
}

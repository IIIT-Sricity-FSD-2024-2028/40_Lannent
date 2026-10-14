/**
 * LANNENT — StaffSettings
 * Converted from front-end/pages/staff-settings.html.
 *
 * Settings for staff accounts (super user and the admin desks): edit the
 * display name and email, and see what the role is allowed to do.
 *
 * SuperUser and Admin previously had no settings page at all: the user menu
 * sent them to profile-settings.html, which is client-guarded and bounced
 * them straight back to their dashboard — an inescapable loop.
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './StaffSettings.css?raw';

// What each staff role can do (read-only list).
const SCOPES = {
  superuser: [
    'Manage user accounts — create, edit, suspend, delete',
    'Create and administer tasks across all clients',
    'Inspect escrow balances and the transaction ledger',
    'Review and override dispute verdicts',
  ],
  admin: [
    'Oversee the platform revenue model and fee configuration',
    'Review Expert Reviewer applications',
  ],
};

export default function StaffSettings() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Settings — Lannent');
  const session = Auth.getCurrentUser();
  const user = Store.getUserById(session.userId);
  const [name, setName] = useState(user ? user.name : '');
  const [email, setEmail] = useState(user ? user.email : '');

  if (!user) {
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState
          role={session.role}
          activePath="/staff-settings"
          pageTitle="Settings"
          message="Your account could not be loaded. Check that the API is running, then reload."
          linkHref={Auth.getDashboardUrl(session.role)}
          linkLabel="Back to Dashboard"
        />
      </>
    );
  }

  const scope = SCOPES[user.role] || [];

  function saveStaffProfile() {
    const nameVal = name.trim();
    const emailVal = email.trim();

    if (nameVal.length < 2) { Validate.toast('Enter a display name.', 'error'); return; }
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(emailVal)) { Validate.toast('Enter a valid email address.', 'error'); return; }

    const updated = Store.updateUser(session.userId, { name: nameVal, email: emailVal });
    if (!updated) { Validate.toast('Could not save. Please try again.', 'error'); return; }

    // Keep the session in step so the top bar does not show a stale name.
    try {
      localStorage.setItem('lannent_session', JSON.stringify({ ...session, name: nameVal, email: emailVal }));
    } catch (e) {}
    Validate.toast('Settings saved.', 'success');
    setTimeout(() => window.location.reload(), 700);
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={user.role} activePath="/staff-settings" pageTitle="Settings" pageSubtitle="Your staff account">
        <div className="ss-wrap">
          <div className="ss-card">
            <div className="ss-id">
              <div className="ss-avatar" style={{ background: user.avatarColor }}>{user.avatar}</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{user.name}</div>
                <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 6 }}>{user.email}</div>
                <span className="ss-role">{user.role}</span>
              </div>
            </div>

            <div className="ss-field">
              <label htmlFor="ssName">Display name</label>
              {' '}
              <input id="ssName" className="form-input" type="text" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="ss-field">
              <label htmlFor="ssEmail">Email</label>
              {' '}
              <input id="ssEmail" className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <button className="btn-primary" onClick={saveStaffProfile}>Save changes</button>
          </div>

          <div className="ss-card">
            <h2>What this account can do</h2>
            <p className="hint">Staff permissions are fixed by role and cannot be edited here.</p>
            <ul className="ss-scope">
              {scope.map(line => <li key={line}>{line}</li>)}
            </ul>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

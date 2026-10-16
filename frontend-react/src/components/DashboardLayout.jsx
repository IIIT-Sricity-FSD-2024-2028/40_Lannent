/**
 * LANNENT — DashboardLayout
 * Shared sidebar + top navigation for all dashboard pages.
 * React version of initDashboard() in front-end/js/dashboard.js.
 *
 *   <DashboardLayout role="client" activePath="/client-dashboard"
 *                    pageTitle="Client Dashboard" pageSubtitle="Manage your projects">
 *     ...page content...
 *   </DashboardLayout>
 */
import { useState } from 'react';
import Sidebar from './Sidebar';
import TopNavbar from './TopNavbar';
import OfflineBanner from './OfflineBanner';
import { useAuth } from '../context/AuthContext';

/** Name / initials / email shown in the top bar — always the signed-in user's. */
function getDisplayUser(Auth, role) {
  // Every dashboard route is behind a sign-in guard, so the session is there.
  // The old fallback invented people ("James Client", "Dr. Jane S.").
  const ROLE_NAMES = {
    client: 'Client', worker: 'Gig Worker', expert: 'Expert Reviewer', superuser: 'Super Admin',
    'revenue-admin': 'Revenue Admin', 'intake-admin': 'Intake Admin', 'compliance-admin': 'Compliance',
  };
  let name = ROLE_NAMES[role] || 'Member';
  let initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  let email = '';
  let avatarColor = '';
  let id = '';

  const session = Auth.getCurrentUser();
  if (session) {
    name = session.name || name;
    initials = session.avatar || initials;
    email = session.email || email;
    avatarColor = session.avatarColor || '';
    id = session.userId || '';
  }
  return { id, name, initials, email, avatarColor };
}

export default function DashboardLayout({ role = 'client', activePath = '', pageTitle = 'Dashboard', pageSubtitle = '', children }) {
  const Auth = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  // Read once when the page opens: like the original shell, the top bar keeps
  // showing the same name until the next page load (even after a profile save).
  const [user] = useState(() => getDisplayUser(Auth, role));

  return (
    <div className="dashboard-layout">
      {/* SIDEBAR */}
      <Sidebar role={role} activePath={activePath} collapsed={collapsed} onToggle={() => setCollapsed(c => !c)} />

      {/* MAIN CONTENT */}
      <div className={'main-content ' + (collapsed ? 'sidebar-collapsed' : 'sidebar-expanded')} id="mainContent">
        {/* TOP NAV */}
        <TopNavbar role={role} user={user} />

        {/* PAGE CONTENT */}
        <main className="page-content" id="pageContent">
          <div className="page-header">
            <h1 className="page-title">{pageTitle}</h1>
            {pageSubtitle ? <p className="page-sub">{pageSubtitle}</p> : null}
          </div>
          <OfflineBanner />
          {children}
        </main>
      </div>
    </div>
  );
}

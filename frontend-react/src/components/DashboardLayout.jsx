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

/** Name / initials / email shown in the top bar — the session's, or a role default. */
function getDisplayUser(Auth, role) {
  let name =
    role === 'worker' ? 'Alex W.' :
    role === 'expert' ? 'Dr. Jane S.' :
    role === 'superuser' ? 'Super Admin' :
    role === 'revenue-admin' ? 'Revenue Admin' :
    role === 'intake-admin' ? 'Intake Admin' :
    role === 'compliance-admin' ? 'Compliance' :
    'James Client';
  let initials = role === 'worker' ? 'AW' : role === 'expert' ? 'JS' : role === 'superuser' ? 'SA' : 'JC';
  let email = name.toLowerCase().replace(/\s+/g, '') + '@lannent.com';
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

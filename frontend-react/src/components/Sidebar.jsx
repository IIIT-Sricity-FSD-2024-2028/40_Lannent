/**
 * LANNENT — Sidebar
 * Left navigation of every dashboard page (from front-end/js/dashboard.js).
 * The menu items depend on the signed-in role; the toggle at the bottom
 * collapses/expands the sidebar.
 */
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';

// ─── Menu items per role ──────────────────────────────────────────────────────
const clientItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', path: '/client-dashboard' },
  { icon: 'folder-kanban', label: 'My Projects', path: '/client-my-projects' },
  { icon: 'plus-circle', label: 'Post Task', path: '/post-task' },
  { icon: 'user-plus', label: 'Hire Workers', path: '/hire-gig-workers' },
  { icon: 'users', label: 'Worker Applications', path: '/worker-applications' },
  { icon: 'shield-check', label: 'Audit & Dispute Fees', path: '/audit-offers' },
  { icon: 'wallet', label: 'Wallet', path: '/client-wallet' },
  { icon: 'message-square', label: 'Messages', path: '/messages' },
  { icon: 'file-text', label: 'Reports', path: '/milestone-reports' },
  { icon: 'settings', label: 'Settings', path: '/profile-settings' },
];

const workerItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', path: '/worker-dashboard' },
  { icon: 'search', label: 'Browse Tasks', path: '/browse-tasks' },
  { icon: 'folder-kanban', label: 'My Projects', path: '/worker-my-projects' },
  { icon: 'mail', label: 'Invitations', path: '/worker-invitations' },
  { icon: 'file-text', label: 'My Proposals', path: '/my-proposals' },
  { icon: 'wallet', label: 'Wallet', path: '/worker-wallet' },
  { icon: 'message-square', label: 'Messages', path: '/messages' },
  { icon: 'file-text', label: 'Reports', path: '/milestone-reports' },
  { icon: 'settings', label: 'Settings', path: '/worker-settings' },
];

const expertItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', path: '/expert-dashboard' },
  { icon: 'clipboard-check', label: 'Audit Requests', path: '/expert-audit-requests' },
  { icon: 'scale', label: 'Dispute Cases', path: '/expert-dispute-cases' },
  { icon: 'file-text', label: 'Reports', path: '/expert-reports' },
  { icon: 'wallet', label: 'Wallet', path: '/expert-wallet' },
  { icon: 'message-square', label: 'Messages', path: '/messages' },
  { icon: 'settings', label: 'Settings', path: '/expert-settings' },
];

const superItems = [
  { icon: 'layout-dashboard', label: 'Dashboard', path: '/superuser-dashboard' },
  { icon: 'users', label: 'Manage Users', path: '/superuser-users' },
  { icon: 'folder-kanban', label: 'Manage Tasks', path: '/superuser-tasks' },
  { icon: 'scale', label: 'Disputes', path: '/superuser-disputes' },
  { icon: 'wallet', label: 'Escrow & Finance', path: '/superuser-escrow' },
];

// The single admin desk is now three, and each sees only its own work. A
// revenue admin has no route to the application queue, and an intake admin
// none to the fee configuration — the split is in the navigation as well as
// in the guards, so neither is ever one wrong click from the other's job.
const revenueAdminItems = [
  { icon: 'trending-up', label: 'Revenue', path: '/admin-revenue' },
  { icon: 'percent', label: 'Fee Configuration', path: '/admin-fee-config' },
];

const intakeAdminItems = [
  { icon: 'shield-check', label: 'Expert Applications', path: '/admin-expert-applications' },
];

// Everything compliance reaches is read-only, including the two pages it
// shares with the revenue desk.
const complianceAdminItems = [
  { icon: 'clipboard-list', label: 'Audit Log', path: '/compliance-dashboard' },
  { icon: 'trending-up', label: 'Revenue', path: '/admin-revenue' },
  { icon: 'shield-check', label: 'Applications', path: '/admin-expert-applications' },
];

/** Returns the sidebar menu for a role (clients are the default). */
export function getMenuItems(role) {
  return role === 'worker' ? workerItems :
    role === 'expert' ? expertItems :
    role === 'superuser' ? superItems :
    role === 'revenue-admin' ? revenueAdminItems :
    role === 'intake-admin' ? intakeAdminItems :
    role === 'compliance-admin' ? complianceAdminItems :
    clientItems;
}

/**
 * @param {string}   role        - signed-in role, picks the menu
 * @param {string}   activePath  - route of the current page, highlights its item
 * @param {boolean}  collapsed   - sidebar state (owned by DashboardLayout)
 * @param {Function} onToggle    - called by the collapse button
 */
export default function Sidebar({ role, activePath, collapsed, onToggle }) {
  const location = useLocation();
  const menuItems = getMenuItems(role);

  return (
    <aside className={'sidebar ' + (collapsed ? 'collapsed' : 'expanded')} id="sidebar">
      <div className="sidebar-logo">
        <Link to="/" className="sidebar-logo-link">
          <div className="sidebar-logo-icon">L</div>
          <span className="sidebar-logo-text">Lannent<span>.</span></span>
        </Link>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map(item => {
          const isActive = activePath ? activePath === item.path : location.pathname === item.path;
          return (
            <Link key={item.label} to={item.path} title={item.label} className={'sidebar-item' + (isActive ? ' active' : '')}>
              <span className="sidebar-item-icon">
                <Icon name={item.icon} style={{ width: 20, height: 20 }} />
              </span>
              <span className="sidebar-item-label">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="sidebar-footer" style={{ padding: 24 }}>
        <button className="sidebar-toggle" id="sidebarToggle" title="Collapse sidebar" style={{ borderRadius: 16 }} onClick={onToggle}>
          {/* The original swapped data-lucide after the icon had already been
              rendered, so the arrow always stayed "chevron-left". Kept as-is. */}
          <Icon name="chevron-left" style={{ width: 20, height: 20 }} id="sidebarChevron" />
        </button>
      </div>
    </aside>
  );
}

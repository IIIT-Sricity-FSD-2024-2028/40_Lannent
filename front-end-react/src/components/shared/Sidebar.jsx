/**
 * LANNENT — Sidebar  (src/components/shared/Sidebar.jsx)
 *
 * Role-aware, collapsible sidebar. Active link highlighting via useLocation().
 * Nav items are ported exactly from dashboard.js.
 *
 * @prop {string}   role       - 'client' | 'worker' | 'expert' | 'superuser' |
 *                               'revenue-admin' | 'intake-admin' | 'compliance-admin'
 * @prop {boolean}  collapsed  - Controlled by DashboardLayout
 * @prop {function} onToggle   - Called when the chevron button is clicked
 */

import { NavLink } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import * as Icons from 'lucide-react';

// ─── Nav item definitions (from dashboard.js) ────────────────────────────────

const NAV = {
  client: [
    { icon: 'LayoutDashboard', label: 'Dashboard',           to: '/client/dashboard' },
    { icon: 'FolderKanban',    label: 'My Projects',         to: '/client/projects' },
    { icon: 'PlusCircle',      label: 'Post Task',           to: '/client/post-task' },
    { icon: 'UserPlus',        label: 'Hire Workers',        to: '/client/hire' },
    { icon: 'Users',           label: 'Worker Applications', to: '/client/applications' },
    { icon: 'ShieldCheck',     label: 'Audit Offers',        to: '/client/audit-offers' },
    { icon: 'Wallet',          label: 'Wallet',              to: '/client/wallet' },
    { icon: 'MessageSquare',   label: 'Messages',            to: '/shared/messages' },
    { icon: 'FileText',        label: 'Reports',             to: '/shared/reports' },
    { icon: 'Settings',        label: 'Settings',            to: '/settings/profile' },
  ],
  worker: [
    { icon: 'LayoutDashboard', label: 'Dashboard',    to: '/worker/dashboard' },
    { icon: 'Search',          label: 'Browse Tasks', to: '/worker/browse' },
    { icon: 'FolderKanban',    label: 'My Projects',  to: '/worker/projects' },
    { icon: 'Mail',            label: 'Invitations',  to: '/worker/invitations' },
    { icon: 'FileText',        label: 'My Proposals', to: '/worker/proposals' },
    { icon: 'Wallet',          label: 'Wallet',       to: '/worker/wallet' },
    { icon: 'MessageSquare',   label: 'Messages',     to: '/shared/messages' },
    { icon: 'FileText',        label: 'Reports',      to: '/shared/reports' },
    { icon: 'Settings',        label: 'Settings',     to: '/settings/worker' },
  ],
  expert: [
    { icon: 'LayoutDashboard', label: 'Dashboard',      to: '/expert/dashboard' },
    { icon: 'ClipboardCheck',  label: 'Audit Requests', to: '/expert/audit-requests' },
    { icon: 'Scale',           label: 'Dispute Cases',  to: '/expert/disputes' },
    { icon: 'FileText',        label: 'Reports',        to: '/expert/reports' },
    { icon: 'MessageSquare',   label: 'Messages',       to: '/expert/messages' },
    { icon: 'Settings',        label: 'Settings',       to: '/settings/expert' },
  ],
  superuser: [
    { icon: 'LayoutDashboard', label: 'Dashboard',        to: '/superuser/dashboard' },
    { icon: 'Users',           label: 'Manage Users',     to: '/superuser/users' },
    { icon: 'FolderKanban',    label: 'Manage Tasks',     to: '/superuser/tasks' },
    { icon: 'Wallet',          label: 'Escrow & Finance', to: '/superuser/escrow' },
    { icon: 'AlertOctagon',    label: 'Disputes',         to: '/superuser/disputes' },
    { icon: 'ShieldCheck',     label: 'Expert Apps',      to: '/admin/expert-applications' },
    { icon: 'TrendingUp',      label: 'Revenue',          to: '/admin/revenue' },
    { icon: 'BarChart2',       label: 'Analytics',        to: '/admin/analytics' },
  ],
  'revenue-admin': [
    { icon: 'TrendingUp', label: 'Revenue',           to: '/admin/revenue' },
    { icon: 'Percent',    label: 'Fee Configuration', to: '/admin/fee-config' },
    { icon: 'BarChart2',  label: 'Analytics',         to: '/admin/analytics' },
  ],
  'intake-admin': [
    { icon: 'ShieldCheck', label: 'Expert Applications', to: '/admin/expert-applications' },
  ],
  'compliance-admin': [
    { icon: 'ClipboardList', label: 'Audit Log',     to: '/admin/compliance' },
    { icon: 'TrendingUp',    label: 'Revenue',       to: '/admin/revenue' },
    { icon: 'ShieldCheck',   label: 'Applications',  to: '/admin/expert-applications' },
  ],
};

function getNavItems(role) {
  return NAV[role] || NAV.client;
}

// ─── Single nav item ──────────────────────────────────────────────────────────

function NavItem({ icon, label, to, collapsed }) {
  const Icon = Icons[icon] || Icons.Circle;
  return (
    <NavLink
      to={to}
      title={collapsed ? label : undefined}
      className={({ isActive }) => `sidebar-item${isActive ? ' active' : ''}`}
    >
      <span className="sidebar-item-icon">
        <Icon style={{ width: 20, height: 20 }} />
      </span>
      {!collapsed && <span className="sidebar-item-label">{label}</span>}
    </NavLink>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

export default function Sidebar({ role, collapsed, onToggle }) {
  const items = getNavItems(role);

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : 'expanded'}`} id="sidebar">

      {/* Logo */}
      <div className="sidebar-logo">
        <a href="/" className="sidebar-logo-link">
          <div className="sidebar-logo-icon">L</div>
          {!collapsed && (
            <span className="sidebar-logo-text">Lannent<span>.</span></span>
          )}
        </a>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {items.map(item => (
          <NavItem
            key={item.to}
            icon={item.icon}
            label={item.label}
            to={item.to}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Collapse toggle */}
      <div className="sidebar-footer" style={{ padding: 24 }}>
        <button
          className="sidebar-toggle"
          onClick={onToggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          style={{ borderRadius: 16 }}
        >
          {collapsed
            ? <ChevronRight style={{ width: 20, height: 20 }} />
            : <ChevronLeft  style={{ width: 20, height: 20 }} />
          }
        </button>
      </div>
    </aside>
  );
}

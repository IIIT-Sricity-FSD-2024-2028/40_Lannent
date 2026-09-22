/**
 * LANNENT — DashboardLayout  (src/components/shared/DashboardLayout.jsx)
 *
 * The shared wrapper that EVERY portal page must use.
 * Composes: Sidebar + TopNavbar + page content area.
 *
 * Reads the user's role from useAuth() to give Sidebar the correct nav items.
 *
 * @prop {string}    pageTitle     - Rendered as <h1> in the main content area
 * @prop {string}    [pageSubtitle]- Optional sub-heading below the title
 * @prop {ReactNode} children      - The page-specific content
 *
 * @example
 *   import DashboardLayout from '../components/shared/DashboardLayout';
 *
 *   export default function ClientDashboard() {
 *     return (
 *       <DashboardLayout pageTitle="Client Dashboard" pageSubtitle="Manage your projects">
 *         <StatsGrid />
 *         <ProjectsTable />
 *       </DashboardLayout>
 *     );
 *   }
 */

import { useState } from 'react';
import Sidebar   from './Sidebar';
import TopNavbar from './TopNavbar';
import { useAuth } from '../../hooks/useAuth';

export default function DashboardLayout({ pageTitle, pageSubtitle, children }) {
  const { currentUser } = useAuth();
  const role = currentUser?.role || 'client';

  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="dashboard-layout">
      <Sidebar
        role={role}
        collapsed={collapsed}
        onToggle={() => setCollapsed(c => !c)}
      />

      <div
        className={`main-content ${collapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}
        id="mainContent"
      >
        <TopNavbar />

        <main className="page-content" id="pageContent">
          <div className="page-header">
            <h1 className="page-title">{pageTitle}</h1>
            {pageSubtitle && <p className="page-sub">{pageSubtitle}</p>}
          </div>

          {children}
        </main>
      </div>
    </div>
  );
}

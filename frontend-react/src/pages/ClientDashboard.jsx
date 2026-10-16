/**
 * LANNENT — ClientDashboard
 * Converted from front-end/pages/client-dashboard.html.
 *
 * The client's home: four live stats, quick-action shortcuts and the table
 * of their active (not yet completed) projects.
 */
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';

// Milestone statuses that count as "done" for the progress bar.
const DONE_STATUSES = ['completed', 'approved', 'audit-passed', 'done'];
const STATUS_BADGES = { 'in-progress': 'badge-blue', 'review': 'badge-purple', 'pending': 'badge-orange', 'completed': 'badge-green', 'open': 'badge-orange' };

/** One row of the "Active Projects" table. */
function ProjectRow({ task: t }) {
  const Store = useStore();
  const worker = Store.getUserById(t.workerId);
  const avatar = worker ? worker.avatar : '?';
  const name = worker ? worker.name : 'Not Assigned';
  const bg = worker ? worker.avatarColor : '#e5e7eb';
  const color = worker ? 'white' : '#6b7280';

  const ms = Store.getMilestonesByTask(t.id);
  const msCount = ms.length;
  const msDone = ms.filter(m => DONE_STATUSES.includes(m.status)).length;
  const prog = msCount ? Math.round((msDone / msCount) * 100) : 0;
  const badgeClass = STATUS_BADGES[t.status] || 'badge-blue';

  return (
    <tr>
      <td style={{ fontWeight: 600 }}>{t.title}</td>
      <td>
        <div className="worker-cell">
          <div className="worker-avatar" style={{ background: bg, color }}>{avatar}</div>
          <span style={!worker ? { color: 'var(--muted-foreground)' } : undefined}>{name}</span>
        </div>
      </td>
      <td style={{ minWidth: 140 }}>
        <div className="progress-info">
          <span>{`${msDone}/${msCount} completed`}</span>
          <span style={{ color: '#6366f1', fontWeight: 600 }}>{`${prog}%`}</span>
        </div>
        <div className="progress-track-sm">
          <div className="progress-fill-sm" style={{ width: `${prog}%` }}></div>
        </div>
      </td>
      <td style={{ color: 'var(--muted-foreground)', fontSize: 13 }}>
        {t.deadline ? new Date(t.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'TBD'}
      </td>
      <td>
        <span className={`badge ${badgeClass}`} style={{ textTransform: 'capitalize' }}>{(t.status || 'unknown').replace(/-/g, ' ')}</span>
      </td>
      <td style={{ fontWeight: 600 }}>{`₹${(t.budget || 0).toLocaleString('en-IN')}`}</td>
      <td>
        <Link to={`/project-workroom?id=${t.id}`} className="btn-sm">View</Link>
      </td>
    </tr>
  );
}

export default function ClientDashboard() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Client Dashboard — Lannent');

  // Live stats from store
  const session = Auth.getCurrentUser();
  const userId = session.userId;
  const myTasks = Store.getTasksByClient(userId);
  const activeTasks = myTasks.filter(t => t.status === 'in-progress').length;
  const pendingApps = Store.getProposals().filter(p => p.type === 'application' && p.status === 'pending' && myTasks.some(t => t.id === p.taskId)).length;
  const user = Store.getUserById(userId);
  const walletBal = user?.walletBalance || 0;
  const completedTasks = myTasks.filter(t => t.status === 'completed').length;
  const openProjects = myTasks.filter(t => !['completed', 'cancelled'].includes(t.status)).slice(0, 4);

  return (
    <DashboardLayout role="client" activePath="/client-dashboard" pageTitle="Client Dashboard" pageSubtitle="Manage your projects and track progress">
      {/* Stats */}
      <div className="stats-grid">
        <StatCard value={activeTasks} label="Active Projects" change={`${myTasks.length} total`} icon="folder-kanban" iconBg="#eff6ff" iconColor="#3b82f6" />
        <StatCard value={pendingApps} label="Pending Applications" change="waiting for you" icon="users" iconBg="#faf5ff" iconColor="#a855f7" />
        <StatCard value={`₹${walletBal.toLocaleString('en-IN')}`} label="Wallet Balance" change="Available" icon="wallet" iconBg="#ecfdf5" iconColor="#10b981" />
        <StatCard value={completedTasks} label="Completed Tasks" change="all time" icon="check-circle" iconBg="#fff7ed" iconColor="#f97316" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 32 }}>
        <h2 style={{ fontFamily: "'Geist', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", fontSize: 24, fontWeight: 500, marginBottom: 20 }}>Quick Actions</h2>
        <div className="quick-actions-v2">
          <Link to="/post-task" className="qa-v2-card" style={{ background: '#f0f6ff', borderColor: '#e0efff' }}>
            <div className="qa-v2-icon" style={{ color: '#2563eb' }}>
              <Icon name="plus" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Post New Task</div>
              <div className="qa-v2-desc">Create a new project and hire workers</div>
            </div>
          </Link>
          {' '}
          <Link to="/hire-gig-workers" className="qa-v2-card" style={{ background: '#fdf5ff', borderColor: '#f8e4ff' }}>
            <div className="qa-v2-icon" style={{ color: '#9333ea' }}>
              <Icon name="search" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Browse Gig Workers</div>
              <div className="qa-v2-desc">Find verified talent for your projects</div>
            </div>
          </Link>
          {' '}
          <Link to="/worker-applications" className="qa-v2-card" style={{ background: '#f0fdf4', borderColor: '#dcfce7' }}>
            <div className="qa-v2-icon" style={{ color: '#16a34a' }}>
              <Icon name="eye" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">View Applications</div>
              <div className="qa-v2-desc">Hire from workers who applied</div>
            </div>
          </Link>
          {' '}
          <Link to="/client-wallet" className="qa-v2-card" style={{ background: '#fffaf0', borderColor: '#ffeed5' }}>
            <div className="qa-v2-icon" style={{ color: '#ea580c' }}>
              <Icon name="wallet" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Manage Wallet</div>
              <div className="qa-v2-desc">Add funds and view transactions</div>
            </div>
          </Link>
        </div>
      </div>

      {/* Active Projects Table */}
      <div className="projects-table">
        <div className="table-header">
          <span className="table-title">Active Projects</span>
          {' '}
          <Link to="/client-my-projects" className="btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>View All</Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Project</th>
                <th>Worker</th>
                <th>Progress</th>
                <th>Deadline</th>
                <th>Status</th>
                <th>Escrow</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {openProjects.length ? openProjects.map(t => <ProjectRow key={t.id} task={t} />) : (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted-foreground)', padding: 24 }}>No active projects right now. Start by posting a task!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}

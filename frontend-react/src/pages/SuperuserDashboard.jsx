/**
 * LANNENT — SuperuserDashboard
 * Converted from front-end/pages/superuser-dashboard.html.
 *
 * Platform overview for the super user: user / task / escrow totals,
 * quick actions, and the five most recent users and tasks.
 */
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';

const TASK_STATUS_BADGES = { 'open': 'badge-orange', 'in-progress': 'badge-blue', 'completed': 'badge-green', 'cancelled': 'badge-red' };

/** Coloured status pill for a task. */
function StatusBadge({ status }) {
  return <span className={`badge ${TASK_STATUS_BADGES[status] || 'badge-blue'}`}>{status.replace(/-/g, ' ')}</span>;
}

/** Badge colour per user role. */
function roleBadge(role) {
  return role === 'client' ? 'badge-blue' : role === 'expert' ? 'badge-purple' : role === 'superuser' ? 'badge-red' : 'badge-green';
}

export default function SuperuserDashboard() {
  const Store = useStore();
  usePageTitle('Super User Dashboard — Lannent');

  const users = Store.getUsers();
  const tasks = Store.getTasks();
  const transactions = Store.getTransactions();

  const totalUsers = users.length;
  const activeTasks = tasks.filter(t => t.status === 'in-progress').length;
  const escrowTotal = transactions.filter(t => t.type === 'escrow-lock').reduce((s, t) => s + t.amount, 0);
  const released = transactions.filter(t => t.type === 'milestone-release').reduce((s, t) => s + t.amount, 0);
  const escrowBalance = escrowTotal - released;

  // Role breakdown
  const clients = users.filter(u => u.role === 'client').length;
  const workers = users.filter(u => u.role === 'worker').length;
  const experts = users.filter(u => u.role === 'expert').length;

  // Most recent five of each
  const recentUsers = [...users].slice(-5).reverse();
  const recentTasks = [...tasks].slice(-5).reverse();

  return (
    <DashboardLayout role="superuser" activePath="/superuser-dashboard" pageTitle="Super User Dashboard" pageSubtitle="Full platform control and oversight">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
        <StatCard value={totalUsers} label="Total Users" change={`${clients}C · ${workers}W · ${experts}E`} icon="users" iconBg="#eff6ff" iconColor="#3b82f6" />
        <StatCard value={tasks.length} label="Total Tasks" change={`${activeTasks} active`} icon="folder-kanban" iconBg="#ecfdf5" iconColor="#10b981" />
        <StatCard value={`$${escrowBalance.toLocaleString()}`} label="Escrow Balance" change={`$${released.toLocaleString()} released`} icon="wallet" iconBg="#faf5ff" iconColor="#a855f7" />
      </div>

      {/* Quick Actions */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 20, fontWeight: 500, marginBottom: 16 }}>Quick Actions</h2>
        <div className="quick-actions-v2">
          <Link to="/superuser-users" className="qa-v2-card" style={{ background: '#f0f6ff', borderColor: '#e0efff' }}>
            <div className="qa-v2-icon" style={{ color: '#2563eb' }}>
              <Icon name="users" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Manage Users</div>
              <div className="qa-v2-desc">Add, edit, suspend or delete users</div>
            </div>
          </Link>
          {' '}
          <Link to="/superuser-escrow" className="qa-v2-card" style={{ background: '#fdf5ff', borderColor: '#f8e4ff' }}>
            <div className="qa-v2-icon" style={{ color: '#9333ea' }}>
              <Icon name="wallet" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Escrow &amp; Finance</div>
              <div className="qa-v2-desc">Inspect held funds and the transaction ledger</div>
            </div>
          </Link>
          {' '}
          <Link to="/superuser-tasks" className="qa-v2-card" style={{ background: '#f0fdf4', borderColor: '#dcfce7' }}>
            <div className="qa-v2-icon" style={{ color: '#16a34a' }}>
              <Icon name="folder-kanban" style={{ width: 20, height: 20 }} />
            </div>
            <div className="qa-v2-content">
              <div className="qa-v2-title">Manage Tasks</div>
              <div className="qa-v2-desc">View or delete any task</div>
            </div>
          </Link>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {/* Recent Users */}
        <div className="projects-table">
          <div className="table-header">
            <span className="table-title">Recent Users</span>
            {' '}
            <Link to="/superuser-users" className="btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>User</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentUsers.map(u => (
                  <tr key={u.id}>
                    <td>
                      <div className="worker-cell">
                        <div className="worker-avatar" style={u.avatarColor ? { background: u.avatarColor } : undefined}>{u.avatar}</div>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 13 }}>{u.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${roleBadge(u.role)}`}>{u.role}</span>
                    </td>
                    <td>
                      <span className={`badge ${u.status === 'active' ? 'badge-green' : 'badge-red'}`}>{u.status}</span>
                    </td>
                    <td>
                      <Link to="/superuser-users" className="btn-sm">Edit</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Tasks */}
        <div className="projects-table">
          <div className="table-header">
            <span className="table-title">Recent Tasks</span>
            {' '}
            <Link to="/superuser-tasks" className="btn-outline" style={{ fontSize: 13, padding: '6px 14px' }}>View All</Link>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Budget</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentTasks.map(t => (
                  <tr key={t.id}>
                    <td style={{ fontWeight: 600, fontSize: 13 }}>{t.title}</td>
                    <td>{`$${t.budget.toLocaleString()}`}</td>
                    <td>
                      <StatusBadge status={t.status} />
                    </td>
                    <td>
                      <Link to="/superuser-tasks" className="btn-sm">View</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

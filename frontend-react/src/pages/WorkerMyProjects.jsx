/**
 * LANNENT — WorkerMyProjects
 * Converted from front-end/pages/worker-my-projects.html.
 *
 * The worker's projects as cards (progress, earnings, deadline), with
 * All / Active / Completed tabs and shortcuts to each project's milestone
 * board and workroom.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerMyProjects.css?raw';

const DONE_STATUSES = ['completed', 'approved'];
const STATUS_BADGES = {
  'open': ['badge-gray', 'Open'],
  'in-progress': ['badge-blue', 'In Progress'],
  'completed': ['badge-green', 'Completed'],
  'cancelled': ['badge-red', 'Cancelled'],
};

function fmtDate(d) {
  if (!d) return 'No deadline';
  try { return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }); } catch (e) { return d; }
}

function StatusBadge({ status }) {
  const [cls, label] = STATUS_BADGES[status] || ['badge-gray', status];
  return <span className={`badge ${cls}`}>{label}</span>;
}

/** The worker's tasks, shaped as project cards. */
function getProjects(Store, userId) {
  const payouts = Store.getTransactionsByUser(userId).filter(tx => tx.type === 'milestone-release' && tx.toId === userId);
  return Store.getTasksByWorker(userId).map(t => {
    const client = t.clientId ? Store.getUserById(t.clientId) : null;
    const milestones = Store.getMilestonesByTask(t.id);
    const doneList = milestones.filter(m => DONE_STATUSES.includes(m.status));
    const done = doneList.length;
    // What actually reached the wallet — milestone payouts net of the service fee.
    const earned = Math.round(payouts.filter(tx => tx.taskId === t.id).reduce((s, tx) => s + (Number(tx.amount) || 0), 0) * 100) / 100;
    const calculatedProgress = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : 0;
    return {
      id: t.id,
      name: t.title,
      client: client ? client.name : 'Unknown Client',
      clientAvatar: client ? client.avatar : '?',
      clientColor: client ? client.avatarColor : '#e5e7eb',
      progress: calculatedProgress,
      status: t.status,
      milestones: `${done}/${milestones.length}`,
      earned: `₹${earned.toLocaleString('en-IN')}`,
      total: `₹${(t.budget || 0).toLocaleString('en-IN')}`,
      deadline: fmtDate(t.deadline),
      category: t.status === 'completed' ? 'completed' : t.status === 'cancelled' ? 'cancelled' : 'active',
    };
  });
}

// Shared style of the two buttons at the bottom of each card
const CARD_BUTTON_STYLE = { padding: 10, border: '1px solid var(--border)', borderRadius: 10, background: 'white', color: 'var(--foreground)', fontSize: 13, fontWeight: 500, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 };

/** One project card. */
function ProjectCard({ project: p }) {
  const navigate = useNavigate();
  return (
    <div className="project-card" style={{ display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <h3 style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', flex: 1, marginRight: 12 }}>{p.name}</h3>
        <StatusBadge status={p.status} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: p.clientColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 11, fontWeight: 700 }}>{p.clientAvatar}</div>
        <span style={{ fontSize: 13, color: 'var(--foreground)' }}>{`Client: ${p.client}`}</span>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Milestone Progress</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--foreground)' }}>{`${p.milestones} approved`}</span>
        </div>
        <div style={{ height: 6, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#10b981,#059669)', width: `${p.progress}%`, transition: 'width 0.4s' }}></div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16, flex: 1 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, color: '#16a34a', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
            <Icon name="wallet" style={{ width: 13, height: 13 }} />
            Earned (net)
          </div>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#16a34a' }}>
            {`${p.earned} `}<span style={{ fontSize: 11, color: '#22c55e' }}>{`/ ${p.total}`}</span>
          </div>
        </div>
        <div style={{ background: 'white', border: '1px solid var(--border)', borderRadius: 12, padding: 12 }}>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4 }}>
            <Icon name="calendar" style={{ width: 13, height: 13, display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
            Deadline
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--foreground)' }}>{p.deadline}</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <button onClick={() => navigate(`/worker-milestone-board?id=${p.id}`)} style={CARD_BUTTON_STYLE}>
          <Icon name="layout-list" style={{ width: 14, height: 14 }} />
          Milestones
        </button>
        <button onClick={() => navigate(`/worker-workroom?id=${p.id}`)} style={CARD_BUTTON_STYLE}>
          <Icon name="message-circle" style={{ width: 14, height: 14 }} />
          Workroom
        </button>
      </div>
    </div>
  );
}

export default function WorkerMyProjects() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('My Projects — Lannent');
  const session = Auth.getCurrentUser();
  const [activeTab, setActiveTab] = useState('all');

  const all = getProjects(Store, session.userId);
  const active = all.filter(p => p.category === 'active').length;
  const completed = all.filter(p => p.category === 'completed').length;
  const cancelled = all.filter(p => p.category === 'cancelled').length;
  const list = activeTab === 'all' ? all : all.filter(p => p.category === activeTab);

  const tabClass = tab => 'tab-btn' + (activeTab === tab ? ' active' : '');

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="worker" activePath="/worker-my-projects" pageTitle="My Projects" pageSubtitle="Track your active projects and earnings">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div className="tab-bar">
            <button className={tabClass('all')} onClick={() => setActiveTab('all')}>{`All (${all.length})`}</button>
            {' '}
            <button className={tabClass('active')} onClick={() => setActiveTab('active')}>{`Active (${active})`}</button>
            {' '}
            <button className={tabClass('completed')} onClick={() => setActiveTab('completed')}>{`Completed (${completed})`}</button>
            {cancelled ? <>{' '}<button className={tabClass('cancelled')} onClick={() => setActiveTab('cancelled')}>{`Cancelled (${cancelled})`}</button></> : null}
          </div>
          <Link to="/browse-tasks" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <Icon name="search" style={{ width: 16, height: 16 }} /> Find More Tasks
          </Link>
        </div>

        <div id="projectsContainer">
          {!list.length ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Icon name="folder-open" style={{ width: 24, height: 24, color: 'var(--muted-foreground)' }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No projects here</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>Browse tasks and apply to start earning.</div>
              <Link to="/browse-tasks" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="search" style={{ width: 16, height: 16 }} /> Find Tasks
              </Link>
            </div>
          ) : (
            <div className="projects-grid">
              {list.map(p => <ProjectCard key={p.id} project={p} />)}
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

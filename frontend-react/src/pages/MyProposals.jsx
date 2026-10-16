/**
 * LANNENT — MyProposals
 * Converted from front-end/pages/my-proposals.html.
 *
 * Every project the worker has applied to, with counts per status, a status
 * filter, and the option to withdraw a pending one. There is no bidding: an
 * application is at the client's posted budget, and the client accepts
 * (the worker is hired and the project starts) or rejects it. Requests
 * clients send to the worker are on the Invitations page.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import FilterTabs from '../components/FilterTabs';
import Icon from '../components/Icon';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { hoverBackground } from '../utils/helpers';
import usePageTitle from '../hooks/usePageTitle';

const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['rejected', 'Rejected']];
const STATUS_BADGES = { 'Pending': 'badge-orange', 'Accepted': 'badge-green', 'Rejected': 'badge-red', 'Withdrawn': 'badge-gray', 'Closed': 'badge-gray' };

/** The worker's proposals, shaped for display. */
function loadProposals(Store, userId) {
  return Store.getApplicationsByWorker(userId).map(p => {
    const task = Store.getTaskById(p.taskId);
    const client = task && task.clientId ? Store.getUserById(task.clientId) : null;
    return {
      id: p.id,
      projectName: task ? task.title : 'Unknown Task',
      client: client ? client.name : 'Unknown Client',
      budget: task ? task.budget : 0,
      status: p.status === 'hired' ? 'Accepted' : p.status === 'rejected' ? 'Rejected'
        : p.status === 'withdrawn' ? 'Withdrawn' : p.status === 'closed' ? 'Closed' : 'Pending',
      rawStatus: p.status,
      submitted: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
      letter: p.message || '',
      taskId: p.taskId,
    };
  });
}

export default function MyProposals() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('My Proposals — Lannent');
  const session = Auth.getCurrentUser();

  // Counts are taken once, when the page loads (as in the original).
  const [counts] = useState(() => {
    const all = loadProposals(Store, session.userId);
    return {
      all: all.length,
      pending: all.filter(p => p.status === 'Pending').length,
      accepted: all.filter(p => p.status === 'Accepted').length,
      rejected: all.filter(p => p.status === 'Rejected').length,
    };
  });
  const [filter, setFilter] = useState('all');
  // Rows fading out / removed after "Withdraw" (they come back on the next filter change)
  const [fading, setFading] = useState([]);
  const [removed, setRemoved] = useState([]);

  const proposals = loadProposals(Store, session.userId);
  const list = (filter === 'all' ? proposals : proposals.filter(p => p.status.toLowerCase() === filter))
    .filter(p => !removed.includes(p.id));

  function changeFilter(value) {
    setFilter(value);
    setFading([]);
    setRemoved([]);
  }

  function withdrawProposal(id) {
    Validate.confirm('Withdraw this proposal? You can apply to the project again later.', () => {
      try {
        Store.withdrawProposal(id);
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
      setFading(f => [...f, id]);
      setTimeout(() => setRemoved(r => [...r, id]), 300);
      Validate.toast('Proposal withdrawn. You can apply again later.', 'success');
    });
  }

  return (
    <DashboardLayout role="worker" activePath="/my-proposals" pageTitle="My Proposals" pageSubtitle="Projects you applied to at the client's budget">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 16, marginBottom: 24 }}>
        <StatCard value={counts.all} label="Total" icon="file-text" iconBg="#eef2ff" iconColor="#6366f1" />
        <StatCard value={counts.pending} label="Pending" icon="clock" iconBg="#fff7ed" iconColor="#f97316" />
        <StatCard value={counts.accepted} valueStyle={{ color: '#10b981' }} label="Accepted" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
        <StatCard value={counts.rejected} label="Rejected" icon="x-circle" iconBg="#fee2e2" iconColor="#ef4444" />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <FilterTabs tabs={FILTERS} active={filter} onChange={changeFilter} />
          <Link to="/browse-tasks" className="btn-primary" style={{ fontSize: 13, padding: '7px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Icon name="search" style={{ width: 14, height: 14 }} />
            Browse Tasks
          </Link>
        </div>

        <div id="proposalsContainer">
          {!list.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <div style={{ width: 48, height: 48, background: 'var(--secondary)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon name="file-text" style={{ width: 22, height: 22 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No proposals yet</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>Browse open tasks and apply at the client&apos;s budget.</div>
              <Link to="/browse-tasks" className="btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <Icon name="search" style={{ width: 16, height: 16 }} /> Browse Tasks
              </Link>
            </div>
          ) : list.map(p => (
            <div key={p.id} id={`proposal-row-${p.id}`}
                 style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'background 0.15s', ...(fading.includes(p.id) ? { transition: 'opacity 0.3s', opacity: 0 } : {}) }}
                 {...hoverBackground('#f8f9fb')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{p.projectName}</span>
                  <span className={`badge ${STATUS_BADGES[p.status]}`}>{p.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="user" style={{ width: 12, height: 12 }} />
                    {p.client}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar" style={{ width: 12, height: 12 }} />
                    {p.submitted}
                  </span>
                </div>
                {p.letter ? <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: '2', WebkitBoxOrient: 'vertical', overflowWrap: 'anywhere' }}>{p.letter}</p> : null}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginBottom: 8 }}>{`₹${Number(p.budget || 0).toLocaleString('en-IN')}`}</div>
                {p.status === 'Accepted' && (
                  <Link to={`/worker-workroom?id=${p.taskId}`} className="btn-primary" style={{ display: 'inline-block', fontSize: 13, padding: '6px 14px', borderRadius: 10, textDecoration: 'none' }}>Open Workroom</Link>
                )}
                {p.status === 'Pending' && (
                  <button className="btn-outline" style={{ fontSize: 13, padding: '6px 14px', borderRadius: 10, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => withdrawProposal(p.id)}>Withdraw</button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

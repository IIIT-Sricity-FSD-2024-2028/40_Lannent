/**
 * LANNENT — WorkerInvitations
 * Converted from front-end/pages/worker-invitations.html.
 *
 * Invitations clients have sent the worker, at the project's posted budget.
 * Accepting one hires the worker and starts the project straight away;
 * rejecting tells the client. There is no counter-offer.
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
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';

const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['accepted', 'Accepted'], ['declined', 'Declined']];
const STATUS_BADGES = { 'Pending': 'badge-orange', 'Accepted': 'badge-green', 'Declined': 'badge-red', 'Withdrawn': 'badge-gray', 'Closed': 'badge-gray' };
const STATUS_LABELS = { pending: 'Pending', hired: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn', closed: 'Closed' };

/** The worker's invitations, shaped for display. */
function loadInvitations(Store, userId) {
  return Store.getInvitationsByWorker(userId).map(p => {
    const task = Store.getTaskById(p.taskId);
    const client = task && task.clientId ? Store.getUserById(task.clientId) : null;
    const status = (p.status || '').toLowerCase();
    return {
      id: p.id,
      projectName: task ? task.title : 'Unknown Task',
      client: client ? client.name : 'Unknown Client',
      budget: task ? task.budget : 0,
      status: STATUS_LABELS[status] || 'Closed',
      reason: p.closedReason || '',
      rawStatus: p.status,
      received: p.createdAt ? new Date(p.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
      message: p.message || '',
      taskId: p.taskId,
    };
  });
}

export default function WorkerInvitations() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Invitations — Lannent');
  const session = Auth.getCurrentUser();
  const rerender = useRerender();
  const [filter, setFilter] = useState('all');

  const invitations = loadInvitations(Store, session.userId);
  const counts = {
    all: invitations.length,
    pending: invitations.filter(p => p.status === 'Pending').length,
    accepted: invitations.filter(p => p.status === 'Accepted').length,
    declined: invitations.filter(p => p.status === 'Declined').length,
  };
  const list = filter === 'all' ? invitations : invitations.filter(p => p.status.toLowerCase() === filter);

  // After accepting / rejecting, the whole page is rebuilt with the "All" filter.
  function refreshPage() {
    setFilter('all');
    rerender();
  }

  function acceptInvite(id) {
    Validate.confirm('Accept this invitation at the posted budget? You are hired straight away and the project moves to My Projects.', () => {
      try {
        Store.acceptProposal(id);
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
      refreshPage();
      Validate.toast('Invitation accepted! Project is now active in My Projects.', 'success');
    });
  }

  function declineInvite(id) {
    Validate.confirm('Reject this invitation? The client will be notified.', () => {
      try {
        Store.declineProposal(id);
      } catch (e) {
        Validate.toast((e.message), 'error');
        return;
      }
      refreshPage();
      Validate.toast('Invitation rejected.', 'success');
    });
  }

  return (
    <DashboardLayout role="worker" activePath="/worker-invitations" pageTitle="Invitations" pageSubtitle="Review and respond to client project invitations">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 24 }}>
        <StatCard value={counts.all} label="Total" icon="mail" iconBg="#eef2ff" iconColor="#6366f1" />
        <StatCard value={counts.pending} label="Pending" icon="clock" iconBg="#fff7ed" iconColor="#f97316" />
        <StatCard value={counts.accepted} valueStyle={{ color: '#10b981' }} label="Accepted" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
        <StatCard value={counts.declined} label="Declined" icon="x-circle" iconBg="#fee2e2" iconColor="#ef4444" />
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <FilterTabs tabs={FILTERS} active={filter} onChange={setFilter} />
        </div>

        <div id="invitationsContainer">
          {!list.length ? (
            <div style={{ padding: '64px 32px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <div style={{ width: 48, height: 48, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <Icon name="mail-open" style={{ width: 22, height: 22 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No invitations found</div>
              <div style={{ fontSize: 14, marginBottom: 20 }}>You are all caught up on your project invitations.</div>
            </div>
          ) : list.map(p => (
            <div key={p.id} id={`invite-row-${p.id}`} style={{ padding: '20px 24px', borderBottom: '1px solid rgba(0,0,0,0.05)', display: 'flex', alignItems: 'flex-start', gap: 16, transition: 'background 0.15s' }}
                 {...hoverBackground('#f8f9fb')}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 600, fontSize: 15 }}>{p.projectName}</span>
                  <span className={`badge ${STATUS_BADGES[p.status] || 'badge-blue'}`}>{p.status}</span>
                </div>
                <div style={{ display: 'flex', gap: 16, marginBottom: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="user" style={{ width: 12, height: 12 }} />
                    {p.client}
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Icon name="calendar" style={{ width: 12, height: 12 }} />
                    {`Received ${p.received}`}
                  </span>
                </div>
                {p.message ? (
                  <p style={{ fontSize: 13, color: '#475569', lineHeight: 1.5, marginTop: 12, background: 'var(--input-bg)', padding: 12, borderRadius: 12, borderLeft: '3px solid #6366f1' }}>
                    <strong>Message:</strong>
                    <br />
                    {p.message}
                  </p>
                ) : null}
                {p.status === 'Closed' && p.reason ? (
                  <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 8 }}>{p.reason}</p>
                ) : null}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#10b981', marginBottom: 12 }}>{`₹${typeof p.budget === 'number' ? p.budget.toLocaleString('en-IN') : p.budget} Budget`}</div>
                {p.status === 'Pending' && (
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button className="btn-primary" style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10 }} onClick={() => acceptInvite(p.id)}>Accept</button>
                    <button className="btn-outline" style={{ fontSize: 13, padding: '8px 16px', borderRadius: 10, color: '#ef4444', borderColor: '#fecaca' }} onClick={() => declineInvite(p.id)}>Reject</button>
                  </div>
                )}
                {p.status === 'Accepted' && (
                  <Link to={`/worker-workroom?id=${p.taskId}`} className="btn-primary" style={{ display: 'inline-block', fontSize: 13, padding: '8px 16px', borderRadius: 10, textDecoration: 'none' }}>Go to Project</Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}

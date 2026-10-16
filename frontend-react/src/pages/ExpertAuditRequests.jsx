/**
 * LANNENT — ExpertAuditRequests
 * Converted from front-end/pages/expert-audit-requests.html.
 *
 * Project audits open to (or assigned to) the expert, with counts, search
 * and status filters. Each card opens the engagement preview or the report.
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertAuditRequests.css?raw';

// The API stores 'Pending' / 'In-Progress' / 'Completed'; this screen was
// written against 'Awaiting Review' / 'In Review' / 'Completed', so no row
// ever matched and the Accept button never rendered. Normalise at the boundary.
const UI_STATUS = {
  'preview-sent':     'Awaiting Review',
  'negotiating':      'Negotiating',
  'agreed':           'Agreed',
  'escrow-funded':    'Ready to start',
  'in-progress':      'In Review',
  'report-submitted': 'In Review',
  'paid':             'Completed',
  'declined':         'Declined',
  'cancelled':        'Cancelled',
};
const toUiStatus = s => UI_STATUS[s] || 'Awaiting Review';

const SEVERITY_ICON = { critical: 'bug', major: 'alert-circle', minor: 'alert-triangle', suggestion: 'info' };
const STATUS_CLASS = {
  'Awaiting Review': 'status-awaiting',
  'Negotiating':     'status-awaiting',
  'Agreed':          'status-in-review',
  'Ready to start':  'status-in-review',
  'In Review':       'status-in-review',
  'Completed':       'status-completed',
  'Declined':        'status-completed',
  'Cancelled':       'status-completed',
};
// Each filter covers a group of statuses, so every card is reachable from
// some filter and not only from All.
const FILTERS = [
  { id: 'filterAll', value: 'all', label: 'All', statuses: null },
  { id: 'filterAwaiting', value: 'awaiting', label: 'Awaiting', statuses: ['Awaiting Review', 'Negotiating', 'Agreed', 'Ready to start'] },
  { id: 'filterInReview', value: 'in-review', label: 'In Review', statuses: ['In Review'] },
  { id: 'filterCompleted', value: 'completed', label: 'Completed', statuses: ['Completed'] },
  { id: 'filterClosed', value: 'closed', label: 'Declined / Cancelled', statuses: ['Declined', 'Cancelled'] },
];

/**
 * A project audit is not finished when the reviewer files their first
 * report — it is finished when every milestone on the project has one.
 * The engagement is priced and paid once, so its lifecycle status turns
 * 'paid' early; reading that as "Completed" hid the milestones still
 * waiting. The server sends the real coverage in `auditProgress`.
 */
function auditUiStatus(a) {
  const lifecycle = toUiStatus(a.status);
  const p = a.auditProgress;
  if (!p || a.kind === 'dispute-audit') return lifecycle;
  // Terminal states are terminal regardless of coverage.
  if (['Declined', 'Cancelled'].includes(lifecycle)) return lifecycle;
  // Before the reviewer has taken the engagement on, nothing has changed.
  if (!['In Review', 'Completed'].includes(lifecycle)) return lifecycle;
  if (p.complete) return 'Completed';
  return p.awaitingReview > 0 ? 'In Review' : 'Awaiting Review';
}

/** Project audits for this reviewer, shaped for the cards. */
function getAuditRequests(Store, Auth) {
  const session = Auth.getCurrentUser();
  return Store.getAuditRequests()
    // Project audits only — a dispute engagement belongs on Dispute Cases,
    // and used to appear on both pages because kind was never filtered.
    .filter(a => a.kind !== 'dispute-audit')
    // And only what this reviewer is assigned to, or is still open to them.
    .filter(a => !a.expertId || a.expertId === session.userId)
    .map(a => {
      const task = a.taskId ? Store.getTaskById(a.taskId) : null;
      const workerId = a.workerId || task?.workerId;
      const workerName = workerId ? Store.getUserById(workerId)?.name : null;
      return {
      id: a.id,
      milestoneId: a.milestoneId,
      project: a.project || task?.title || 'Project',
      worker: workerName || (typeof a.worker === 'string' ? a.worker : '') || 'No worker hired yet',
      milestone: a.milestone || (a.milestoneId ? Store.getMilestoneById(a.milestoneId)?.title : '') || 'Every milestone on the project',
      submitted: a.createdAt,
      status: auditUiStatus(a),
      rawStatus: a.status,
      auditProgress: a.auditProgress || null,
      kind: a.kind,
      agreedAmount: a.agreedAmount,
      priority: a.severity === 'High' ? 'high' : a.severity === 'Low' ? 'low' : 'normal',
      severity: a.severity === 'High' ? 'major' : 'minor',
      severityLabel: (a.severity || 'Medium') + ' Priority',
    };
    });
}

/** One audit request card. */
function AuditCard({ a }) {
  const navigate = useNavigate();
  return (
    <div className="audit-card">
      {/* top row */}
      <div className="audit-card-top">
        <div className="audit-card-left">
          <div className="audit-card-title-row">
            <span className="audit-card-title">{a.project}</span>
            {' '}
            <span className={`prio-badge prio-${a.priority}`}>{a.priority.toUpperCase()}</span>
          </div>
          <div className="audit-card-meta">
            <span>
              <Icon name="user" style={{ width: 13, height: 13 }} />
              {a.worker}
            </span>
            <span>
              <Icon name="calendar" style={{ width: 13, height: 13 }} />
              {a.submitted}
            </span>
            {a.auditProgress && a.auditProgress.total ? (
              <span title="Milestones on this project that have an audit report">
                <Icon name="check-circle-2" style={{ width: 13, height: 13 }} />
                {`${a.auditProgress.audited} of ${a.auditProgress.total} milestones audited`}
              </span>
            ) : ''}
          </div>
        </div>
        <span className={`status-badge ${STATUS_CLASS[a.status]}`}>{a.status}</span>
      </div>

      {/* divider + milestone + severity */}
      <div className="audit-card-divider">
        <div className="audit-milestone">
          Milestone: <strong>{a.milestone}</strong>
        </div>
        <div className={`severity-chip severity-${a.severity}`}>
          <Icon name={SEVERITY_ICON[a.severity]} style={{ width: 13, height: 13, flexShrink: 0 }} />
          <span>{`${a.severity.charAt(0).toUpperCase() + a.severity.slice(1)} — ${a.severityLabel}`}</span>
        </div>
      </div>

      {/* CTA — "Review Deliverable" used to sit here, linking to the client's
          approve/request-changes screen. It was the wrong screen for a
          reviewer, it stayed visible after the report was filed, and its
          form reopened for a milestone that was already audited. Open →
          the engagement's milestone list is the way in now. */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {!['paid', 'declined', 'cancelled'].includes(a.rawStatus) ? (
          <button onClick={() => navigate(`/expert-audit-preview?id=${a.id}`)} className="btn-review" style={{ background: '#ecfdf5', color: '#166534', border: '1px solid #bbf7d0' }}>
            <Icon name="eye" style={{ width: 15, height: 15 }} />
            {a.rawStatus === 'in-progress' ? 'Open' : 'Review & quote'}
          </button>
        ) : ''}
        {a.rawStatus === 'paid' || (a.auditProgress && a.auditProgress.audited > 0) ? (
          // Every report filed on this project, finished audit or not. The
          // single-report page only ever showed one milestone: the latest
          // report once the audit was done, or the next (unaudited) milestone
          // while it was still running.
          <Link to={`/expert-reports?audit=${encodeURIComponent(a.id)}`}
                className="btn-review" style={{ background: '#f8f9fb', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <Icon name="file-text" style={{ width: 15, height: 15 }} />
            {a.rawStatus === 'paid' ? 'View Reports' : 'Reports so far'}
          </Link>
        ) : ''}
      </div>
    </div>
  );
}

export default function ExpertAuditRequests() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Audit Requests — Lannent');
  const [auditRequests] = useState(() => getAuditRequests(Store, Auth));
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const q = searchQuery.trim().toLowerCase();
  const statuses = FILTERS.find(f => f.value === activeFilter)?.statuses;
  const list = auditRequests.filter(a => {
    const ok = !q || [a.project, a.worker, a.milestone].some(v => String(v || '').toLowerCase().includes(q));
    const sf = !statuses || statuses.includes(a.status);
    return ok && sf;
  });

  const pendingCount = auditRequests.filter(a => !['Completed', 'Declined', 'Cancelled'].includes(a.status)).length;
  const inReviewCount = auditRequests.filter(a => a.status === 'In Review' || a.status === 'Ready to start').length;
  const doneCount = auditRequests.filter(a => a.status === 'Completed').length;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-audit-requests" pageTitle="Audit Requests" pageSubtitle="Review technical deliverables and ensure code quality standards.">
        {/* Stats row */}
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <StatCard value={auditRequests.length} label="Total Requests" icon="clipboard-list" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard value={pendingCount} label="Pending Review" icon="clock" iconBg="#fff7ed" iconColor="#f97316" />
          <StatCard value={inReviewCount} label="In Progress" icon="loader" iconBg="#eff6ff" iconColor="#6366f1" />
          <StatCard value={doneCount} label="Completed" icon="check-circle-2" iconBg="#ecfdf5" iconColor="#10b981" />
        </div>

        {/* Toolbar */}
        <div className="audit-toolbar">
          <div className="audit-search-wrap">
            <Icon name="search" style={{ width: 15, height: 15 }} />
            {' '}
            <input className="audit-search" type="text" id="auditSearch" placeholder="Search by project or worker..."
                   value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          {FILTERS.map(f => (
            <button key={f.id} className={'filter-btn' + (activeFilter === f.value ? ' active' : '')} id={f.id} onClick={() => setActiveFilter(f.value)}>{f.label}</button>
          ))}
        </div>

        {/* Card grid */}
        <div className="audit-grid" id="auditGrid">
          {!list.length ? (
            <div className="audit-empty">
              <Icon name="clipboard-check" style={{ width: 48, height: 48, opacity: 0.35 }} />
              <p>No audit requests found matching your filters.</p>
            </div>
          ) : list.map(a => <AuditCard key={a.id} a={a} />)}
        </div>
      </DashboardLayout>
    </>
  );
}

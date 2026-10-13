/**
 * LANNENT — ExpertDisputeCases
 * Converted from front-end/pages/expert-dispute-cases.html.
 *
 * Disputes the expert can take (unassigned) or is arbitrating, with counts,
 * a search box and status filters. Each card links to the next step:
 * review & quote, resolve, or view the resolution.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertDisputeCases.css?raw';

const SEVERITY_ICON_CLASS = { high: 'severity-icon-high', medium: 'severity-icon-medium', low: 'severity-icon-low' };
const FILTERS = [['all', 'All'], ['Open', 'Open'], ['Under Investigation', 'Investigating'], ['Resolved', 'Resolved']];

/** Disputes visible to this expert, shaped for the cards. */
function loadDisputes(Store, Auth) {
  const session = Auth.getCurrentUser();
  return Store.getDisputes()
    .filter(d => !d.expertId || d.expertId === session.userId)
    .map(d => {
      const task = Store.getTaskById(d.taskId);
      const raiser = Store.getUserById(d.raisedBy);
      return {
        id: d.id,
        project: d.project || (task ? task.title : 'Unknown Project'),
        milestone: d.milestone || 'Milestone',
        issue: d.reason ? d.reason.substring(0, 80) + (d.reason.length > 80 ? '...' : '') : 'Dispute raised',
        raisedBy: (raiser ? raiser.name : d.raisedByName || 'Unknown') + ' (' + (raiser ? raiser.role : 'user') + ')',
        status: d.status === 'open' ? 'Open' : d.status === 'resolved' ? 'Resolved' : 'Under Investigation',
        rawStatus: d.status,
        severity: d.severity || 'medium',
        date: d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently',
        amount: d.amount || '',
      };
    });
}

/**
 * The action at the bottom of a card. A dispute is arbitrated through a
 * priced engagement: preview the claim, agree a fee, and only then resolve it.
 */
function CardAction({ d }) {
  const Store = useStore();
  if (d.rawStatus === 'resolved') {
    return (
      <Link to={`/expert-report-dispute?id=${d.id}`} className="btn-resolve">
        <Icon name="file-text" style={{ width: 15, height: 15 }} />
        View Resolution
      </Link>
    );
  }
  const eng = (Store.getAuditRequests() || []).find(a => a.disputeId === d.id);
  if (!eng || eng.status === 'in-progress') {
    return (
      <Link to={`/resolve-dispute?id=${d.id}`} className="btn-resolve">
        <Icon name="shield" style={{ width: 15, height: 15 }} />
        Resolve Dispute
      </Link>
    );
  }
  return (
    <Link to={`/expert-audit-preview?id=${eng.id}`} className="btn-resolve">
      <Icon name="eye" style={{ width: 15, height: 15 }} />
      Review &amp; quote
    </Link>
  );
}

/** One dispute card. */
function DisputeCard({ d }) {
  return (
    <div className="dispute-card" id={`dcard-${d.id}`}>
      <div className="dispute-card-top">
        <div className="dispute-card-left">
          <div className="dispute-title-row">
            <span className="dispute-title">{d.project}</span>
            <Icon name="alert-triangle" style={{ width: 16, height: 16, flexShrink: 0 }} className={SEVERITY_ICON_CLASS[d.severity] || 'severity-icon-medium'} />
          </div>
          <div className="dispute-meta">{`Milestone: ${d.milestone}`}</div>
          <div className="dispute-issue">{d.issue}</div>
          <div className="dispute-footer-row">
            <span>{`Raised by: ${d.raisedBy}`}</span>
            <span className="dot"></span>
            <span>{d.date}</span>
            {d.amount ? (
              <>
                <span className="dot"></span>
                <span style={{ fontWeight: 600, color: '#6366f1' }}>{`${d.amount} escrow`}</span>
              </>
            ) : ''}
          </div>
        </div>
        <span className={`status-badge ${d.rawStatus === 'resolved' ? 'status-resolved' : d.rawStatus === 'open' ? 'status-open' : 'status-investigating'}`}>{d.status}</span>
      </div>
      <CardAction d={d} />
    </div>
  );
}

export default function ExpertDisputeCases() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Dispute Cases — Lannent');
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const all = loadDisputes(Store, Auth);
  const q = searchQuery.toLowerCase();
  const list = all.filter(d => {
    const ok = !q || d.project.toLowerCase().includes(q) || d.issue.toLowerCase().includes(q);
    const sf = activeFilter === 'all' || d.status === activeFilter;
    return ok && sf;
  });

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-dispute-cases" pageTitle="Dispute Cases" pageSubtitle="Mediate conflicts between clients and workers with fair resolutions.">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
          <StatCard valueId="statTotal" value={all.length} label="Total Cases" icon="scale" iconBg="#eef2ff" iconColor="#6366f1" />
          <StatCard valueId="statOpen" value={all.filter(d => d.rawStatus === 'open').length} label="Open" icon="alert-circle" iconBg="#fee2e2" iconColor="#ef4444" />
          <StatCard valueId="statInvest" value={all.filter(d => d.status === 'Under Investigation').length} label="Investigating" icon="search" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard valueId="statResolved" value={all.filter(d => d.rawStatus === 'resolved').length} valueStyle={{ color: '#10b981' }} label="Resolved" icon="check-circle-2" iconBg="#ecfdf5" iconColor="#10b981" />
        </div>

        <div className="dispute-toolbar">
          <div className="dispute-search-wrap">
            <Icon name="search" style={{ width: 15, height: 15 }} />
            {' '}
            <input className="dispute-search" type="text" id="disputeSearch" placeholder="Search by project or issue..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          {FILTERS.map(([value, label]) => (
            <button key={value} className={'filter-btn' + (activeFilter === value ? ' active' : '')} onClick={() => setActiveFilter(value)}>{label}</button>
          ))}
        </div>

        <div className="dispute-grid" id="disputeGrid">
          {!list.length ? (
            <div className="dispute-empty">
              <Icon name="scale" style={{ width: 48, height: 48, opacity: 0.35 }} />
              <p>No dispute cases found matching your filters.</p>
            </div>
          ) : list.map(d => <DisputeCard key={d.id} d={d} />)}
        </div>
      </DashboardLayout>
    </>
  );
}

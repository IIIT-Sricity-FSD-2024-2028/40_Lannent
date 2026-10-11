/**
 * LANNENT — ExpertApplicationsReview
 * The Expert Reviewer application queue shared by
 * front-end/pages/superuser-expert-applications.html and
 * front-end/pages/admin-expert-applications.html. The two pages were the
 * same except for who may open them and the "Documents" section the admin
 * desk shows, so `showDocuments` switches that on.
 *
 * Lists applications with counts, search and status filters; each one can be
 * opened in a details dialog and approved or rejected (after confirmation).
 */
import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import Icon from './Icon';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { escapeHtml } from '../utils/helpers';
import useRerender from '../hooks/useRerender';

const AVATAR_COLORS = [
  'linear-gradient(135deg,#6366f1,#4f46e5)',
  'linear-gradient(135deg,#a855f7,#7c3aed)',
  'linear-gradient(135deg,#ec4899,#be185d)',
  'linear-gradient(135deg,#10b981,#059669)',
  'linear-gradient(135deg,#f59e0b,#d97706)',
];
const FILTERS = [['all', 'All'], ['pending', 'Pending'], ['approved', 'Approved'], ['rejected', 'Rejected']];

const getInitials = name => name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);

/** All applications, newest first. */
function getApps(Store) {
  return Store.getExpertApplications().sort((a, b) => (b.appliedAt || '').localeCompare(a.appliedAt || ''));
}

function StatusBadge({ status }) {
  const cls = status === 'pending' ? 'sb-pending' : status === 'approved' ? 'sb-approved' : 'sb-rejected';
  const dot = status === 'pending' ? 'sd-pending' : status === 'approved' ? 'sd-approved' : 'sd-rejected';
  return (
    <span className={`status-badge ${cls}`}>
      <span className={`status-dot ${dot}`}></span>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

/** One stat tile whose value has an id (as on the original page). */
function AppStat({ id, value, valueColor, label, icon, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div>
        <div className="stat-val" id={id} style={valueColor ? { color: valueColor } : undefined}>{value}</div>
        <div className="stat-label">{label}</div>
      </div>
      <div className="stat-icon-wrap" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 20, height: 20, color: iconColor }} />
      </div>
    </div>
  );
}

/** A small icon + value in an application card's meta row. */
function MetaItem({ icon, prefix, value }) {
  return (
    <span className="app-meta-item">
      <Icon name={icon} style={{ width: 12, height: 12 }} />
      {prefix ? ' ' + prefix + ' ' : ' '}<strong>{value}</strong>
    </span>
  );
}

/**
 * One document on an application. A reference means the file is in the
 * store and the reviewer can open it; a bare name is an application filed
 * before the store existed, when only the name was kept.
 */
function DocRow({ label, fileRef, name }) {
  const Store = useStore();
  const shown = (fileRef && fileRef.name) || name;
  if (!shown) return null;
  const href = fileRef ? Store.fileUrl(fileRef) : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <span style={{ color: 'var(--muted-foreground)', minWidth: 78 }}>{label}</span>
      <strong style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{shown}</strong>
      {href
        ? <a href={href} download={shown} style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', whiteSpace: 'nowrap' }}>Download</a>
        : <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }} title="Filed before the platform stored documents.">Not stored</span>}
    </div>
  );
}

/** A label + value cell of the details dialog. */
function DetailField({ label, children, style, valueStyle }) {
  return (
    <div className="detail-field" style={style}>
      <div className="detail-label">{label}</div>
      <div className="detail-value" style={valueStyle}>{children}</div>
    </div>
  );
}

/** Contents of the "Application Details" dialog. */
function ApplicationDetails({ app, showDocuments, onClose, onAction }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ fontSize: 18, fontWeight: 600 }}>Application Details</h3>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted-foreground)', padding: 4 }}>
          <Icon name="x" style={{ width: 20, height: 20 }} />
        </button>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20, paddingBottom: 16, borderBottom: '1px solid var(--border)' }}>
        <div className="app-avatar" style={{ background: AVATAR_COLORS[0], width: 52, height: 52, fontSize: 16 }}>{getInitials(app.name)}</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>{app.name}</div>
          <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{app.email}</div>
        </div>
        <div style={{ marginLeft: 'auto' }}><StatusBadge status={app.status} /></div>
      </div>
      <div className="detail-grid">
        <DetailField label="Phone">{`${app.phoneCountry || ''} ${app.phone || 'N/A'}`}</DetailField>
        <DetailField label="Country">{app.country || 'N/A'}</DetailField>
        <DetailField label="Primary Expertise">{app.expertise || 'N/A'}</DetailField>
        <DetailField label="Experience">{`${app.experience || 'N/A'} years`}</DetailField>
        <DetailField label="LinkedIn">{app.linkedin ? <a href={app.linkedin} target="_blank">{app.linkedin}</a> : 'N/A'}</DetailField>
        <DetailField label="GitHub">{app.github ? <a href={app.github} target="_blank">{app.github}</a> : 'N/A'}</DetailField>
      </div>
      {showDocuments && (
        <DetailField label="Documents" style={{ marginTop: 6 }} valueStyle={{ fontWeight: 400, fontSize: 13 }}>
          {(app.resumeName || app.resumeFile || app.certificateFile)
            ? <><DocRow label="Résumé" fileRef={app.resumeFile} name={app.resumeName} /><DocRow label="Certificate" fileRef={app.certificateFile} name={app.certificateName} /></>
            : 'No documents recorded with this application.'}
        </DetailField>
      )}
      <DetailField label="Motivation" style={{ marginTop: 6 }} valueStyle={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted-foreground)', fontWeight: 400 }}>
        {app.motivation || 'No motivation provided.'}
      </DetailField>
      <div className="detail-grid" style={{ marginTop: 10, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
        <DetailField label="Applied On">{app.appliedAt || 'N/A'}</DetailField>
        <DetailField label="Reviewed On">{app.reviewedAt || 'Not yet reviewed'}</DetailField>
      </div>
      {app.status === 'pending' ? (
        <div style={{ display: 'flex', gap: 10, marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
          <button className="btn-approve" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }} onClick={() => { onClose(); onAction(app.id, 'approved'); }}>
            <Icon name="check" style={{ width: 14, height: 14 }} /> Approve Application
          </button>
          <button className="btn-reject" style={{ flex: 1, justifyContent: 'center', height: 40, fontSize: 14 }} onClick={() => { onClose(); onAction(app.id, 'rejected'); }}>
            <Icon name="x" style={{ width: 14, height: 14 }} /> Reject Application
          </button>
        </div>
      ) : ''}
    </>
  );
}

/**
 * @param {string}  role          - sidebar role
 * @param {string}  activePath    - highlighted sidebar item
 * @param {boolean} showDocuments - show the résumé / certificate rows (admin desk)
 */
export default function ExpertApplicationsReview({ role, activePath, showDocuments }) {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  const session = Auth.getCurrentUser();
  const rerender = useRerender();
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingAction, setPendingAction] = useState(null);   // { appId, status } while confirming
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [detailApp, setDetailApp] = useState(null);           // last application opened in the details dialog
  const [detailOpen, setDetailOpen] = useState(false);

  const all = getApps(Store);
  const q = searchQuery.toLowerCase();
  const list = all.filter(a => {
    const matchesSearch = !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || (a.expertise || '').toLowerCase().includes(q);
    const matchesFilter = activeFilter === 'all' || a.status === activeFilter;
    return matchesSearch && matchesFilter;
  });

  // ── Confirm / Execute ──
  function confirmAction(appId, status) {
    setPendingAction({ appId, status, name: Store.getExpertApplicationById(appId)?.name });
    setConfirmOpen(true);
  }

  function closeConfirm() {
    setConfirmOpen(false);
  }

  function executeAction() {
    if (!pendingAction) return;
    const { appId, status } = pendingAction;
    Store.updateExpertApplicationStatus(appId, status, session?.userId || 'u4');
    closeConfirm();
    rerender();
    const app = Store.getExpertApplicationById(appId);
    const msg = status === 'approved'
      ? `✓ ${escapeHtml(app?.name)}'s application approved. Expert account created.`
      : `✗ ${escapeHtml(app?.name)}'s application rejected.`;
    Validate.toast(msg, status === 'approved' ? 'success' : 'error');
  }

  function showDetails(appId) {
    const app = Store.getExpertApplicationById(appId);
    if (!app) return;
    setDetailApp(app);
    setDetailOpen(true);
  }

  const isApprove = pendingAction && pendingAction.status === 'approved';

  return (
    <DashboardLayout role={role} activePath={activePath} pageTitle="Expert Applications" pageSubtitle="Review and manage expert reviewer applications.">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)', marginBottom: 24 }}>
        <AppStat id="statTotal" value={all.length} label="Total Applications" icon="file-text" iconBg="#eef2ff" iconColor="#6366f1" />
        <AppStat id="statPending" value={all.filter(a => a.status === 'pending').length} valueColor="#f59e0b" label="Pending Review" icon="clock" iconBg="#fffbeb" iconColor="#f59e0b" />
        <AppStat id="statApproved" value={all.filter(a => a.status === 'approved').length} valueColor="#10b981" label="Approved" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
        <AppStat id="statRejected" value={all.filter(a => a.status === 'rejected').length} valueColor="#ef4444" label="Rejected" icon="x-circle" iconBg="#fef2f2" iconColor="#ef4444" />
      </div>

      {/* Toolbar */}
      <div className="app-toolbar">
        <div className="app-search-wrap">
          <Icon name="search" style={{ width: 15, height: 15 }} />
          {' '}
          <input className="app-search" type="text" id="appSearch" placeholder="Search by name, email or expertise..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
        </div>
        {FILTERS.map(([value, label]) => (
          <button key={value} className={'filter-pill' + (activeFilter === value ? ' active' : '')} data-filter={value} onClick={() => setActiveFilter(value)}>
            {/* The "All" pill shows how many applications the current search/filter matches. */}
            {value === 'all' ? <>{'All '}<span id="filteredCount" style={{ marginLeft: 4, opacity: 0.7 }}>{list.length}</span></> : label}
          </button>
        ))}
      </div>

      {/* Applications List */}
      <div id="appsList">
        {!list.length ? (
          <div className="empty-state">
            <Icon name="shield-check" style={{ width: 48, height: 48, opacity: 0.35 }} />
            <p>No expert applications found matching your filters.</p>
          </div>
        ) : list.map((a, i) => (
          <div key={a.id} className="app-card" id={`acard-${a.id}`}>
            <div className="app-avatar" style={{ background: AVATAR_COLORS[i % AVATAR_COLORS.length] }}>{getInitials(a.name)}</div>
            <div className="app-info">
              <div className="app-name">{a.name}</div>
              <div className="app-email">{a.email}</div>
              <div className="app-meta">
                <MetaItem icon="briefcase" value={a.expertise || 'N/A'} />
                <MetaItem icon="clock" value={`${a.experience || 'N/A'} years`} />
                <MetaItem icon="globe" value={a.country || 'N/A'} />
                <MetaItem icon="calendar" prefix="Applied:" value={a.appliedAt || 'N/A'} />
              </div>
            </div>
            <div className="app-right">
              <StatusBadge status={a.status} />
              <div className="app-actions">
                <button className="btn-details" onClick={() => showDetails(a.id)}>
                  <Icon name="eye" style={{ width: 12, height: 12 }} /> Details
                </button>
                {a.status === 'pending' ? (
                  <>
                    <button className="btn-approve" onClick={() => confirmAction(a.id, 'approved')}>
                      <Icon name="check" style={{ width: 12, height: 12 }} /> Approve
                    </button>
                    <button className="btn-reject" onClick={() => confirmAction(a.id, 'rejected')}>
                      <Icon name="x" style={{ width: 12, height: 12 }} /> Reject
                    </button>
                  </>
                ) : a.reviewedAt ? <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>{`Reviewed ${a.reviewedAt}`}</span> : ''}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Confirmation Modal */}
      <div className={'confirm-overlay' + (confirmOpen ? ' show' : '')} id="confirmModal" onClick={e => { if (e.target === e.currentTarget) closeConfirm(); }}>
        <div className="confirm-card">
          <div className="confirm-title" id="confirmTitle">{pendingAction ? (isApprove ? 'Approve Application' : 'Reject Application') : 'Confirm Action'}</div>
          <div className="confirm-text" id="confirmText">
            {!pendingAction ? 'Are you sure?' : isApprove
              ? <>Are you sure you want to <strong>approve</strong> <strong>{pendingAction.name}</strong>'s application? This will create an expert account and allow them to log in.</>
              : <>Are you sure you want to <strong>reject</strong> <strong>{pendingAction.name}</strong>'s application? They will not be able to log in as an expert reviewer.</>}
          </div>
          <div className="confirm-actions">
            <button className="confirm-btn confirm-btn-cancel" onClick={closeConfirm}>Cancel</button>
            <button className={'confirm-btn' + (pendingAction ? (isApprove ? ' confirm-btn-approve' : ' confirm-btn-reject') : '')} id="confirmBtn" onClick={executeAction}>
              {pendingAction ? (isApprove ? 'Approve' : 'Reject') : 'Confirm'}
            </button>
          </div>
        </div>
      </div>

      {/* Detail Modal */}
      <div className={'detail-overlay' + (detailOpen ? ' show' : '')} id="detailModal" onClick={e => { if (e.target === e.currentTarget) setDetailOpen(false); }}>
        <div className="detail-card" id="detailContent">
          {detailApp && <ApplicationDetails app={detailApp} showDocuments={showDocuments} onClose={() => setDetailOpen(false)} onAction={confirmAction} />}
        </div>
      </div>
    </DashboardLayout>
  );
}

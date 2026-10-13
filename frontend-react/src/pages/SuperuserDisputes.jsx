/**
 * LANNENT — SuperuserDisputes (All Disputes)
 * Converted from front-end/pages/superuser-disputes.html.
 *
 * Every dispute on the platform with quick verdict buttons and a custom
 * override dialog. Super users are no longer permitted here and are sent back
 * to their dashboard (signed-out visitors go to login), exactly as before.
 */
import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import FieldError from '../components/FieldError';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { escapeHtml } from '../utils/helpers';
import useFieldErrors from '../hooks/useFieldErrors';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserDisputes.css?raw';

const VERDICT_LABELS = { 'worker-favour': 'Worker receives full payment', 'client-favour': 'Client receives full refund', 'split': 'Funds split equally between both parties' };

/** Applies a verdict and notifies both parties. */
function resolveAndNotify(Store, Auth, disputeId, verdict, resolution) {
  const d = Store.getDisputeById(disputeId);
  Store.resolveDispute(disputeId, { verdict, resolution, expertId: Auth.getCurrentUser()?.userId || 'u4' });
  // Notify both parties
  const vLabel = verdict === 'worker-favour' ? 'in favour of the Worker' : verdict === 'client-favour' ? 'in favour of the Client' : 'with a 50/50 split';
  if (d && d.raisedBy) {
    Store.addNotification({ userId: d.raisedBy, type: 'dispute-resolved', text: `Dispute resolved: ${escapeHtml(d.project)}`, subtext: `Verdict ${vLabel}` });
  }
  if (d && d.againstId) {
    Store.addNotification({ userId: d.againstId, type: 'dispute-resolved', text: `Dispute resolved: ${escapeHtml(d.project)}`, subtext: `Verdict ${vLabel}` });
  }
}

export default function SuperuserDisputes() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('All Disputes — Lannent');
  const session = Auth.getCurrentUser();
  const rerender = useRerender();

  // Stats are counted once when the page opens (as in the original).
  const [stats] = useState(() => {
    const all = Store.getDisputes();
    return { total: all.length, open: all.filter(d => d.status === 'open').length, resolved: all.filter(d => d.status === 'resolved').length };
  });
  const [statusFilter, setStatusFilter] = useState('all');

  // Override dialog
  const [activeDisputeId, setActiveDisputeId] = useState(null);
  const [overrideTitle, setOverrideTitle] = useState('Override Dispute');
  const [overrideVerdict, setOverrideVerdict] = useState('');
  const [overrideResolution, setOverrideResolution] = useState('');
  const { errors, clearError, clearAllErrors, validateForm, errorStyle } = useFieldErrors();

  // Superuser is no longer permitted to access the disputes page — redirect to dashboard.
  if (!session) return <Navigate to="/login" />;
  if (session.role === 'superuser') return <Navigate to="/superuser-dashboard" />;

  const disputes = Store.getDisputes().filter(d => statusFilter === 'all' || d.status === statusFilter);

  function quickResolve(disputeId, verdict) {
    Validate.confirm(
      `Apply verdict: "${verdict.replace(/-/g, ' ')}"? ${VERDICT_LABELS[verdict]}.`,
      () => {
        resolveAndNotify(Store, Auth, disputeId, verdict, VERDICT_LABELS[verdict]);
        Validate.toast('Dispute resolved successfully.', 'success');
        rerender();
      }
    );
  }

  function openOverrideModal(disputeId) {
    const d = Store.getDisputeById(disputeId);
    setActiveDisputeId(disputeId);
    setOverrideTitle('Override: ' + d.project);
    setOverrideVerdict('');
    setOverrideResolution('');
  }

  function closeOverrideModal() {
    setActiveDisputeId(null);
    clearAllErrors();
  }

  function submitOverride() {
    const resolution = overrideResolution.trim();
    const { valid } = validateForm([
      { fieldId: 'overrideVerdict', value: overrideVerdict, checks: [v => Validate.selected(v, 'verdict')] },
      { fieldId: 'overrideResolution', value: resolution, checks: [v => Validate.required(v, 'Resolution'), v => Validate.minLength(v, 20, 'Resolution')] },
    ]);
    if (!valid) return;

    resolveAndNotify(Store, Auth, activeDisputeId, overrideVerdict, resolution);
    closeOverrideModal();
    Validate.toast('Dispute override applied.', 'success');
    rerender();
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-disputes" pageTitle="All Disputes" pageSubtitle="Review and override dispute verdicts across the platform">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(3,1fr)', marginBottom: 24 }}>
          <StatCard value={stats.total} label="Total Disputes" icon="scale" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard value={stats.open} label="Open Disputes" icon="alert-circle" iconBg="#fff7ed" iconColor="#f97316" />
          <StatCard value={stats.resolved} label="Resolved" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
        </div>

        <div className="su-toolbar">
          <select className="su-filter" id="statusFilterD" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Disputes</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved Only</option>
          </select>
        </div>

        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted-foreground)' }}>
          Showing <strong id="disputeCount">{disputes.length + ' dispute' + (disputes.length !== 1 ? 's' : '')}</strong>
        </div>

        <div id="disputesList">
          {!disputes.length ? (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted-foreground)' }}>No disputes found.</div>
          ) : disputes.map(d => (
            <div key={d.id} className={`dispute-card ${d.status === 'resolved' ? 'resolved' : ''}`} id={`dispute_${d.id}`}>
              <div className="dispute-header">
                <div>
                  <div className="dispute-project">{d.project}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 2 }}>{`Raised ${d.createdAt}`}</div>
                </div>
                <span className={`badge ${d.status === 'open' ? 'badge-orange' : 'badge-green'}`}>{d.status}</span>
              </div>
              <div className="dispute-meta">
                <span><strong>Raised by:</strong>{' ' + d.raisedByName}</span>
                <span><strong>Against:</strong>{' ' + d.againstName}</span>
                <span><strong>Amount:</strong>{' ' + d.amount}</span>
                {d.milestone ? <span><strong>Milestone:</strong>{' ' + d.milestone}</span> : ''}
              </div>
              <div className="dispute-reason">{d.reason}</div>
              {d.status === 'resolved' ? (
                <div className="resolution-box">
                  <strong>{`Resolution (${d.verdict?.replace(/-/g, ' ')}):`}</strong>{' ' + d.resolution}
                  {d.resolvedAt ? <><br /><span style={{ opacity: 0.7 }}>{`Resolved on ${d.resolvedAt}`}</span></> : ''}
                </div>
              ) : (
                <div className="dispute-actions">
                  <button className="btn-worker" onClick={() => quickResolve(d.id, 'worker-favour')}>✓ Favour Worker</button>
                  <button className="btn-client" onClick={() => quickResolve(d.id, 'client-favour')}>✓ Favour Client</button>
                  <button className="btn-split" onClick={() => quickResolve(d.id, 'split')}>⟺ Split 50/50</button>
                  <button className="btn-edit" onClick={() => openOverrideModal(d.id)} style={{ padding: '8px 16px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--background)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Custom Override</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Override Modal */}
        <div className={'modal-overlay' + (activeDisputeId ? ' open' : '')} id="overrideModal"
             onClick={e => { if (e.target.id === 'overrideModal') closeOverrideModal(); }}>
          <div className="modal">
            <p style={{ fontSize: 18, fontWeight: 600, marginBottom: 6 }} id="overrideDisputeTitle">{overrideTitle}</p>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>As Super User, your override is binding and final.</p>
            <div className="form-group">
              <label className="form-label">
                Verdict <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {' '}
              <select className="form-select" id="overrideVerdict" value={overrideVerdict} style={errorStyle('overrideVerdict')}
                      onChange={e => { setOverrideVerdict(e.target.value); clearError('overrideVerdict'); }}>
                <option value="">Select verdict</option>
                <option value="worker-favour">Favour Worker — release payment</option>
                <option value="client-favour">Favour Client — refund escrow</option>
                <option value="split">Split 50/50 — divide equally</option>
              </select>
              <FieldError id="overrideVerdict" message={errors.overrideVerdict} />
            </div>
            <div className="form-group">
              <label className="form-label">
                Resolution Notes <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {' '}
              <textarea className="form-textarea" id="overrideResolution" rows="4" placeholder="Explain the reasoning for this verdict..."
                        value={overrideResolution} style={errorStyle('overrideResolution')}
                        onChange={e => { setOverrideResolution(e.target.value); clearError('overrideResolution'); }} />
              <FieldError id="overrideResolution" message={errors.overrideResolution} />
            </div>
            <div className="modal-actions">
              <button className="btn-cancel-modal" onClick={closeOverrideModal}>Cancel</button>
              <button className="btn-save-modal" onClick={submitOverride}>Apply Override</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

/**
 * LANNENT — SuperuserDisputes (All Disputes)
 * Converted from front-end/pages/superuser-disputes.html.
 *
 * Every dispute on the platform with quick verdict buttons and a custom
 * override dialog. Super users are no longer permitted here and are sent back
 * to their dashboard (signed-out visitors go to login), exactly as before.
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import FieldError from '../components/FieldError';
import PageStyle from '../components/PageStyle';
import StatCard from '../components/StatCard';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useFieldErrors from '../hooks/useFieldErrors';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserDisputes.css?raw';

const VERDICT_LABELS = {
  'worker-favour': 'The worker receives the milestone payment',
  'client-favour': 'The milestone goes back to the worker to rework; its escrow stays held',
};

/** Applies a verdict as an operations override. The server notifies both parties. */
function resolveAsOperations(Store, Validate, disputeId, verdict, resolution) {
  try {
    Store.resolveDispute(disputeId, { verdict, resolution });
    return true;
  } catch (e) {
    Validate.toast(e.message, 'error');
    return false;
  }
}

export default function SuperuserDisputes() {
  const Store = useStore();
  const Validate = useValidation();
  usePageTitle('All Disputes — Lannent');
  const rerender = useRerender();

  const allDisputes = Store.getDisputes();
  const stats = {
    total: allDisputes.length,
    open: allDisputes.filter(d => d.status === 'open').length,
    resolved: allDisputes.filter(d => d.status === 'resolved').length,
    // Withdrawn by the client, or expired with no verdict — the reviewer fee went back.
    noVerdict: allDisputes.filter(d => ['withdrawn', 'expired'].includes(d.status)).length,
  };
  const [statusFilter, setStatusFilter] = useState('all');

  // Override dialog
  const [activeDisputeId, setActiveDisputeId] = useState(null);
  const [overrideTitle, setOverrideTitle] = useState('Override Dispute');
  const [overrideVerdict, setOverrideVerdict] = useState('');
  const [overrideResolution, setOverrideResolution] = useState('');
  const { errors, clearError, clearAllErrors, validateForm, errorStyle } = useFieldErrors();


  const disputes = Store.getDisputes().filter(d => statusFilter === 'all' || d.status === statusFilter
    || (statusFilter === 'no-verdict' && ['withdrawn', 'expired'].includes(d.status)));

  function quickResolve(disputeId, verdict) {
    Validate.confirm(
      `Override with "${verdict.replace(/-/g, ' ')}"? ${VERDICT_LABELS[verdict]}. Any reviewer fee held for this dispute goes back to whoever paid it.`,
      () => {
        if (!resolveAsOperations(Store, Validate, disputeId, verdict, `Operations override: ${VERDICT_LABELS[verdict]}.`)) return;
        Validate.toast('Dispute settled.', 'success');
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

    if (!resolveAsOperations(Store, Validate, activeDisputeId, overrideVerdict, resolution)) return;
    closeOverrideModal();
    Validate.toast('Dispute override applied.', 'success');
    rerender();
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-disputes" pageTitle="All Disputes" pageSubtitle="Review and override dispute verdicts across the platform">
        <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', marginBottom: 24 }}>
          <StatCard value={stats.total} label="Total Disputes" icon="scale" iconBg="#faf5ff" iconColor="#a855f7" />
          <StatCard value={stats.open} label="Open Disputes" icon="alert-circle" iconBg="#fff7ed" iconColor="#f97316" />
          <StatCard value={stats.resolved} label="Resolved" icon="check-circle" iconBg="#ecfdf5" iconColor="#10b981" />
          <StatCard value={stats.noVerdict} label="Withdrawn or Expired" icon="x-circle" iconBg="#f1f5f9" iconColor="#64748b" />
        </div>

        <div className="su-toolbar">
          <select className="su-filter" id="statusFilterD" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
            <option value="all">All Disputes</option>
            <option value="open">Open Only</option>
            <option value="resolved">Resolved Only</option>
            <option value="no-verdict">Withdrawn or Expired</option>
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
                <span className={`badge ${d.status === 'open' ? 'badge-orange' : d.status === 'resolved' ? 'badge-green' : 'badge-blue'}`}>{d.status}</span>
              </div>
              <div className="dispute-meta">
                <span><strong>Raised by:</strong>{' ' + d.raisedByName}</span>
                <span><strong>Against:</strong>{' ' + d.againstName}</span>
                <span><strong>Amount:</strong>{' ' + d.amount}</span>
                <span><strong>Reviewer:</strong>{' ' + (d.expertId ? (Store.getUserById(d.expertId)?.name || d.expertId) : 'none assigned')}</span>
                {d.milestone ? <span><strong>Milestone:</strong>{' ' + d.milestone}</span> : ''}
              </div>
              <div className="dispute-reason">{[d.reason, d.details].filter(Boolean).join(' — ')}</div>
              {d.status === 'resolved' ? (
                <div className="resolution-box">
                  <strong>{`Resolution (${d.verdict?.replace(/-/g, ' ')}${d.overriddenBy ? ', operations override' : ''}):`}</strong>{' ' + d.resolution}
                  {d.resolvedAt ? <><br /><span style={{ opacity: 0.7 }}>{`Resolved on ${d.resolvedAt}`}</span></> : ''}
                </div>
              ) : d.status !== 'open' ? (
                <div className="resolution-box">
                  <strong>{d.status === 'withdrawn' ? 'Withdrawn by the client' : 'Expired without a verdict'}</strong>
                  {d.endedReason ? <> — {d.endedReason}</> : ''}
                  {d.resolvedAt ? <><br /><span style={{ opacity: 0.7 }}>{`Closed on ${d.resolvedAt}`}</span></> : ''}
                </div>
              ) : (
                <div className="dispute-actions">
                  <button className="btn-worker" onClick={() => quickResolve(d.id, 'worker-favour')}>✓ Favour Worker</button>
                  <button className="btn-client" onClick={() => quickResolve(d.id, 'client-favour')}>✓ Favour Client</button>
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
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>An operations override is binding and final. Any reviewer fee held for the case is returned to whoever paid it.</p>
            <div className="form-group">
              <label className="form-label">
                Verdict <span style={{ color: '#ef4444' }}>*</span>
              </label>
              {' '}
              <select className="form-select" id="overrideVerdict" value={overrideVerdict} style={errorStyle('overrideVerdict')}
                      onChange={e => { setOverrideVerdict(e.target.value); clearError('overrideVerdict'); }}>
                <option value="">Select verdict</option>
                <option value="worker-favour">Favour Worker — release payment</option>
                <option value="client-favour">Favour Client — send the milestone back to the worker</option>
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

/**
 * LANNENT — Dispute (Raise Dispute)
 * Converted from front-end/pages/dispute.html.
 *
 * Raises a dispute on the milestone saved in localStorage as
 * "disputeTargetMilestone" by the workroom / milestone board. The user picks
 * a reason, describes the problem and the outcome they want, and chooses an
 * Expert Reviewer to arbitrate.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ExpertPicker from '../components/ExpertPicker';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './Dispute.css?raw';

/** Small coloured toast in the bottom-right corner (this page's own variant). */
function showToast(msg, type = 'success') {
  const t = document.createElement('div');
  const bg = type === 'success' ? '#10b981' : type === 'warn' ? '#f59e0b' : '#ef4444';
  t.style.cssText = `position:fixed;bottom:24px;right:24px;background:${bg};color:white;padding:14px 20px;border-radius:12px;font-size:14px;font-weight:500;z-index:300;box-shadow:0 8px 24px rgba(0,0,0,0.2);`;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/** The milestone the previous page left in localStorage (older links). */
function readSavedTarget() {
  try {
    return JSON.parse(localStorage.getItem('disputeTargetMilestone') || 'null');
  } catch (e) {
    console.warn('Could not get disputeTargetMilestone from localStorage', e);
    return null;
  }
}

/**
 * The milestone being disputed, loaded from the real record.
 *
 * The page used to work from whatever object the previous page saved. The
 * workroom saved its display copy, which has no `taskId` — so the project
 * was never found, the reviewer list could not be narrowed to the project's
 * category and listed everyone, and the title and amount came from that
 * copy rather than the milestone. The id now travels in the URL
 * (/dispute?milestoneId=…), and everything else is read from the store.
 */
function loadTarget(Store, milestoneId) {
  const id = milestoneId || readSavedTarget()?.id;
  const ms = id ? Store.getMilestoneById(id) : null;
  if (!ms) return null;
  const task = Store.getTaskById(ms.taskId);
  return {
    id: ms.id,
    taskId: ms.taskId,
    task,
    title: ms.title || 'Untitled milestone',
    amount: '₹' + (ms.budget || 0).toLocaleString('en-IN'),
    status: ms.status,
  };
}

// Read-only "Milestone" / "Amount" boxes
const READONLY_FIELD_STYLE = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--secondary)', fontWeight: 600 };

export default function Dispute() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Raise Dispute — Lannent');
  const navigate = useNavigate();
  const session = Auth.getCurrentUser();
  // Only clients raise disputes (the route is client-only too).
  const userRole = session?.role || 'client';
  const workroomURL = '/project-workroom';

  const [searchParams] = useSearchParams();
  const [target] = useState(() => loadTarget(Store, searchParams.get('milestoneId')));
  const openDispute = target ? Store.getDisputes().find(d => d.milestoneId === target.id && d.status === 'open') : null;
  const settled = target && ['completed', 'approved'].includes(target.status);
  // There is only something to dispute once the worker has handed work in.
  const notSubmitted = target && !['submitted', 'review'].includes(target.status);
  const backURL = target ? `${workroomURL}?id=${target.taskId}` : workroomURL;
  const targetTask = target ? target.task : null;
  // The client chooses who arbitrates — any available reviewer covering the
  // category, the project's auditor included. Forcing the auditor meant that
  // if they were unavailable the list was empty and no dispute could be raised.
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [outcome, setOutcome] = useState('');
  const [expertId, setExpertId] = useState(null);
  const [reviewerFee, setReviewerFee] = useState('');
  const [showExpertError, setShowExpertError] = useState(false);
  // The client pays the reviewer, so only the client proposes a fee.

  function submitDispute() {
    if (!target) {
      showToast('No milestone selected for dispute.', 'warn');
      return;
    }

    if (!reason.trim() || !details.trim() || !outcome.trim()) {
      showToast('Please complete all dispute fields.', 'warn');
      return;
    }

    // The client raises the dispute and pays the reviewer to arbitrate it.
    const fee = parseFloat(reviewerFee);
    if (!(fee >= 1)) {
      showToast('Enter the fee you will pay the reviewer (at least ₹1).', 'warn');
      return;
    }

    // The server takes the parties from the project; it only needs the ids.
    const disputeData = {
      taskId: target.taskId,
      milestoneId: target.id,
      project: targetTask ? targetTask.title : 'Project',
      milestone: target.title,
      amount: target.amount,
      reason: reason.trim(),
      details: details.trim(),
      outcome: outcome.trim(),
      expertId,
      reviewerFee: fee,
    };

    if (!expertId) {
      setShowExpertError(true);
      showToast('Select an Expert Reviewer to handle this dispute.', 'warn');
      return;
    }

    try {
      Store.createDispute(disputeData);
    } catch (e) {
      // The server's reason (already disputed, already paid, …), not a
      // generic "try again".
      showToast(e.message || 'Unable to submit dispute. Please try again.', 'error');
      return;
    }

    // Notifications render as text, so they are not HTML-escaped here —
    // escaping them showed "&amp;" in the dropdown.
    showToast('Dispute raised. Agree the reviewer\'s fee and fund it under Audit & Dispute Fees.', 'success');
    // The client pays the reviewer, so they go where the fee is agreed.
    const next = '/audit-offers';
    setTimeout(() => { navigate(next); }, 1300);
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={userRole} activePath="/client-my-projects" pageTitle="Raise Dispute" pageSubtitle="Dispute a milestone the worker submitted">
        <div className="dispute-form" id="disputeBody" style={{ padding: 20, margin: '0 auto', maxWidth: 800 }}>
          {!target ? (
            <div style={{ padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
              No dispute target found. Return to your <Link to={workroomURL}>workroom</Link>.
            </div>
          ) : openDispute ? (
            <div style={{ padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
              There is already an open dispute on <strong>{target.title}</strong>. Follow it under <Link to="/audit-offers">Audit &amp; Dispute Fees</Link>.
            </div>
          ) : settled ? (
            <div style={{ padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
              <strong>{target.title}</strong> has already been settled, so it can no longer be disputed.
            </div>
          ) : notSubmitted ? (
            <div style={{ padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
              The worker has not submitted <strong>{target.title}</strong> yet. You can dispute a milestone once its work has been handed in.
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Dispute Milestone</h2>
              <p style={{ marginBottom: 18, color: 'var(--muted-foreground)' }}>
                Tell the reviewer what is wrong with the submitted work. If they rule for you, the milestone goes back to the worker&apos;s To Do list
                with their notes and its escrow stays held; if they rule for the worker, the milestone is paid.
              </p>

              <div className="field-group">
                <label>Milestone</label>
                <div id="disputeMilestoneField" style={READONLY_FIELD_STYLE}>{target.title || 'Untitled milestone'}</div>
              </div>
              <div className="field-group">
                <label>Amount</label>
                <div id="disputeAmountField" style={READONLY_FIELD_STYLE}>{target.amount || '₹0'}</div>
              </div>
              <div className="field-group">
                <label htmlFor="disputeReason">Reason</label>
                <select id="disputeReason" className="field-select" value={reason} onChange={e => setReason(e.target.value)}>
                  <option value="">Select reason</option>
                  <option value="Incomplete work">Incomplete work</option>
                  <option value="Quality issues">Quality issues</option>
                  <option value="Scope mismatch">Scope mismatch</option>
                  <option value="Missed deadline">Missed deadline</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="field-group">
                <label htmlFor="disputeDetails">Details</label>
                <textarea id="disputeDetails" className="field-textarea" placeholder="Describe what is wrong and what you'd like changed"
                          value={details} onChange={e => setDetails(e.target.value)} />
              </div>
              <div className="field-group">
                <label htmlFor="disputeOutcome">Desired outcome</label>
                <input id="disputeOutcome" className="field-input" placeholder="E.g., fix the checkout bug and match the agreed design"
                       value={outcome} onChange={e => setOutcome(e.target.value)} />
              </div>

              <div className="field-group">
                <label>Expert Reviewer</label>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                  Choose who arbitrates this dispute. Only available reviewers covering this project&apos;s category are shown, and only the one you choose will see the case.
                </div>
                <div id="disputeExpertList">
                  <ExpertPicker
                    category={targetTask ? targetTask.category : null}
                    selectedId={expertId}
                    onChange={id => { setExpertId(id); setShowExpertError(false); }}
                  />
                </div>
                <div className="field-error" id="disputeExpertErr" style={{ display: showExpertError ? 'block' : 'none', color: '#ef4444', fontSize: 12, marginTop: 6 }}>
                  Select an Expert Reviewer to continue.
                </div>
              </div>

              <div className="field-group">
                <label htmlFor="disputeReviewerFee">Reviewer fee you will pay</label>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 6 }}>
                  You pay the reviewer to arbitrate the dispute. This is your offer — the reviewer can accept it or
                  counter, and nothing is charged until you both agree and you fund it under Audit &amp; Dispute Fees. The platform keeps
                  {` ${Store.Fees.rates().expertService.percent}%`} of the reviewer&apos;s fee.
                </div>
                <div style={{ position: 'relative', maxWidth: 220 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontWeight: 700, color: 'var(--muted-foreground)' }}>₹</span>
                  <input id="disputeReviewerFee" className="field-input" type="number" min="1" step="1" placeholder="150" style={{ paddingLeft: 26 }}
                         value={reviewerFee} onChange={e => setReviewerFee(e.target.value)} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn-primary btn-action" onClick={submitDispute}>Submit Dispute</button>
                <Link to={backURL} className="btn-outline btn-action">Back to Workroom</Link>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

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
import { Link, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ExpertPicker from '../components/ExpertPicker';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { escapeHtml } from '../utils/helpers';
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

/** The milestone being disputed, as saved by the previous page. */
function readTarget() {
  try {
    return JSON.parse(localStorage.getItem('disputeTargetMilestone') || 'null');
  } catch (e) {
    console.warn('Could not get disputeTargetMilestone from localStorage', e);
    return null;
  }
}

// Read-only "Milestone" / "Amount" boxes
const READONLY_FIELD_STYLE = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10, background: 'var(--secondary)', fontWeight: 600 };

export default function Dispute() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Raise Dispute — Lannent');
  const navigate = useNavigate();
  const session = Auth.getCurrentUser();
  const userRole = session?.role || 'client';
  const workroomURL = userRole === 'worker' ? '/worker-workroom' : '/project-workroom';

  const [target] = useState(readTarget);
  const [reason, setReason] = useState('');
  const [details, setDetails] = useState('');
  const [outcome, setOutcome] = useState('');
  const [expertId, setExpertId] = useState(null);
  const [showExpertError, setShowExpertError] = useState(false);

  // Offer only reviewers who cover this project's category.
  const targetTask = target && target.taskId ? Store.getTaskById(target.taskId) : null;

  function submitDispute() {
    const target = readTarget();
    if (!target) {
      showToast('No milestone selected for dispute.', 'warn');
      return;
    }

    if (!reason.trim() || !details.trim() || !outcome.trim()) {
      showToast('Please complete all dispute fields.', 'warn');
      return;
    }

    const taskIdFromTarget = target.taskId || null;
    const task = taskIdFromTarget ? Store.getTaskById(taskIdFromTarget) : Store.getMilestoneById(target.id)?.taskId ? Store.getTaskById(Store.getMilestoneById(target.id).taskId) : null;
    const workerId = target.workerId || (task ? task.workerId : null);
    const worker = workerId ? Store.getUserById(workerId) : null;

    const disputeData = {
      taskId: task?.id || target.taskId || null,
      milestoneId: target.id,
      project: task ? task.title : target.project || target.title || 'Project',
      milestone: target.title || target.milestone || 'Milestone',
      amount: target.amount ? (typeof target.amount === 'number' ? '$' + target.amount.toLocaleString() : target.amount) : '$0',
      reason: reason.trim(),
      details: details.trim(),
      outcome: outcome.trim(),
      raisedBy: session?.userId || null,
      raisedByName: session?.name || session?.email || 'Client',
      expertId,
      againstId: worker ? worker.id : target.workerId || null,
      againstName: worker ? worker.name : target.workerName || target.worker || 'Worker',
      status: 'open',
    };

    if (!expertId) {
      setShowExpertError(true);
      showToast('Select an Expert Reviewer to handle this dispute.', 'warn');
      return;
    }

    try {
      Store.createDispute(disputeData);

      // Notify all expert reviewers about the new dispute
      const experts = Store.getUsers().filter(u => u.role === 'expert' && u.status === 'active');
      experts.forEach(expert => {
        Store.addNotification({
          userId: expert.id,
          type: 'dispute',
          text: `New dispute raised: ${escapeHtml(disputeData.project)}`,
          subtext: `${escapeHtml(disputeData.raisedByName)} raised a dispute — ${escapeHtml(disputeData.reason)}`,
        });
      });

      // Also notify the worker being disputed
      if (disputeData.againstId) {
        Store.addNotification({
          userId: disputeData.againstId,
          type: 'dispute',
          text: `A dispute has been raised against you`,
          subtext: `${escapeHtml(disputeData.project)} — ${escapeHtml(disputeData.milestone)}: ${escapeHtml(disputeData.reason)}`,
        });
      }

      showToast('Dispute submitted successfully.', 'success');
      const redirectTaskId = disputeData.taskId ? `?id=${disputeData.taskId}` : '';
      setTimeout(() => { navigate(`/project-milestone-board${redirectTaskId}`); }, 1300);
    } catch (e) {
      console.error('Dispute submit error:', e);
      showToast('Unable to submit dispute. Please try again.', 'error');
    }
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={userRole} activePath={userRole === 'worker' ? '/worker-my-projects' : '/client-my-projects'} pageTitle="Raise Dispute" pageSubtitle="Dispute details">
        <div className="dispute-form" id="disputeBody" style={{ padding: 20, margin: '0 auto', maxWidth: 800 }}>
          {!target ? (
            <div style={{ padding: 20, background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, textAlign: 'center' }}>
              No dispute target found. Return to your <Link to={workroomURL}>workroom</Link>.
            </div>
          ) : (
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
              <h2 style={{ fontSize: 18, marginBottom: 10 }}>Dispute Milestone</h2>
              <p style={{ marginBottom: 18, color: 'var(--muted-foreground)' }}>Provide details to raise a dispute for the selected milestone.</p>

              <div className="field-group">
                <label>Milestone</label>
                <div id="disputeMilestoneField" style={READONLY_FIELD_STYLE}>{target.title || 'Untitled milestone'}</div>
              </div>
              <div className="field-group">
                <label>Amount</label>
                <div id="disputeAmountField" style={READONLY_FIELD_STYLE}>{target.amount || '$0'}</div>
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
                <input id="disputeOutcome" className="field-input" placeholder="E.g., revision, partial refund, cancellation"
                       value={outcome} onChange={e => setOutcome(e.target.value)} />
              </div>

              <div className="field-group">
                <label>Expert Reviewer</label>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>
                  Choose who arbitrates this dispute. Only reviewers covering this project's category are shown,
                  and only they will be able to see the case.
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

              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button className="btn-primary btn-action" onClick={submitDispute}>Submit Dispute</button>
                <Link to={workroomURL} className="btn-outline btn-action">Back to Workroom</Link>
              </div>
            </div>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}

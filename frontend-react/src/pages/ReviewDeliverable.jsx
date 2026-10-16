/**
 * LANNENT — ReviewDeliverable
 * Converted from front-end/pages/review-deliverable.html.
 *
 * The client reviews a submitted milestone (?milestoneId=<id>&role=client):
 * files, the worker's notes, the Expert Reviewer's verdict (if audited) and a
 * checklist. From here they approve & release escrow, request changes, or
 * raise a dispute. Experts (role=expert) get a "Submit Audit Report" action.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ReviewDeliverable.css?raw';

const CHECKLIST = [
  { id: 1, label: 'Code meets project requirements' },
  { id: 2, label: 'Documentation is complete and clear' },
  { id: 3, label: 'Design files are properly organized' },
  { id: 4, label: 'All files are accessible and working' },
  { id: 5, label: 'Quality standards are met' },
];

// ── Expert Reviewer's verdict ──
const VERDICTS = {
  pass:        { label: 'Passed the technical audit', bg: '#ecfdf5', border: '#a7f3d0', text: '#047857', icon: 'check-circle-2' },
  fail:        { label: 'Failed the technical audit', bg: '#fef2f2', border: '#fecaca', text: '#b91c1c', icon: 'x-circle' },
  conditional: { label: 'Passed with conditions',     bg: '#fffbeb', border: '#fde68a', text: '#b45309', icon: 'alert-triangle' },
};

const CARD_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };
// Worker text keeps its line breaks, and long links wrap instead of widening the page.
const NOTES_STYLE = { background: 'var(--input-bg)', borderRadius: 12, padding: 16, fontSize: 14, color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' };
const BUTTON_ICON_STYLE = { width: 16, height: 16, display: 'inline', verticalAlign: 'middle', marginRight: 6 };

/** Finds the milestone to review: from the URL, the workroom's selection, or the first submitted one. */
function findMilestone(Store, milestoneId, userId) {
  let milestone = milestoneId ? Store.getMilestoneById(milestoneId) : null;

  // The workroom records the milestone the client actually selected before
  // sending them here. Honour it before guessing — the scan below picks the
  // first submitted milestone across every project, which is rarely the one
  // they clicked.
  if (!milestone) {
    try {
      const stored = JSON.parse(localStorage.getItem('selectedMilestone') || 'null');
      if (stored && stored.id) milestone = Store.getMilestoneById(stored.id);
    } catch (e) { /* nothing usable stored */ }
  }

  // Last resort: the first submitted milestone for the client's tasks.
  if (!milestone) {
    for (const t of Store.getTasksByClient(userId)) {
      const ms = Store.getMilestonesByTask(t.id).find(m => m.status === 'submitted' || m.status === 'review');
      if (ms) { milestone = ms; break; }
    }
  }
  return milestone;
}

/** One "Code quality ▮▮▮▯▯ 3/5" bar of the audit verdict. */
function ScoreBar({ label, value }) {
  const v = Number(value) || 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, marginBottom: 6 }}>
      <span style={{ width: 104, color: 'var(--muted-foreground)', flex: 'none' }}>{label}</span>
      <span style={{ flex: 1, height: 6, background: 'var(--secondary)', borderRadius: 3, overflow: 'hidden' }}>
        <span style={{ display: 'block', width: `${(v / 5) * 100}%`, height: '100%', background: '#6366f1' }}></span>
      </span>
      <span style={{ width: 26, textAlign: 'right', fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>{`${v}/5`}</span>
    </div>
  );
}

/** The Expert Reviewer's verdict — or a note that the audit is still running. */
function AuditPanel({ engagement, report, reviewer }) {
  if (report && report.verdict) {
    const v = VERDICTS[report.verdict] || VERDICTS.conditional;
    const scores = ['codequality', 'security', 'performance', 'documentation'].filter(k => report[k] != null);
    const avg = scores.length ? (scores.reduce((a, k) => a + Number(report[k] || 0), 0) / scores.length).toFixed(1) : null;
    return (
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, marginBottom: 14, flexWrap: 'wrap' }}>
          <h3 style={{ fontSize: 15, fontWeight: 600 }}>Expert Reviewer's verdict</h3>
          <Link to={`/expert-report-audit?id=${engagement.id}&milestoneId=${report.milestoneId || ''}`} style={{ fontSize: 12.5, color: 'var(--muted-foreground)', textDecoration: 'underline', textUnderlineOffset: 2 }}>Read the full report</Link>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 12, background: v.bg, border: `1px solid ${v.border}`, marginBottom: 16 }}>
          <Icon name={v.icon} style={{ width: 22, height: 22, color: v.text, flex: 'none' }} />
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: v.text }}>{v.label}</div>
            <div style={{ fontSize: 12.5, color: v.text, opacity: 0.85 }}>
              {`Reviewed by ${reviewer ? reviewer.name : 'an Expert Reviewer'}${avg ? ' · overall ' + avg + '/5' : ''}`}
            </div>
          </div>
        </div>
        {scores.length ? (
          <div style={{ marginBottom: 14 }}>
            <ScoreBar label="Code quality" value={report.codequality} />
            <ScoreBar label="Security" value={report.security} />
            <ScoreBar label="Performance" value={report.performance} />
            <ScoreBar label="Documentation" value={report.documentation} />
          </div>
        ) : ''}
        {report.findings ? (
          <>
            <div style={{ fontSize: 11, letterSpacing: '.07em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 6 }}>Findings</div>
            <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted-foreground)', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{report.findings}</div>
          </>
        ) : ''}
      </div>
    );
  }
  if (engagement && !['declined', 'cancelled'].includes(engagement.status)) {
    return (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Icon name="clock" style={{ width: 20, height: 20, color: 'var(--muted-foreground)', flex: 'none' }} />
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>Technical audit in progress</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted-foreground)' }}>
            {`${reviewer ? reviewer.name + ' has' : 'The Expert Reviewer has'} not filed a report yet. You can still approve, but the audit will not have informed your decision.`}
          </div>
        </div>
      </div>
    );
  }
  return null;
}

/** The submitted files (with a download link when the file was stored). */
function SubmittedFiles({ files }) {
  const Store = useStore();
  if (!files || !files.length) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted-foreground)' }}>
        <Icon name="file-x" style={{ width: 32, height: 32, opacity: 0.4, margin: '0 auto 8px', display: 'block' }} />
        <div style={{ fontSize: 13 }}>No files attached to this submission.</div>
      </div>
    );
  }
  return files.map((f, i) => {
    // Submissions made before the file store exists carry a bare name
    // and nothing to fetch, so the control says so instead of being a
    // button that does nothing.
    const name = typeof f === 'string' ? f : (f && f.name) || 'File';
    const href = typeof f === 'object' ? Store.fileUrl(f) : '';
    const size = typeof f === 'object' && f.size ? (Number(f.size) / 1024).toFixed(0) + ' KB' : 'Submitted file';
    return (
      <div key={i} className="file-row">
        <div className="file-icon-wrap" style={{ background: '#eef2ff' }}>
          <Icon name="file" style={{ width: 18, height: 18, color: '#6366f1' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 500, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</div>
          <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{size}</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {href
            ? <a className="btn-sm" href={href} download={name} title="Download"><Icon name="download" style={{ width: 14, height: 14 }} /></a>
            : <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }} title="Uploaded before the file store existed, so only the name was kept.">Not stored</span>}
        </div>
      </div>
    );
  });
}

export default function ReviewDeliverable() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Review Deliverable — Lannent');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const session = Auth.getCurrentUser();
  const milestoneId = searchParams.get('milestoneId') || searchParams.get('id');
  // The layout follows who is signed in. It came from `?role=`, defaulting
  // to client, so a link without the parameter (the worker sidebar's "Reports")
  // drew another role's sidebar — whose Settings link then bounced the user
  // to their dashboard.
  const role = session?.role || searchParams.get('role') || 'client';

  const [checked, setChecked] = useState([]);           // ids of ticked checklist items
  const [comments, setComments] = useState('');
  const [commentsError, setCommentsError] = useState('');
  // When the page was opened — the reference for "is the reviewer's report overdue".
  const [openedAt] = useState(() => Date.now());
  const [confirmOpen, setConfirmOpen] = useState(false);

  const milestone = findMilestone(Store, milestoneId, session.userId);
  if (!milestone) {
    return (
      <>
        <PageStyle css={pageCss} />
        <EmptyState role="client" activePath="/client-my-projects" pageTitle="Review Deliverable"
                    message="No deliverable pending review." linkHref="/client-my-projects" linkLabel="Go to Projects" />
      </>
    );
  }

  const task = Store.getTaskById(milestone.taskId);
  const worker = milestone.workerId ? Store.getUserById(milestone.workerId) : null;

  // The Expert Reviewer's verdict on this work. The client releases escrow
  // from this page, and previously had no sight of the audit at all — the
  // report existed but was two clicks away under Reports.
  // Match this milestone specifically, or a project-wide audit not yet
  // pointed at one. Falling back to any engagement on the task showed
  // another milestone's verdict on this page.
  const engagements = (Store.getAuditRequests() || []).filter(a => a.taskId === milestone.taskId && a.kind !== 'dispute-audit'
    && !['declined', 'cancelled'].includes(a.status));
  const engagement = engagements.find(a => a.expertId) || engagements[0] || null;
  const reviewable = ['submitted', 'review'].includes(milestone.status);
  // The report for THIS milestone — the engagement covers the whole project,
  // and its first report is usually about a different milestone.
  const auditReport = engagement ? Store.getAuditReportByRequest(engagement.id, milestone.id) : null;
  const reviewer = engagement && engagement.expertId ? Store.getUserById(engagement.expertId) : null;

  const deliverable = {
    project: task ? task.title : 'Unknown Project',
    milestone: milestone.title,
    worker: worker ? worker.name : 'Gig Worker',
    workerAvatar: worker ? worker.avatar : 'GW',
    workerColor: worker ? worker.avatarColor : 'linear-gradient(135deg,#6366f1,#4f46e5)',
    workerId: milestone.workerId,
    submittedDate: milestone.submittedAt ? new Date(milestone.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently submitted',
    budget: milestone.budget || 0,
    id: milestone.id,
    deliverable: milestone.deliverable || null,
  };
  const allChecked = checked.length === CHECKLIST.length;

  // The client's clock: an untouched submission is paid automatically.
  const autoApproveOn = milestone.reviewDueAt ? new Date(milestone.reviewDueAt) : null;
  const fmtDate = d => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  // "Request changes" can be used three times per milestone.
  const revisionsLeft = Math.max(0, 3 - (Number(milestone.revisionCount) || 0));
  // The reviewer's share for this milestone: approving inside their 5-day
  // window pays them even without a report; after it, with no report, their
  // share comes back to you.
  const auditOn = engagement && engagement.status === 'in-progress' && !auditReport
    && !((engagement.milestonePayouts || {})[milestone.id]);
  const reportDue = auditOn && milestone.submittedAt ? new Date(new Date(milestone.submittedAt).getTime() + 5 * 86_400_000) : null;
  const reportOverdue = reportDue && reportDue.getTime() <= openedAt;
  const backTo = role === 'expert' ? '/expert-audit-requests' : '/client-my-projects';

  function toggleCheck(id) {
    setChecked(list => (list.includes(id) ? list.filter(x => x !== id) : [...list, id]));
  }

  function handleApprove() {
    if (!reviewable) { Validate.toast('This milestone is not waiting for your review.', 'error'); return; }
    if (!allChecked) { Validate.toast('Please complete the checklist before approving.', 'error'); return; }
    setConfirmOpen(true);
  }

  function confirmRelease() {
    setConfirmOpen(false);
    let result;
    try {
      result = Store.approveDeliverable(milestone.id);
    } catch (e) {
      // e.g. escrow cannot cover it, or the milestone is under dispute. This
      // used to be logged and then reported as "released".
      Validate.toast((e.message), 'error');
      return;
    }
    const net = result && result.release && result.release.net != null ? result.release.net : null;
    Validate.toast(`✓ ₹${deliverable.budget.toLocaleString('en-IN')} released to ${deliverable.worker}${net != null ? ` (₹${net.toLocaleString('en-IN')} after the service fee)` : ''}.`, 'success');
    setTimeout(() => navigate('/client-my-projects'), 2000);
  }

  function handleRequestChanges() {
    if (comments.trim().length < 10) { setCommentsError('Tell the worker what to change (at least 10 characters).'); return; }
    if (revisionsLeft <= 0) { Validate.toast('You have asked for changes 3 times on this milestone. Approve it, or raise a dispute and let a reviewer decide.', 'error'); return; }
    setCommentsError('');
    // 'revision-needed' is the status the board and the server understand;
    // 'todo' was not one of them.
    if (!reviewable) { Validate.toast('This milestone is not waiting for your review.', 'error'); return; }
    try {
      // The comments go with the request — they are what the worker revises against.
      Store.updateMilestone(milestone.id, { status: 'revision-needed', revisionNote: comments.trim() });
    } catch (e) {
      Validate.toast((e.message), 'error');
      return;
    }
    Validate.toast('Revision request sent to ' + (deliverable.worker), 'success');
    setTimeout(() => navigate('/client-my-projects'), 1800);
  }

  function handleDispute() {
    // Store milestone + project info so dispute page can display it
    try {
      localStorage.setItem('disputeTargetMilestone', JSON.stringify({
        id: milestone.id,
        taskId: milestone.taskId,
        title: milestone.title,
        amount: milestone.budget || 0,
        project: task ? task.title : 'Unknown Project',
        workerId: deliverable.workerId,
        workerName: deliverable.worker,
      }));
    } catch (e) {
      console.warn('Could not set disputeTargetMilestone in localStorage', e);
    }
    navigate('/dispute?milestoneId=' + encodeURIComponent(milestone.id));
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={role} activePath={backTo} pageTitle="Review Deliverable" pageSubtitle={deliverable.milestone}>
        <div style={{ marginBottom: 16 }}>
          <Link to={backTo} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} />
            {`Back to ${role === 'expert' ? 'Audit Requests' : 'Projects'}`}
          </Link>
        </div>

        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px', marginBottom: 24, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 48, height: 48, borderRadius: '50%', background: deliverable.workerColor, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 14, fontWeight: 700 }}>{deliverable.workerAvatar}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{deliverable.worker}</div>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{`Submitted ${deliverable.submittedDate}`}</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ textAlign: 'center', padding: '12px 20px', borderRadius: 12, background: '#ecfdf5' }}>
              <div style={{ fontWeight: 700, color: '#10b981', fontSize: 18 }}>{`₹${deliverable.budget.toLocaleString('en-IN')}`}</div>
              <div style={{ fontSize: 11, color: '#065f46' }}>Milestone Value</div>
            </div>
            <span className={`badge ${reviewable ? 'badge-orange' : 'badge-blue'}`} style={{ fontSize: 13, padding: '8px 16px' }}>
              {reviewable ? 'Pending Review' : milestone.status.replace(/-/g, ' ')}
            </span>
          </div>
        </div>

        <div className="review-layout">
          <div>
            <AuditPanel engagement={engagement} report={auditReport} reviewer={reviewer} />

            <div style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Submitted Files</h3>
              <div style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: 16 }}>{`${deliverable.project} · ${deliverable.milestone}`}</div>
              {deliverable.deliverable && !(deliverable.deliverable.files || []).length && deliverable.deliverable.link ? null
                : <SubmittedFiles files={deliverable.deliverable && deliverable.deliverable.files} />}
              {/* The link (a repository, a drive folder) and branch the worker handed in. They were sent with the
                  submission but never shown here, so a link-only submission looked empty. */}
              {deliverable.deliverable && deliverable.deliverable.link ? (
                <div className="file-row">
                  <div className="file-icon-wrap" style={{ background: '#ecfdf5' }}>
                    <Icon name="link" style={{ width: 18, height: 18, color: '#059669' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <a href={deliverable.deliverable.link} target="_blank" rel="noopener noreferrer"
                       style={{ fontWeight: 500, fontSize: 14, color: '#4f46e5', overflowWrap: 'anywhere' }}>{deliverable.deliverable.link}</a>
                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
                      {deliverable.deliverable.branch ? `Branch: ${deliverable.deliverable.branch}` : 'Link to the work'}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={CARD_STYLE}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Worker's Notes</h3>
              {deliverable.deliverable && deliverable.deliverable.description ? (
                <div style={NOTES_STYLE}>{deliverable.deliverable.description}</div>
              ) : (
                <div style={NOTES_STYLE}>
                  <p style={{ marginBottom: 12 }}>
                    <strong>Deliverable submitted</strong> for review.
                  </p>
                  <p>Worker has submitted work for this milestone. Review the files and checklist before approving.</p>
                </div>
              )}
            </div>

            {role === 'client' && !reviewable ? (
              <div style={CARD_STYLE}>
                <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
                  {milestone.status === 'revision-needed' ? 'You requested changes. The worker will resubmit.'
                    : milestone.status === 'disputed' ? 'This milestone is under dispute. The reviewer\'s verdict will settle it.'
                    : ['completed', 'approved'].includes(milestone.status) ? 'This milestone has been approved and paid.'
                    : 'The worker has not submitted this milestone yet.'}
                </div>
              </div>
            ) : role === 'client' ? (
              <>
                <div style={CARD_STYLE}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Your Review Comments</h3>
                  <textarea className="form-input" id="reviewComments" rows="4" placeholder="Add your feedback, questions, or specific revision requests here..."
                            value={comments} onChange={e => setComments(e.target.value)} style={commentsError ? { borderColor: '#ef4444' } : undefined} />
                  <div id="commentsErr" style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: commentsError ? 'block' : 'none' }}>{commentsError}</div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
                  <button id="approveBtn" onClick={handleApprove} className="btn-primary" title={allChecked ? '' : 'Complete the checklist to approve'}
                          style={{ padding: 12, borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)', opacity: allChecked ? '1' : '0.6' }}>
                    <Icon name="check-circle" style={BUTTON_ICON_STYLE} />
                    Approve &amp; Release
                  </button>
                  <button onClick={handleRequestChanges} className="btn-outline" style={{ padding: 12, borderRadius: 12, borderColor: '#f59e0b', color: '#d97706' }}>
                    <Icon name="refresh-cw" style={BUTTON_ICON_STYLE} />
                    Request Changes
                  </button>
                  <button onClick={handleDispute} className="btn-outline" style={{ padding: 12, borderRadius: 12, borderColor: '#ef4444', color: '#ef4444' }}>
                    <Icon name="alert-triangle" style={BUTTON_ICON_STYLE} />
                    Raise Dispute
                  </button>
                </div>
              </>
            ) : (
              <div style={CARD_STYLE}>
                <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Expert Action</h3>
                <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>After reviewing the checklist and files, submit your final audit report.</p>
                <button onClick={() => navigate(`/expert-report-audit?id=${engagement ? engagement.id : ''}&milestoneId=${milestone.id}`)} disabled={!engagement} className="btn-primary" style={{ padding: '12px 24px', borderRadius: 12, width: '100%' }}>
                  <Icon name="clipboard-check" style={BUTTON_ICON_STYLE} />
                  Submit Audit Report
                </button>
              </div>
            )}
          </div>

          <div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 20, marginBottom: 16, position: 'sticky', top: 80 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Review Checklist</h3>
              <div id="checklistContainer">
                {CHECKLIST.map(item => {
                  const on = checked.includes(item.id);
                  return (
                    <div key={item.id} className="checklist-item" onClick={() => toggleCheck(item.id)}>
                      <div className={'check-box' + (on ? ' checked' : '')} id={`chkBox${item.id}`}>
                        {on ? <Icon name="check" style={{ width: 12, height: 12, color: 'white' }} /> : ''}
                      </div>
                      {/* Only the box changes when ticked; the label keeps its style (as before). */}
                      <span style={{ fontSize: 14 }}>{item.label}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{ marginTop: 16, padding: 12, borderRadius: 12, background: 'var(--input-bg)', textAlign: 'center' }}>
                <span id="checkCount" style={{ fontSize: 13, fontWeight: 600, color: '#6366f1' }}>{`${checked.length}/${CHECKLIST.length} items checked`}</span>
              </div>
            </div>
            <div style={{ background: 'linear-gradient(145deg,#fff7ed,#ffedd5)', border: '1.5px solid #fed7aa', borderRadius: 16, padding: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: '#c2410c', marginBottom: 12 }}>⚠ Before Approving</h3>
              <p style={{ fontSize: 13, color: '#7c2d12', lineHeight: 1.6 }}>
                {role === 'expert'
                  ? 'Filing the report pays your share of the audit fee for this milestone. A report filed more than 5 days after submission can be overtaken by the client approving the work without it.'
                  : <>Approving will release <strong>{`₹${deliverable.budget.toLocaleString('en-IN')}`}</strong>{` from escrow to ${deliverable.worker}. This action cannot be undone.`}</>}
              </p>
              {role !== 'expert' && reviewable && (
                <ul style={{ fontSize: 12.5, color: '#7c2d12', lineHeight: 1.6, margin: '10px 0 0', paddingLeft: 18 }}>
                  {autoApproveOn && <li>{`If you do nothing, this is approved and paid automatically on ${fmtDate(autoApproveOn)}.`}</li>}
                  <li>{revisionsLeft > 0 ? `You can ask for changes ${revisionsLeft} more time${revisionsLeft === 1 ? '' : 's'}.` : 'You have used all 3 change requests — approve it or raise a dispute.'}</li>
                  {auditOn && reportDue && !reportOverdue && <li>{`The reviewer's report is due by ${fmtDate(reportDue)}. Approving before then still pays them for this milestone.`}</li>}
                  {auditOn && reportOverdue && <li>The reviewer has not reported within 5 days. Approving now returns their share of the audit fee for this milestone to you.</li>}
                </ul>
              )}
            </div>
          </div>
        </div>

        {/* Confirm modal */}
        <div id="confirmModal" style={{ display: confirmOpen ? 'flex' : 'none', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', zIndex: 200, backdropFilter: 'blur(4px)' }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 32, width: '100%', maxWidth: 400, margin: '0 16px', boxShadow: '0 32px 80px rgba(0,0,0,0.15)', textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#059669)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>✓</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8 }}>Confirm Release</h2>
            <p style={{ fontSize: 14, color: 'var(--muted-foreground)', marginBottom: 20 }}>
              Release <strong>{`₹${deliverable.budget.toLocaleString('en-IN')}`}</strong> from escrow to <strong>{deliverable.worker}</strong>? This cannot be undone.
            </p>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setConfirmOpen(false)} className="btn-outline" style={{ flex: 1, padding: 12, borderRadius: 12 }}>Cancel</button>
              <button onClick={confirmRelease} className="btn-primary" style={{ flex: 1, padding: 12, borderRadius: 12, background: 'linear-gradient(135deg,#10b981,#059669)' }}>Release Funds</button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

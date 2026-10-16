/**
 * LANNENT — ExpertReportAudit
 * Converted from front-end/pages/expert-report-audit.html.
 *
 * Technical audit report for one milestone (?id=<auditRequestId>&milestoneId=<id>).
 *   - The assigned expert scores an unaudited, submitted milestone (checklist,
 *     star scores, findings, verdict) and files the report.
 *   - Once a report exists — or for clients/workers — the page is read-only.
 */
import { Fragment, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import { downloadPdf } from '../utils/pdf';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertReportAudit.css?raw';

const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';

const SCORE_CATEGORIES = ['codequality', 'security', 'performance', 'documentation'];
const INITIAL_CHECKLIST = [
  { id: 'c1', label: 'Code meets project requirements', passed: null },
  { id: 'c2', label: 'Documentation is complete and clear', passed: null },
  { id: 'c3', label: 'All files are accessible and working', passed: null },
  { id: 'c4', label: 'No critical security vulnerabilities', passed: null },
  { id: 'c5', label: 'Quality standards are met', passed: null },
];

// Shared inline styles
const CARD_STYLE = { background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 };
const MUTED_P_STYLE = { fontSize: 13.5, color: 'var(--muted-foreground)' };
const H3_ICON_STYLE = { fontSize: 15, fontWeight: 600, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 };
const bigButtonStyle = (background, color) => ({ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 16, padding: '10px 20px', borderRadius: 10, background, color, fontSize: 13, fontWeight: 500, textDecoration: 'none' });
const bigIconStyle = color => ({ width: 40, height: 40, color, margin: '0 auto 12px', display: 'block' });
const ERROR_STYLE = { fontSize: 12, color: '#ef4444', marginTop: 4 };

/** One of the three info tiles at the top of every state. */
function HeaderTile({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="stat-card">
      <div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 4 }}>{label}</div>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{value}</div>
      </div>
      <div className="stat-icon-wrap" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 18, height: 18, color: iconColor }} />
      </div>
    </div>
  );
}

/** Small uppercase label inside the deliverable card. */
function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', margin: '14px 0 6px' }}>{children}</div>;
}

/**
 * A file the worker attached. Downloading needs the file to actually be
 * stored — until uploads land, a submission carries the name only, so the
 * control says so rather than pretending to be a working button.
 */
function FileRow({ f }) {
  const Store = useStore();
  const name = typeof f === 'string' ? f : (f && f.name) || 'File';
  const url = typeof f === 'object' ? Store.fileUrl(f) : '';
  const size = typeof f === 'object' && f.size ? ` · ${(Number(f.size) / 1024).toFixed(0)} KB` : '';
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
      <Icon name="file" style={{ width: 16, height: 16, color: '#6366f1', flex: 'none' }} />
      <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name + size}</span>
      {url ? (
        <a href={url} download={name} className="btn-outline" style={{ textDecoration: 'none', padding: '5px 11px', borderRadius: 8, fontSize: 12, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <Icon name="download" style={{ width: 13, height: 13 }} />Download
        </a>
      ) : (
        <span title="The file store is not enabled yet, so only the filename was recorded with this submission." style={{ fontSize: 11.5, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Not stored</span>
      )}
    </div>
  );
}

/**
 * What the worker actually submitted — all of it.
 *
 * This card used to show the engagement's status, severity and due date
 * and nothing else: no repository, no branch, no files. A reviewer was
 * asked to judge work they could not see.
 */
function DeliverableCard({ milestone, work }) {
  let inner;
  if (!milestone) {
    inner = <p style={MUTED_P_STYLE}>No milestone is attached to this engagement yet.</p>;
  } else if (!work) {
    inner = <p style={MUTED_P_STYLE}>The worker has not submitted anything for <strong>{milestone.title}</strong> yet, so there is nothing to audit.</p>;
  } else {
    const repo = safeUrl(work.link);
    inner = (
      <>
        {work.title ? <><FieldLabel>Title</FieldLabel><div style={{ fontSize: 14, fontWeight: 600 }}>{work.title}</div></> : ''}
        {work.description ? <><FieldLabel>Notes from the worker</FieldLabel><p style={{ fontSize: 13.5, lineHeight: 1.65, color: '#374151' }}>{work.description}</p></> : ''}
        {repo ? (
          <>
            <FieldLabel>Repository</FieldLabel>
            <a href={repo} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#4f46e5', wordBreak: 'break-all' }}>
              <Icon name="git-branch" style={{ width: 14, height: 14, flex: 'none' }} />{work.link}
            </a>
          </>
        ) : ''}
        {work.branch ? <><FieldLabel>Branch</FieldLabel><code style={{ fontSize: 13, background: 'var(--secondary)', padding: '3px 8px', borderRadius: 6 }}>{work.branch}</code></> : ''}
        <FieldLabel>Files</FieldLabel>
        {(work.files && work.files.length)
          ? <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>{work.files.map((f, i) => <FileRow key={i} f={f} />)}</div>
          : <p style={MUTED_P_STYLE}>No files were attached to this submission.</p>}
        {milestone.submittedAt ? <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted-foreground)' }}>{`Submitted ${milestone.submittedAt} · milestone value ₹${milestone.budget}`}</div> : ''}
      </>
    );
  }
  return (
    <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 20 }}>
      <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>{`Submitted Deliverable${milestone ? ` — ${milestone.title}` : ''}`}</h3>
      {inner}
    </div>
  );
}

/** A labelled 0–5 bar in the read-only report. */
function ScoreBar({ label, val }) {
  const pct = ((val || 0) / 5) * 100;
  const color = (val || 0) >= 4 ? '#10b981' : (val || 0) >= 3 ? '#f59e0b' : '#ef4444';
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 500 }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color }}>{`${val || 0}/5`}</span>
      </div>
      <div style={{ height: 8, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.3s' }}></div>
      </div>
    </div>
  );
}

/** One label/value row in the "Report Details" grid. */
function InfoCell({ label, children }) {
  return (
    <div className="info-cell">
      <span className="info-label">{label}</span>
      {' '}
      <span className="info-value">{children}</span>
    </div>
  );
}

/** Read-only view of a filed report. */
function ReportView({ report, req, isReviewer }) {
  const Store = useStore();
  const vPass = report.verdict === 'pass' || report.verdict === 'conditional';
  const verdictWord = report.verdict === 'pass' ? 'PASS' : report.verdict === 'conditional' ? 'PASS WITH CONDITIONS' : 'FAIL';

  function downloadReport() {
    downloadPdf(`audit-report-${req.id}-${report.milestoneId || 'project'}.pdf`, {
      title: 'Technical Audit Report',
      subtitle: `${report.projectTitle || req.project || 'Project'} — ${report.milestoneTitle || req.milestone || 'Milestone'}`,
      meta: `Report ${report.id} · filed ${report.createdAt || ''}`,
      sections: [
        { heading: 'Verdict', rows: [
          ['Verdict', verdictWord],
          ['Reviewer', expertName],
          ['Worker', report.workerName || req.worker || '-'],
          ['Overall score', `${average} / 5`],
        ] },
        { heading: 'Quality scores', rows: [
          ['Code quality', `${report.codequality || 0} / 5`],
          ['Security', `${report.security || 0} / 5`],
          ['Performance', `${report.performance || 0} / 5`],
          ['Documentation', `${report.documentation || 0} / 5`],
        ] },
        { heading: 'Technical findings', text: report.findings || 'No findings recorded.' },
      ],
    });
  }
  const expertUser = Store.getUserById(report.expertId);
  const expertName = expertUser ? expertUser.name : 'Expert Reviewer';
  const expertInitials = expertName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  const average = (((report.codequality || 0) + (report.security || 0) + (report.performance || 0) + (report.documentation || 0)) / 4).toFixed(1);

  return (
    <>
      {isReviewer ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: 12, padding: '14px 16px', marginBottom: 16 }}>
          <Icon name="lock" style={{ width: 18, height: 18, color: '#047857', flex: 'none' }} />
          <div style={{ fontSize: 13.5, color: '#065f46' }}>
            <strong>{`Report submitted${report.createdAt ? ' on ' + report.createdAt : ''}.`}</strong> This milestone has been audited and cannot be audited again.
          </div>
          <Link to={`/expert-audit-preview?id=${req.id}`} style={{ marginLeft: 'auto', fontSize: 12.5, color: '#047857', textDecoration: 'underline', textUnderlineOffset: 2, whiteSpace: 'nowrap' }}>Back to milestones</Link>
        </div>
      ) : ''}

      {/* Verdict Banner */}
      <div className={`verdict-banner ${vPass ? 'verdict-approved' : 'verdict-rejected'}`} style={{ marginBottom: 24 }}>
        <div className="verdict-icon-wrap">
          <Icon name={vPass ? 'check-circle-2' : 'x-circle'} style={{ width: 22, height: 22, color: '#fff' }} />
        </div>
        <div>
          <div className="verdict-label">{verdictWord}</div>
          <div className="verdict-text">{vPass ? 'This deliverable meets all quality standards and has been approved.' : 'This deliverable does not meet quality standards and needs revision.'}</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left column */}
        <div>
          {/* Quality Scores */}
          <div style={CARD_STYLE}>
            <h3 style={{ ...H3_ICON_STYLE, marginBottom: 20 }}>
              <Icon name="bar-chart-2" style={{ width: 16, height: 16, color: '#6366f1' }} /> Quality Scores
            </h3>
            <ScoreBar label="Code Quality" val={report.codequality} />
            <ScoreBar label="Security" val={report.security} />
            <ScoreBar label="Performance" val={report.performance} />
            <ScoreBar label="Documentation" val={report.documentation} />
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>Overall Average</span>
              <span style={{ fontSize: 18, fontWeight: 700, color: '#6366f1' }}>{`${average}/5`}</span>
            </div>
          </div>

          {/* Expert Signature */}
          <div className="expert-sig">
            <div className="expert-avatar">{expertInitials}</div>
            <div className="expert-name">{expertName}</div>
            <div className="expert-role">Technical Expert Reviewer</div>
            <div style={{ fontSize: 12, color: '#7c3aed', marginTop: 8 }}>{`Report submitted on ${report.createdAt || 'N/A'}`}</div>
          </div>
        </div>

        {/* Right column */}
        <div>
          {/* Technical Findings */}
          <div style={CARD_STYLE}>
            <h3 style={H3_ICON_STYLE}>
              <Icon name="file-text" style={{ width: 16, height: 16, color: '#6366f1' }} /> Technical Findings
            </h3>
            <div className="summary-box" style={{ minHeight: 120, whiteSpace: 'pre-wrap' }}>{report.findings || 'No findings recorded.'}</div>
          </div>

          {/* Report Details */}
          <div style={CARD_STYLE}>
            <h3 style={H3_ICON_STYLE}>
              <Icon name="info" style={{ width: 16, height: 16, color: '#6366f1' }} /> Report Details
            </h3>
            <div className="info-grid">
              <div className="info-cell">
                <span className="info-label">Report ID</span>
                {' '}
                <span className="info-value mono">{report.id}</span>
              </div>
              <div className="info-cell">
                <span className="info-label">Audit Request</span>
                {' '}
                <span className="info-value mono">{report.auditRequestId}</span>
              </div>
              <InfoCell label="Verdict"><span className={`badge ${vPass ? 'badge-green' : 'badge-red'}`}>{verdictWord}</span></InfoCell>
              <InfoCell label="Date">{report.createdAt || 'N/A'}</InfoCell>
            </div>
          </div>

          {/* Print Button */}
          <button onClick={downloadReport} className="btn-print" style={{ width: '100%', marginBottom: 10 }}>
            <Icon name="download" style={{ width: 15, height: 15 }} /> Download PDF
          </button>
          <button onClick={() => window.print()} className="btn-print" style={{ width: '100%', background: 'var(--card)', color: 'var(--foreground)', border: '1px solid var(--border)' }}>
            <Icon name="printer" style={{ width: 15, height: 15 }} /> Print Report
          </button>
        </div>
      </div>
    </>
  );
}

/** Loads the engagement, its milestone and any report already filed for it. */
function loadAudit(Store, searchParams, session) {
  const auditId = searchParams.get('id') || searchParams.get('reportId');

  // Only the engagement in the link — a fallback to "the first one" opened
  // somebody else's audit under this page's title.
  const req = auditId ? Store.getAuditRequestById(auditId) : null;
  if (!req) return null;

  // One engagement covers every milestone on the project, so the milestone
  // has to come from the URL. Keyed on the engagement alone, this page
  // loaded the first report filed under it — which meant opening milestone
  // two showed milestone one's answers already filled in, and locked the
  // form for a milestone that had never been audited.
  const milestoneId = searchParams.get('milestoneId') || req.milestoneId || null;
  const milestone = milestoneId ? Store.getMilestoneById(milestoneId) : null;
  return {
    req,
    task: Store.getTaskById(req.taskId),
    worker: Store.getUserById(req.workerId),
    milestoneId,
    milestone,
    existingReport: Store.getAuditReportByRequest(req.id, milestoneId),
    work: milestone ? milestone.deliverable : null,
  };
}

export default function ExpertReportAudit() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Technical Audit Report — Lannent');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [session] = useState(() => Auth.getCurrentUser());
  // The layout follows who is signed in. It preferred `?role=` over the
  // session, so a link with the wrong value without the parameter (the worker sidebar's "Reports")
  // drew another role's sidebar — whose Settings link then bounced the user
  // to their dashboard.
  const role = session?.role || searchParams.get('role') || 'expert';
  const [data] = useState(() => loadAudit(Store, searchParams, session));

  // ── Form state (only used by the assigned expert's scoring form) ──
  const [checklist, setChecklist] = useState(INITIAL_CHECKLIST);
  const [scores, setScores] = useState(() => {
    const r = data && data.existingReport;
    // Pre-populate if report exists
    return (r && r.verdict)
      ? { codequality: r.codequality || 0, security: r.security || 0, performance: r.performance || 0, documentation: r.documentation || 0 }
      : { codequality: 0, security: 0, performance: 0, documentation: 0 };
  });
  const [verdict, setVerdictState] = useState(() => (data && data.existingReport && data.existingReport.verdict) || null);
  const [hoverStar, setHoverStar] = useState(null);           // { cat, n } while the pointer is over a star
  const [findingsErr, setFindingsErr] = useState({ text: '', show: false });
  const [findingsBorder, setFindingsBorder] = useState(null);  // set after the first submit attempt
  const [verdictErr, setVerdictErr] = useState({ text: '', show: false });
  const findingsRef = useRef(null);

  if (!data) {
    return (
      <EmptyState
        role={role}
        activePath={role === 'expert' ? '/expert-audit-requests' : '/milestone-reports'}
        pageTitle="Audit Report"
        message="This audit could not be found, or you are not part of it."
        linkHref={role === 'expert' ? '/expert-audit-requests' : '/milestone-reports'}
        linkLabel="Back"
      />
    );
  }

  const { req, task, worker, milestoneId, milestone, existingReport, work } = data;

  // Only the assigned reviewer may score an audit. Clients and workers are
  // allowed on this page to READ the report about their own project — they
  // were previously handed the full scoring form and a live Submit button.
  // The reviewer assigned to THIS engagement — not any expert who opens the link.
  const isReviewer = !!session && session.role === 'expert' && req.expertId === session.userId;
  if (req.kind === 'dispute-audit') {
    return (
      <EmptyState role={role} activePath={role === 'expert' ? '/expert-dispute-cases' : '/milestone-reports'} pageTitle="Audit Report"
                  message="This engagement is a dispute review. It is settled by the verdict on the dispute, not by an audit report."
                  linkHref={req.disputeId ? `/expert-report-dispute?id=${req.disputeId}` : '/milestone-reports'} linkLabel="View the dispute" />
    );
  }
  const hasReport = !!(existingReport && existingReport.verdict);
  // 'paid' is the settled state in the engagement lifecycle ('Completed' is legacy).
  const isSettled = req.status === 'paid' || req.status === 'Completed';
  const isCompleted = isSettled || hasReport || !isReviewer;
  const awaitingReview = !hasReport && !isReviewer;

  // ── Actions ────────────────────────────────────────────────
  const toggleCheck = (id, passed) => {
    setChecklist(list => list.map(c => c.id === id ? { ...c, passed: c.passed === passed ? null : passed } : c));
  };

  const setScore = (cat, val) => {
    if (isCompleted) return;
    setScores(s => ({ ...s, [cat]: val }));
  };

  const setVerdict = v => {
    if (isCompleted) return;
    setVerdictState(v);
    setVerdictErr(e => ({ ...e, show: false }));
  };

  /** Style of the Pass / Fail buttons; colours are only applied once a verdict is picked. */
  const verdictButtonStyle = (v, onBorder, onBg, onColor) => {
    const base = { flex: 1, padding: 10, borderRadius: 10, border: '2px solid var(--border)', background: 'white', fontWeight: 600, fontSize: 13, cursor: 'pointer', color: 'var(--foreground)' };
    if (!verdict) return base;
    const on = verdict === v;
    return { ...base, background: on ? onBg : 'white', color: on ? onColor : 'var(--foreground)', borderColor: on ? onBorder : 'var(--border)' };
  };

  const submitAuditReport = () => {
    const findings = findingsRef.current?.value?.trim() || '';
    let valid = true;

    // Validate findings
    // The report is what pays the reviewer, so the server asks for 50+ characters.
    if (!findings || findings.length < 50) {
      setFindingsErr({ text: 'Findings must be at least 50 characters.', show: true });
      setFindingsBorder('#ef4444');
      valid = false;
    } else {
      setFindingsErr(e => ({ ...e, show: false }));
      setFindingsBorder('var(--border)');
    }

    // Validate verdict
    if (!verdict) {
      setVerdictErr({ text: 'Please select a verdict (Pass or Fail).', show: true });
      valid = false;
    } else {
      setVerdictErr(e => ({ ...e, show: false }));
    }

    // Validate checklist — at least 3 items reviewed
    const reviewed = checklist.filter(c => c.passed !== null).length;
    if (reviewed < 3) {
      Validate.toast('Please review at least 3 checklist items before submitting.', 'error');
      valid = false;
    }

    if (!valid) return;

    // Save to Store
    try {
      Store.saveAuditReport({
        auditRequestId: req.id,
        taskId: req.taskId,
        milestoneId: milestoneId,
        expertId: session.userId,
        verdict,
        overall: verdict === 'pass' ? 'Pass' : 'Fail',
        findings,
        codequality: scores.codequality,
        security: scores.security,
        performance: scores.performance,
        documentation: scores.documentation,
        createdAt: new Date().toISOString().slice(0, 10),
        milestoneTitle: milestone ? milestone.title : req.milestone,
        projectTitle: req.project || (task ? task.title : ''),
        workerName: req.worker || (worker ? worker.name : ''),
      });

      // Filing the report is what moves the engagement on (and pays the
      // reviewer). The PATCH that followed set `expertId` from the browser —
      // the hole that let a reviewer write themselves onto any engagement.

      // Note: Expert audit report does not change milestone status - that's for client approval or dispute resolution only

      // The server notifies the client and the worker.
      Validate.toast(`Audit report submitted. Verdict: ${verdict === 'pass' ? 'PASS' : 'FAIL'}`, verdict === 'pass' ? 'success' : 'error');
      setTimeout(() => { navigate('/expert-audit-requests'); }, 2000);
    } catch (e) {
      Validate.toast('Error saving report: ' + e.message, 'error');
    }
  };

  // ── Content for the current state ──
  const backHref = isReviewer ? '/expert-audit-requests' : '/milestone-reports';
  const backText = isReviewer ? '← Back to Audit Requests' : '← Back to Reports';
  let body;

  if (isCompleted && hasReport) {
    // ── COMPLETED: Read-only report view ──
    body = <ReportView report={existingReport} req={req} isReviewer={isReviewer} />;
  } else if (isCompleted && awaitingReview) {
    // No report yet. For the client or worker that means the reviewer
    // has not filed one — not that the audit is finished.
    body = (
      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
        <Icon name="clock" style={bigIconStyle('var(--muted-foreground)')} />
        <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Audit in progress</div>
        <div style={{ fontSize: 14, color: 'var(--muted-foreground)' }}>
          The Expert Reviewer has not filed a report for this project yet. It will appear here once they do.
        </div>
        <Link to={backHref} style={bigButtonStyle('var(--foreground)', 'var(--background)')}>{backText}</Link>
      </div>
    );
  } else if (isCompleted) {
    body = (
      <div style={{ background: '#d1fae5', border: '1px solid #6ee7b7', borderRadius: 14, padding: 24, textAlign: 'center' }}>
        <Icon name="check-circle-2" style={bigIconStyle('#065f46')} />
        <div style={{ fontSize: 16, fontWeight: 600, color: '#065f46', marginBottom: 6 }}>Audit Completed</div>
        <div style={{ fontSize: 14, color: '#047857' }}>This audit request has been completed. Report data is not available.</div>
        <Link to={backHref} style={bigButtonStyle('#065f46', '#fff')}>{backText}</Link>
      </div>
    );
  } else if (!work) {
    // ── Nothing submitted yet: there is no work to score. ──
    body = (
      <>
        <DeliverableCard milestone={milestone} work={work} />
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, textAlign: 'center' }}>
          <Icon name="clock" style={bigIconStyle('var(--muted-foreground)')} />
          <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nothing to audit yet</div>
          <div style={{ fontSize: 14, color: 'var(--muted-foreground)', maxWidth: 440, margin: '0 auto' }}>
            {`${milestone ? milestone.title + ' has not been submitted by the worker.' : 'No milestone is attached to this engagement.'} You can file a report once the deliverable arrives.`}
          </div>
          <Link to={`/expert-audit-preview?id=${req.id}`} style={bigButtonStyle('var(--foreground)', 'var(--background)')}>← Back to milestones</Link>
        </div>
      </>
    );
  } else {
    // ── NOT COMPLETED: Show editable form ──
    body = (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Left: Deliverable info + checklist */}
        <div>
          <DeliverableCard milestone={milestone} work={work} />

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quality Checklist</h3>
            <div id="checklistContainer">
              {checklist.map(item => (
                <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 12, borderRadius: 10, background: 'var(--secondary)', marginBottom: 8 }}>
                  <button onClick={() => toggleCheck(item.id, true)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: item.passed === true ? '#10b981' : '#e5e7eb', color: item.passed === true ? 'white' : '#9ca3af', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>✓</button>
                  <button onClick={() => toggleCheck(item.id, false)} style={{ width: 28, height: 28, borderRadius: 7, border: 'none', background: item.passed === false ? '#ef4444' : '#e5e7eb', color: item.passed === false ? 'white' : '#9ca3af', cursor: 'pointer', fontSize: 14, transition: 'all 0.15s' }}>✗</button>
                  <span style={{ flex: 1, fontSize: 13, fontWeight: 500, ...(item.passed === false ? { textDecoration: 'line-through', color: 'var(--muted-foreground)' } : {}) }}>{item.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 500, color: item.passed === true ? '#10b981' : item.passed === false ? '#ef4444' : '#9ca3af' }}>{item.passed === true ? 'Pass' : item.passed === false ? 'Fail' : '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Scores + findings + submit */}
        <div>
          <div style={CARD_STYLE}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 16 }}>Quality Scores</h3>
            {SCORE_CATEGORIES.map(cat => {
              // Hovering previews a score; leaving repaints the committed one.
              const shown = hoverStar && hoverStar.cat === cat ? hoverStar.n : scores[cat];
              return (
                <div key={cat} style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 6, textTransform: 'capitalize' }}>{cat.replace('codequality', 'Code Quality')}</div>
                  <div id={`stars-${cat}`}>
                    {/* The original joined the stars with whitespace, which spaces them out */}
                    {[1, 2, 3, 4, 5].map(n => (
                      <Fragment key={n}>{n > 1 ? ' ' : null}<span data-star={n}
                            onClick={() => setScore(cat, n)}
                            onMouseEnter={() => setHoverStar({ cat, n })}
                            onMouseLeave={() => setHoverStar(null)}
                            style={{ cursor: 'pointer', fontSize: 24, color: n <= shown ? '#f59e0b' : '#d1d5db', transition: 'color 0.15s' }}>★</span></Fragment>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>

          <div style={CARD_STYLE}>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 12 }}>Findings & Verdict</h3>
            <textarea ref={findingsRef} id="findingsText" rows="5" placeholder="Describe your technical findings, issues found, and overall assessment..."
                      style={{ width: '100%', padding: 12, border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', background: 'var(--input-bg)', ...(findingsBorder ? { borderColor: findingsBorder } : {}) }}></textarea>
            <div id="findingsErr" style={{ ...ERROR_STYLE, display: findingsErr.show ? 'block' : 'none' }}>{findingsErr.text}</div>

            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 10 }}>Verdict</div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button id="verdictPass" onClick={() => setVerdict('pass')} style={verdictButtonStyle('pass', '#10b981', '#d1fae5', '#065f46')}>✓ Pass</button>
                <button id="verdictFail" onClick={() => setVerdict('fail')} style={verdictButtonStyle('fail', '#ef4444', '#fee2e2', '#b91c1c')}>✗ Fail</button>
              </div>
              <div id="verdictErr" style={{ ...ERROR_STYLE, display: verdictErr.show ? 'block' : 'none' }}>{verdictErr.text}</div>
            </div>
          </div>

          <button onClick={submitAuditReport} className="btn-primary" style={{ width: '100%', padding: 14, borderRadius: 12, fontSize: 15, fontWeight: 600 }}>
            Submit Audit Report
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout
        role={role}
        activePath={role === 'worker' ? '/worker-milestone-board' : role === 'client' ? '/client-my-projects' : '/expert-audit-requests'}
        pageTitle="Technical Audit Report"
        pageSubtitle={`Audit request for ${req.project || 'project'}`}
      >
        {/* ── Header info (always shown) ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
          <HeaderTile label="Project" value={req.project || (task ? task.title : 'N/A')} icon="folder" iconBg="#eef2ff" iconColor="#6366f1" />
          <HeaderTile label="Milestone" value={req.milestone || (milestone ? milestone.title : 'N/A')} icon="check-square" iconBg="#ecfdf5" iconColor="#10b981" />
          <HeaderTile label="Worker" value={req.worker || (worker ? worker.name : 'N/A')} icon="user" iconBg="#faf5ff" iconColor="#a855f7" />
        </div>
        {body}
      </DashboardLayout>
    </>
  );
}

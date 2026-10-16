/**
 * LANNENT — ExpertReportDispute
 * Converted from front-end/pages/expert-report-dispute.html.
 *
 * Read-only dispute resolution report (?id=<disputeId>&role=expert|client|worker).
 * Falls back to the first resolved dispute when no id is given.
 */
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import { downloadPdf } from '../utils/pdf';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertReportDispute.css?raw';

const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

// Small grey note shown when a list has nothing in it
const NOTE_STYLE = { fontSize: 13, color: 'var(--muted-foreground)', padding: 12 };

/** Builds everything the report shows from the stored dispute. */
function buildReport(Store, rawDispute) {
  const _task = Store.getTaskById(rawDispute.taskId);
  const _raiser = Store.getUserById(rawDispute.raisedBy);
  const _respondent = Store.getUserById(rawDispute.againstId);
  const _expert = rawDispute.expertId ? Store.getUserById(rawDispute.expertId) : null;

  // Severity is set on the audit engagement the dispute opened.
  const _engagement = (Store.getAuditRequests() || []).filter(a => a.disputeId === rawDispute.id && !a.replacedBy).pop();
  const _severity = _engagement ? _engagement.severity : 'Medium';

  // What the reviewer actually examines: the claim, and the disputed
  // milestone's submission.
  const _milestone = rawDispute.milestoneId ? Store.getMilestoneById(rawDispute.milestoneId) : null;
  const _deliverable = _milestone ? _milestone.deliverable : null;

  const _evidence = [
    { label: 'The claim', text: [rawDispute.reason, rawDispute.details].filter(Boolean).join(' — ') || 'No reason recorded.' },
  ];
  if (rawDispute.outcome) _evidence.push({ label: 'Outcome requested', text: rawDispute.outcome });
  if (_milestone) {
    _evidence.push({
      label: 'Disputed milestone',
      text: `${_milestone.title} — ₹${Number(_milestone.budget || 0).toLocaleString('en-IN')}, status ${_milestone.status}`,
    });
  }
  if (_deliverable) {
    _evidence.push({
      label: 'Worker submission',
      text: [_deliverable.title, _deliverable.description].filter(Boolean).join(' — ')
            || 'Submitted without a description.',
    });
  } else if (_milestone) {
    _evidence.push({ label: 'Worker submission', text: 'Nothing was submitted for this milestone.' });
  }

  // Real attachments only. There is no file store yet, so a link is all
  // there is to show — inventing a file list would be worse than none.
  const _files = [];
  if (_deliverable && _deliverable.link) {
    _files.push({ name: _deliverable.link, size: 'Submitted link', icon: 'link' });
  }
  if (_deliverable && Array.isArray(_deliverable.files)) {
    _deliverable.files.forEach(f => _files.push({
      name: f.name || String(f), size: f.size || 'Attached file', icon: 'file-text',
    }));
  }

  return {
    reportId: 'DSP-' + rawDispute.id.toUpperCase(),
    type: 'Dispute Resolution',
    project: rawDispute.project || (_task ? _task.title : 'Unknown'),
    milestone: rawDispute.milestone || 'Milestone',
    issue: rawDispute.reason ? rawDispute.reason.substring(0, 80) : 'Dispute',
    generatedDate: rawDispute.resolvedAt ? fmtDate(rawDispute.resolvedAt) : 'Recently',
    status: rawDispute.status === 'resolved' ? 'Published' : 'Draft',
    verdictClass: rawDispute.verdict === 'worker-favour' ? 'verdict-worker' : rawDispute.verdict === 'client-favour' ? 'verdict-client' : 'verdict-pending',
    escrow: rawDispute.amount || '₹0',
    raisedByName: _raiser ? _raiser.name : (rawDispute.raisedByName || 'Unknown'),
    raisedByInitials: _raiser ? _raiser.avatar : '?',
    raisedByColor: _raiser ? _raiser.avatarColor : '#6366f1',
    respondentName: _respondent ? _respondent.name : (rawDispute.againstName || 'Unknown'),
    respondentInitials: _respondent ? _respondent.avatar : '?',
    respondentColor: _respondent ? _respondent.avatarColor : '#10b981',
    expertName: _expert ? _expert.name : 'Expert Reviewer',
    expertInitials: _expert ? _expert.avatar : 'ER',
    expertTitle: _expert ? (_expert.jobTitle || 'Expert Reviewer') : 'Expert Reviewer',
    resolution: rawDispute.resolution || 'Resolution pending.',
    decision: rawDispute.verdict === 'worker-favour' ? 'In Favour of Worker — milestone paid'
            : rawDispute.verdict === 'client-favour' ? 'In Favour of Client — milestone sent back to the worker'
            : 'Pending Review',
    overridden: !!rawDispute.overriddenBy,
    verdictRaw: rawDispute.verdict || null,
    reviewerFee: _engagement && _engagement.agreedAmount ? `₹${Number(_engagement.agreedAmount).toLocaleString('en-IN')}` : null,
    verdictIcon: rawDispute.verdict === 'worker-favour' ? 'check-circle'
               : rawDispute.verdict === 'client-favour' ? 'user-check'
               : 'clock',
    // Severity lives on the audit engagement the dispute opened, not on the
    // dispute itself.
    severity: _severity,
    severityClass: _severity === 'High' ? 'sev-high' : _severity === 'Low' ? 'sev-low' : 'sev-medium',
    caseId: '#DIS-' + (rawDispute.id || '0000').toString().toUpperCase(),
    raisedDate: rawDispute.createdAt ? fmtDate(rawDispute.createdAt) : 'N/A',
    raisedBy: _raiser ? (_raiser.role === 'worker' ? 'Gig Worker' : 'Client') : 'User',
    respondent: _respondent ? (_respondent.role === 'worker' ? 'Gig Worker' : 'Client') : 'User',
    disputeDescription: rawDispute.details || rawDispute.reason || 'No description provided for this dispute.',
    // The evidence is the disputed milestone itself — the claim, and what
    // the worker actually submitted.
    evidenceReviewed: _evidence,
    // The reviewer's own words, or an honest gap. It used to invent a
    // paragraph of analysis for every unresolved case.
    expertAnalysis: rawDispute.resolution || null,
    files: _files,
    timeline: [
      { dot: 'blue', time: rawDispute.createdAt ? fmtDate(rawDispute.createdAt) : '—', text: 'Dispute raised', sub: _expert ? `Escrow frozen. Assigned to ${_expert.name}.` : 'Escrow frozen. Awaiting a reviewer.' },
      { dot: 'purple', time: rawDispute.resolvedAt ? fmtDate(rawDispute.resolvedAt) : '—', text: 'Expert reviewed case', sub: rawDispute.resolvedAt ? 'Deliverable and dispute details reviewed.' : 'Not yet reviewed.' },
      { dot: 'green', time: rawDispute.resolvedAt ? fmtDate(rawDispute.resolvedAt) : '—', text: 'Verdict issued', sub: rawDispute.resolution ? rawDispute.resolution.substring(0, 80) + '...' : 'Resolution issued.' },
    ],
  };
}

/** Header of a report card: coloured icon square + title (+ optional extra). */
function CardHead({ icon, iconBg, iconColor, title, children }) {
  return (
    <div className="rc-head">
      <div className="rc-head-icon" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 15, height: 15, color: iconColor }} />
      </div>
      <span className="rc-head-title">{title}</span>
      {children}
    </div>
  );
}

/** One label/value row in the "Report Details" card. */
function InfoCell({ label, children }) {
  return (
    <div className="info-cell">
      <span className="info-label">{label}</span>
      {' '}
      {children}
    </div>
  );
}

/** One person in the "Parties Involved" card. */
function PartyCard({ color, initials, name, role, tag, tagClass }) {
  return (
    <div className="party-card">
      <div className="party-avatar" style={{ background: color }}>{initials}</div>
      <div>
        <div className="party-name">{name}</div>
        <div className="party-role">{role}</div>
      </div>
      <span className={'party-tag ' + tagClass}>{tag}</span>
    </div>
  );
}

export default function ExpertReportDispute() {
  const Store = useStore();
  const Auth = useAuth();
  usePageTitle('Dispute Resolution Report — Lannent');
  const [searchParams] = useSearchParams();
  const rid = searchParams.get('id') || searchParams.get('disputeId') || '';
  // The layout follows who is signed in. It came from `?role=`, defaulting
  // to expert, so a link without the parameter (the worker sidebar's "Reports")
  // drew another role's sidebar — whose Settings link then bounced the user
  // to their dashboard.
  const role = Auth.getCurrentUser()?.role || searchParams.get('role') || 'expert';

  // Only the dispute in the link — falling back to "some resolved dispute"
  // showed a stranger's case under the wrong title.
  const [r] = useState(() => {
    const rawDispute = rid ? Store.getDisputeById(rid) : null;
    return rawDispute ? buildReport(Store, rawDispute) : null;
  });

  function downloadReport() {
    downloadPdf(`dispute-report-${rid}.pdf`, {
      title: 'Dispute Resolution Report',
      subtitle: `${r.project} — ${r.milestone}`,
      meta: `${r.caseId} · raised ${r.raisedDate}${r.status === 'Published' ? ` · resolved ${r.generatedDate}` : ' · not yet resolved'}`,
      sections: [
        { heading: 'Case', rows: [
          ['Status', r.status === 'Published' ? 'Resolved' : 'Open'],
          ['Decision', r.decision + (r.overridden ? ' (operations override)' : '')],
          ['Escrow in question', r.escrow],
          ['Severity', r.severity],
          ['Raised by', `${r.raisedByName} (${r.raisedBy})`],
          ['Against', `${r.respondentName} (${r.respondent})`],
          ['Expert Reviewer', r.expertName],
          ...(r.reviewerFee ? [['Reviewer fee', r.reviewerFee]] : []),
        ] },
        { heading: 'Dispute', text: r.disputeDescription },
        { heading: 'Evidence reviewed', rows: r.evidenceReviewed.map(e => [e.label, e.text]) },
        ...(r.files.length ? [{ heading: 'Submitted files and links', bullets: r.files.map(f => f.name) }] : []),
        { heading: 'Expert analysis and resolution', text: r.expertAnalysis || 'The reviewer has not given a verdict yet.' },
      ],
    });
  }

  if (!r) {
    return (
      <EmptyState
        role={role}
        activePath={role === 'expert' ? '/expert-dispute-cases' : '/milestone-reports'}
        pageTitle="Dispute Report"
        message={rid ? 'This dispute could not be found, or you are not part of it.' : 'No dispute was selected.'}
        linkHref={role === 'expert' ? '/expert-dispute-cases' : '/milestone-reports'}
        linkLabel="Back"
      />
    );
  }

  const paragraphs = (r.expertAnalysis || '').split('\n\n').filter(p => p.trim());

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout
        role={role}
        activePath={role === 'worker' ? '/worker-milestone-board' : role === 'client' ? '/client-my-projects' : '/expert-reports'}
        pageTitle="Dispute Resolution Report"
        pageSubtitle={`${r.reportId} · ${r.project}`}
      >
        {/* Back link */}
        <div style={{ marginBottom: 16 }}>
          <Link to={role === 'expert' ? '/expert-reports' : '/milestone-reports?role=' + role} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--muted-foreground)', transition: 'color 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.color = 'var(--foreground)'; }} onMouseLeave={e => { e.currentTarget.style.color = 'var(--muted-foreground)'; }}>
            <Icon name="arrow-left" style={{ width: 16, height: 16 }} /> Back to Reports
          </Link>
        </div>

        {/* Report Header */}
        <div className="report-header">
          <div className="report-id-badge">
            <Icon name="scale" style={{ width: 12, height: 12 }} />{` ${r.reportId}`}
          </div>
          <div className="report-title-main">{`${r.type} Report`}</div>
          <div className="report-subtitle">{`${r.project} · ${r.milestone}`}</div>
          <div className="report-meta-row">
            {[['Case ID', r.caseId], ['Issue', r.issue], ['Date Raised', r.raisedDate], ['Report Date', r.generatedDate], ['Escrow', r.escrow]].map(([label, value]) => (
              <div className="report-meta-item" key={label}>
                <span className="report-meta-label">{label}</span>
                {' '}
                <span className="report-meta-value">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Verdict Banner */}
        <div className={`verdict-banner ${r.verdictClass}`}>
          <div className="verdict-icon-wrap">
            <Icon name={r.verdictIcon} style={{ width: 22, height: 22, color: 'white' }} />
          </div>
          <div>
            <div className="verdict-label">Expert Verdict</div>
            <div className="verdict-text">{r.decision}</div>
          </div>
          <div style={{ marginLeft: 'auto' }}>
            <span className={`sev-badge ${r.severityClass}`}>
              <Icon name="alert-triangle" style={{ width: 11, height: 11 }} />{` ${r.severity.charAt(0).toUpperCase() + r.severity.slice(1)} Severity`}
            </span>
          </div>
        </div>

        <div className="report-layout">
          {/* ═══ LEFT COLUMN ═══ */}
          <div>

            {/* Parties Involved */}
            <div className="rc">
              <CardHead icon="users" iconBg="#faf5ff" iconColor="#a855f7" title="Parties Involved" />
              <div className="rc-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PartyCard color={r.raisedByColor} initials={r.raisedByInitials} name={r.raisedByName} role={r.raisedBy} tag="Dispute Raiser" tagClass="tag-raiser" />
                <PartyCard color={r.respondentColor} initials={r.respondentInitials} name={r.respondentName} role={r.respondent} tag="Respondent" tagClass="tag-respondent" />
              </div>
            </div>

            {/* Dispute Description */}
            <div className="rc">
              <CardHead icon="alert-circle" iconBg="#fee2e2" iconColor="#ef4444" title="Dispute Description" />
              <div className="rc-body">
                <div className="summary-box">{r.disputeDescription}</div>
              </div>
            </div>

            {/* Evidence Reviewed */}
            <div className="rc">
              <CardHead icon="search" iconBg="#eff6ff" iconColor="#3b82f6" title="Evidence Reviewed">
                {' '}
                <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--muted-foreground)' }}>{`${r.evidenceReviewed.length} item${r.evidenceReviewed.length !== 1 ? 's' : ''}`}</span>
              </CardHead>
              <div className="rc-body">
                {r.evidenceReviewed.length
                  ? r.evidenceReviewed.map((e, i) => (
                    <div className="evidence-quote" key={i}>
                      <div className="evidence-label">{e.label}</div>
                      {e.text}
                    </div>
                  ))
                  : <div style={NOTE_STYLE}>No specific evidence items recorded.</div>}
              </div>
            </div>

            {/* Expert Analysis */}
            <div className="rc">
              <CardHead icon="scale" iconBg="#fafaf9" iconColor="#78716c" title="Expert Analysis & Reasoning" />
              <div className="rc-body">
                <div className="summary-box">
                  {paragraphs.length
                    ? paragraphs.map((p, i) => <p key={i} style={{ marginBottom: 12 }}>{p}</p>)
                    : <p style={{ color: 'var(--muted-foreground)' }}>No detailed analysis recorded.</p>}
                </div>
              </div>
            </div>

            {/* Case Timeline */}
            <div className="rc">
              <CardHead icon="clock" iconBg="#ecfdf5" iconColor="#10b981" title="Case Timeline" />
              <div className="rc-body">
                <div className="timeline">
                  {r.timeline.map((t, i) => (
                    <div className="tl-item" key={i}>
                      <div className={`tl-dot ${t.dot}`}></div>
                      <div className="tl-time">{t.time}</div>
                      <div className="tl-text">{t.text}</div>
                      <div className="tl-sub">{t.sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Resolution & Next Steps */}
            <div className="rc">
              <CardHead icon="check-square" iconBg="#fffbeb" iconColor="#f59e0b" title="Resolution & Next Steps" />
              <div className="rc-body">
                <div className="summary-box">{r.resolution}</div>
              </div>
            </div>

            {/* Reviewed Files */}
            <div className="rc">
              <CardHead icon="folder" iconBg="#f3f4f6" iconColor="#6b7280" title="Evidence Files Reviewed" />
              <div className="rc-body">
                {r.files.length
                  ? r.files.map((f, i) => (
                    <div className="file-row" key={i}>
                      <div className="file-icon-wrap" style={{ background: f.iconBg || '#f3f4f6' }}>
                        <Icon name={f.icon || 'file'} style={{ width: 16, height: 16, color: f.iconColor || '#6b7280' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="file-name">{f.name}</div>
                        <div className="file-size">{f.size}</div>
                      </div>
                      {/^https?:\/\//.test(f.name) ? (
                        <a className="btn-act" style={{ width: 'auto', padding: '5px 12px', fontSize: 12, marginBottom: 0, textDecoration: 'none' }} href={f.name} target="_blank" rel="noopener noreferrer">
                          <Icon name="external-link" style={{ width: 12, height: 12 }} /> Open
                        </a>
                      ) : ''}
                    </div>
                  ))
                  : <div style={NOTE_STYLE}>The worker submitted no files or links for the disputed milestone.</div>}
              </div>
            </div>

          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div style={{ position: 'sticky', top: 80 }}>

            {/* Expert Signature */}
            <div className="expert-sig" style={{ marginBottom: 16 }}>
              <div className="expert-avatar">{r.expertInitials}</div>
              <div className="expert-name">{r.expertName}</div>
              <div className="expert-role">{r.expertTitle}</div>
              <hr className="section-divider" />
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#78716c', marginBottom: 6 }}>Final Verdict</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#1c1917' }}>{r.decision}</div>
            </div>

            {/* Report Details */}
            <div className="rc" style={{ marginBottom: 16 }}>
              <CardHead icon="info" iconBg="#f3f4f6" iconColor="#6b7280" title="Report Details" />
              <div className="rc-body">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <InfoCell label="Report ID"><span className="info-value mono">{r.reportId}</span></InfoCell>
                  <InfoCell label="Case ID"><span className="info-value mono">{r.caseId}</span></InfoCell>
                  <InfoCell label="Project"><span className="info-value">{r.project}</span></InfoCell>
                  <InfoCell label="Milestone"><span className="info-value">{r.milestone}</span></InfoCell>
                  <InfoCell label="Escrow Amount"><span className="info-value" style={{ color: '#10b981', fontWeight: 700 }}>{r.escrow}</span></InfoCell>
                  <InfoCell label="Status">
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '3px 10px', borderRadius: 9999, fontSize: 11, fontWeight: 600,
                      ...(r.status === 'Published'
                        ? { background: '#dbeafe', border: '1px solid #93c5fd', color: '#1d4ed8' }
                        : { background: '#f3f4f6', border: '1px solid #d1d5db', color: '#4b5563' }),
                    }}>{r.status}</span>
                  </InfoCell>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div>
              <button className="btn-act" onClick={() => window.print()}>
                <Icon name="printer" style={{ width: 14, height: 14 }} /> Print Report
              </button>
              {' '}
              <button className="btn-act" onClick={downloadReport}>
                <Icon name="download" style={{ width: 14, height: 14 }} /> Download PDF
              </button>
            </div>

          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

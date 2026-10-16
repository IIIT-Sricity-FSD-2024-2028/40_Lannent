/**
 * LANNENT — ResolveDispute
 * Converted from front-end/pages/resolve-dispute.html.
 *
 * The expert reviews a dispute (?id=<disputeId>) — the case, the disputed
 * submission, the parties and the timeline — and issues a binding verdict.
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
import pageCss from './ResolveDispute.css?raw';

const safeUrl = u => /^https?:\/\//i.test(String(u || '')) ? String(u) : '';
const fmtDate = v => new Date(v).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

const SEV_CLASS = { 'high': 'high', 'medium': 'medium', 'low': 'low' };
const STATUS_CLASS = { 'Open': 'spill-open', 'Resolved': 'spill-resolved', 'Under Investigation': 'spill-invest' };
const SMALL_LABEL = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--muted-foreground)', marginBottom: 6 };
const MUTED_P = { fontSize: 13.5, color: 'var(--muted-foreground)' };

/** Builds the `d` object the page renders from the stored dispute. */
function buildCase(Store, raw) {
  const task = Store.getTaskById(raw.taskId);
  const raiser = Store.getUserById(raw.raisedBy);
  const respondent = Store.getUserById(raw.againstId);

  // The work under dispute. A reviewer was being asked to decide the case
  // without ever seeing what the worker actually delivered — the files,
  // the repository, the notes — none of it reached this page.
  const disputedMilestone = raw.milestoneId ? Store.getMilestoneById(raw.milestoneId) : null;
  const disputedWork = disputedMilestone ? disputedMilestone.deliverable : null;
  const raised = raw.createdAt ? fmtDate(raw.createdAt) : null;

  return {
    raw,
    disputedMilestone,
    disputedWork,
    project: raw.project || (task ? task.title : 'Unknown Project'),
    milestone: raw.milestone || (disputedMilestone ? disputedMilestone.title : 'Milestone'),
    caseId: raw.id,
    issue: raw.reason || 'Dispute',
    description: raw.details || raw.reason || 'No description provided.',
    outcome: raw.outcome || '',
    status: raw.status === 'open' ? 'Open' : raw.status === 'resolved' ? 'Resolved' : raw.status === 'withdrawn' ? 'Withdrawn' : raw.status === 'expired' ? 'Expired' : 'Under Investigation',
    severity: raw.severity || 'medium',
    escrow: raw.amount || '₹0',
    raisedDate: raised || 'Recently',
    raisedBy: raiser ? raiser.role.charAt(0).toUpperCase() + raiser.role.slice(1) : 'User',
    raisedByName: raiser ? raiser.name : (raw.raisedByName || 'Unknown'),
    raisedByInitials: raiser ? raiser.avatar : '?',
    raisedByColor: raiser ? raiser.avatarColor : '#6366f1',
    respondent: respondent ? respondent.role.charAt(0).toUpperCase() + respondent.role.slice(1) : 'User',
    respondentName: respondent ? respondent.name : (raw.againstName || 'Unknown'),
    respondentInitials: respondent ? respondent.avatar : '?',
    respondentColor: respondent ? respondent.avatarColor : '#10b981',
    // Built from the records themselves — every step that actually happened.
    timeline: [
      task && task.createdAt ? { dot: 'blue', time: fmtDate(task.createdAt), text: 'Project posted', sub: `Budget ₹${Number(task.budget || 0).toLocaleString('en-IN')} held in escrow.` } : null,
      disputedMilestone && disputedMilestone.submittedAt ? { dot: 'green', time: fmtDate(disputedMilestone.submittedAt), text: 'Work submitted', sub: `${disputedMilestone.title} was handed in for review.` } : null,
      { dot: 'orange', time: raised || '—', text: 'Dispute raised', sub: `${raiser ? raiser.name : raw.raisedByName || 'A party'} raised it; the milestone's escrow is frozen.` },
    ].filter(Boolean),
    // The original never filled this list, so the files card always shows "0 files".
  };
}

/** Header row of a card: coloured icon square, title, optional extras. */
function CardHead({ icon, iconBg, iconColor, title, children }) {
  return (
    <div className="rc-head">
      <div className="rc-head-icon" style={{ background: iconBg }}>
        <Icon name={icon} style={{ width: 16, height: 16, color: iconColor }} />
      </div>
      <span className="rc-head-title">{title}</span>
      {children}
    </div>
  );
}

function InfoCell({ label, valueClass = 'info-value', valueStyle, children }) {
  return (
    <div className="info-cell">
      <span className="info-label">{label}</span>
      {' '}
      <span className={valueClass} style={valueStyle}>{children}</span>
    </div>
  );
}

function PartyRow({ color, initials, name, role, tag, tagClass }) {
  return (
    <div className="party-row">
      <div className="party-avatar" style={{ background: color }}>{initials}</div>
      <div>
        <div className="party-name">{name}</div>
        <div className="party-role">{role}</div>
      </div>
      <span className={'party-tag ' + tagClass}>{tag}</span>
    </div>
  );
}

function VerdictOption({ id, value, selected, onSelect, title, desc }) {
  return (
    <div className={'verdict-option' + (selected === value ? ' selected' : '')} id={id} onClick={() => onSelect(value)}>
      <div className="verdict-radio"><div className="verdict-radio-dot"></div></div>
      <div>
        <div className="verdict-title">{title}</div>
        <div className="verdict-desc">{desc}</div>
      </div>
    </div>
  );
}

/** Body of the "Submitted Deliverable" card. */
function DeliverableBody({ milestone, work }) {
  const Store = useStore();
  if (!milestone) return <p style={MUTED_P}>This dispute is not tied to a specific milestone, so there is no single submission to review.</p>;
  if (!work) return <p style={MUTED_P}>The worker has not submitted a deliverable for <strong>{milestone.title}</strong> yet.</p>;
  return (
    <>
      {work.title ? <><div style={SMALL_LABEL}>Title</div><p style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>{work.title}</p></> : ''}
      {work.description ? <><div style={SMALL_LABEL}>Notes from the worker</div><p style={{ fontSize: 14, lineHeight: 1.65, marginBottom: 14 }}>{work.description}</p></> : ''}
      {safeUrl(work.link) ? (
        <>
          <div style={SMALL_LABEL}>Repository / link</div>
          <a href={safeUrl(work.link)} target="_blank" rel="noopener noreferrer" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#4f46e5', wordBreak: 'break-all', marginBottom: 14 }}>
            <Icon name="git-branch" style={{ width: 14, height: 14, flex: 'none' }} />{work.link}
          </a>
        </>
      ) : ''}
      <div style={SMALL_LABEL}>Files</div>
      {(work.files && work.files.length) ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {work.files.map((f, i) => {
            const name = typeof f === 'string' ? f : (f && f.name) || 'File';
            const href = typeof f === 'object' ? Store.fileUrl(f) : '';
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 10 }}>
                <Icon name="file" style={{ width: 16, height: 16, color: '#6366f1', flex: 'none' }} />
                <span style={{ flex: 1, minWidth: 0, fontSize: 13.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
                {href
                  ? <a href={href} download={name} style={{ fontSize: 12, color: '#4f46e5', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap' }}><Icon name="download" style={{ width: 13, height: 13 }} />Download</a>
                  : <span style={{ fontSize: 11, color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>Not stored</span>}
              </div>
            );
          })}
        </div>
      ) : <p style={MUTED_P}>No files were attached to this submission.</p>}
      {milestone.submittedAt ? <div style={{ marginTop: 14, fontSize: 12.5, color: 'var(--muted-foreground)' }}>{`Submitted ${milestone.submittedAt} · milestone value ₹${milestone.budget}`}</div> : ''}
    </>
  );
}

export default function ResolveDispute() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Resolve Dispute — Lannent');
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const disputeId = searchParams.get('id') || searchParams.get('disputeId');

  // Load real dispute from Store
  // Only the dispute named in the link. Falling back to "the first open
  // dispute" showed one case while the verdict form did nothing.
  const [d] = useState(() => {
    const raw = disputeId ? Store.getDisputeById(disputeId) : null;
    return raw ? buildCase(Store, raw) : null;
  });
  const engagement = d ? Store.getAuditRequests().find(a => a.id === d.raw.auditRequestId) : null;
  const session = Auth.getCurrentUser();
  const isOpen = d && d.raw.status === 'open';
  const isMine = d && d.raw.expertId === session.userId;
  const ready = engagement && engagement.status === 'in-progress';
  const [selectedVerdict, setSelectedVerdict] = useState('');
  const [note, setNote] = useState('');
  const [noteBorder, setNoteBorder] = useState('');            // '' = stylesheet default
  const [noteErr, setNoteErr] = useState({ text: '', show: false });

  if (!d) {
    return (
      <EmptyState role="expert" activePath="/expert-dispute-cases" pageTitle="Resolve Dispute"
                  message={disputeId ? 'This dispute could not be found, or it is not assigned to you.' : 'No dispute was selected.'}
                  linkHref="/expert-dispute-cases" linkLabel="Go to Dispute Cases" />
    );
  }
  const { disputedMilestone, disputedWork } = d;

  /* submit */
  const submitVerdict = () => {
    const trimmed = note.trim();
    let valid = true;

    // Validate verdict selection
    if (!selectedVerdict) {
      Validate.toast('Please select a verdict outcome before submitting.', 'error');
      valid = false;
    }

    // Validate resolution notes (min 50 chars for meaningful reasoning)
    if (!trimmed || trimmed.length < 50) {
      setNoteBorder('#ef4444');
      setNoteErr({ text: 'Resolution notes must be at least 50 characters. Provide detailed reasoning.', show: true });
      valid = false;
    } else {
      setNoteBorder('');
      setNoteErr(e => ({ ...e, show: false }));
    }
    if (!valid) return;

    // Map verdict to store format
    const verdictMap = { favour_worker: 'worker-favour', favour_client: 'client-favour' };
    const storeVerdict = verdictMap[selectedVerdict] || selectedVerdict;

    let result;
    try {
      result = Store.resolveDispute(disputeId, { verdict: storeVerdict, resolution: trimmed });
    } catch (e) {
      Validate.toast(e.message, 'error');
      return;
    }

    const fee = result && result.reviewerPayout && result.reviewerPayout.net
      ? ` Your fee of ₹${Number(result.reviewerPayout.net).toFixed(2)} has been paid to your wallet.` : '';
    const workerName = d.raw.raisedBy === disputedMilestone?.workerId ? d.raisedByName : d.respondentName;
    const msgs = {
      favour_worker: `Verdict recorded. ${d.escrow} released to ${workerName}.`,
      favour_client: `Verdict recorded. The milestone goes back to ${workerName}'s To Do list with your notes; its ${d.escrow} stays in escrow.`,
    };
    Validate.toast(msgs[selectedVerdict] + fee, 'success');
    setTimeout(() => { navigate('/expert-dispute-cases'); }, 2800);
  };

  const sevColor = d.severity === 'high' ? '#ef4444' : d.severity === 'medium' ? '#f59e0b' : '#eab308';

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="expert" activePath="/expert-dispute-cases" pageTitle="Resolve Dispute"
                       pageSubtitle={`Case #DIS-${d.caseId} · ${d.project} — ${d.milestone}`}>
        {/* ── What is a dispute? info banner ── */}
        <div className="explain-box">
          <div className="explain-title">
            <Icon name="info" style={{ width: 15, height: 15 }} /> What is a Dispute on Lannent?
          </div>
          <div className="explain-body">
            A dispute is raised by the <strong>Client</strong> when they do not accept a milestone the <strong>Gig Worker</strong> has submitted — for example the deliverable misses quality standards, features are missing, or it does not match the brief. The client pays your fee.
            Once raised, <strong>the milestone's escrow is frozen</strong> and the case comes to you. Your verdict is <strong>binding</strong>:
            <ul>
              <li><strong>In favour of the worker:</strong> the work is accepted and the milestone's escrow is paid to the worker.</li>
              <li><strong>In favour of the client:</strong> the milestone goes back to the worker's To Do list with your notes, exactly like a revision request. Its escrow stays held until the reworked submission is approved.</li>
            </ul>
          </div>
        </div>

        {/* ── Severity alert ── */}
        <div className={`dispute-alert ${SEV_CLASS[d.severity]}`}>
          <Icon name="alert-triangle" style={{ width: 18, height: 18, marginTop: 1, flexShrink: 0, color: sevColor }} />
          <div>
            <div className="dispute-alert-title">{`${d.severity.charAt(0).toUpperCase() + d.severity.slice(1)}-Severity Dispute — Escrow Frozen`}</div>
            <div className="dispute-alert-body">{`Funds of ${d.escrow} are held in escrow and will not be released until a verdict is issued. Review all files and the event timeline before making your decision.`}</div>
          </div>
        </div>

        <div className="resolve-layout">

          {/* ═══ LEFT COLUMN ═══ */}
          <div>

            {/* Case Overview */}
            <div className="rc">
              <CardHead icon="scale" iconBg="#eef2ff" iconColor="#6366f1" title="Case Overview">
                {' '}
                <span className={`spill ${STATUS_CLASS[d.status]}`} style={{ marginLeft: 'auto' }}>{d.status}</span>
              </CardHead>
              <div className="rc-body">
                <div className="info-grid" style={{ marginBottom: 16 }}>
                  <InfoCell label="Project">{d.project}</InfoCell>
                  <InfoCell label="Milestone">{d.milestone}</InfoCell>
                  <InfoCell label="Dispute ID" valueClass="info-value mono">{`#DIS-${d.caseId}`}</InfoCell>
                  <InfoCell label="Date Raised">{d.raisedDate}</InfoCell>
                  <InfoCell label="Issue Type">{d.issue}</InfoCell>
                  <InfoCell label="Escrow Held" valueStyle={{ color: '#10b981', fontWeight: 700 }}>{d.escrow}</InfoCell>
                </div>
                <div style={{ ...SMALL_LABEL, marginBottom: 8 }}>What happened</div>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: 'var(--foreground)' }}>{d.description}</p>
                {d.outcome ? <>
                  <div style={{ ...SMALL_LABEL, marginTop: 14, marginBottom: 8 }}>Outcome requested</div>
                  <p style={{ fontSize: 14, lineHeight: 1.65 }}>{d.outcome}</p>
                </> : null}
              </div>
            </div>

            {/* The work under dispute */}
            <div className="rc">
              <CardHead icon="package" iconBg="#eef2ff" iconColor="#6366f1" title="Submitted Deliverable">
                {disputedMilestone ? <>{' '}<span className="spill" style={{ marginLeft: 'auto', background: '#eef2ff', borderColor: '#c7d2fe', color: '#3730a3' }}>{disputedMilestone.title}</span></> : ''}
              </CardHead>
              <div className="rc-body">
                <DeliverableBody milestone={disputedMilestone} work={disputedWork} />
              </div>
            </div>

            {/* Parties Involved */}
            <div className="rc">
              <CardHead icon="users" iconBg="#ecfdf5" iconColor="#10b981" title="Parties Involved" />
              <div className="rc-body">
                <PartyRow color={d.raisedByColor} initials={d.raisedByInitials} name={d.raisedByName} role={d.raisedBy} tag="Raised Dispute" tagClass="tag-raiser" />
                <PartyRow color={d.respondentColor} initials={d.respondentInitials} name={d.respondentName} role={d.respondent} tag="Respondent" tagClass="tag-respondent" />
              </div>
            </div>

            {/* Event Timeline */}
            <div className="rc">
              <CardHead icon="clock" iconBg="#fff7ed" iconColor="#f59e0b" title="Event Timeline" />
              <div className="rc-body">
                <div className="timeline">
                  {d.timeline.map((t, i) => (
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


          </div>

          {/* ═══ RIGHT COLUMN ═══ */}
          <div>

            {/* Escrow snapshot */}
            <div className="rc">
              <CardHead icon="wallet" iconBg="#ecfdf5" iconColor="#10b981" title="Escrow Status" />
              <div className="rc-body">
                <div className="escrow-bar">
                  <div className="escrow-label">Frozen Amount</div>
                  <div className="escrow-val">{d.escrow}</div>
                  <div className="escrow-sub">Held pending Expert verdict</div>
                </div>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55 }}>
                  Per platform rules, funds are <strong>never released</strong> while a dispute is active. Your verdict either pays them to the worker or keeps them held while the worker reworks the milestone.
                </p>
              </div>
            </div>

            {/* Verdict */}
            <div className="rc">
              <CardHead icon="gavel" iconBg="#eef2ff" iconColor="#6366f1" title="Issue Your Verdict" />
              <div className="rc-body">
                {!isOpen ? (
                  <p style={{ fontSize: 13, lineHeight: 1.55 }}>This dispute has already been resolved. <Link to={`/expert-report-dispute?id=${d.caseId}`}>View the resolution</Link>.</p>
                ) : !isMine ? (
                  <p style={{ fontSize: 13, lineHeight: 1.55 }}>This dispute is assigned to another reviewer.</p>
                ) : !ready ? (
                  <p style={{ fontSize: 13, lineHeight: 1.55 }}>
                    Before you give a verdict, agree your fee, have it funded and accept the engagement.{' '}
                    {engagement ? <Link to={`/expert-audit-preview?id=${engagement.id}`}>Open the fee negotiation</Link> : null}
                  </p>
                ) : <>
                <p style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 14, lineHeight: 1.5 }}>Select a resolution outcome. Your decision is <strong>binding</strong>, moves the milestone's escrow, and pays your fee.</p>

                <VerdictOption id="v1" value="favour_worker" selected={selectedVerdict} onSelect={setSelectedVerdict}
                               title="Rule in favour of Gig Worker" desc={`Work meets requirements. Release ${d.escrow} escrow to worker immediately.`} />
                <VerdictOption id="v2" value="favour_client" selected={selectedVerdict} onSelect={setSelectedVerdict}
                               title="Rule in favour of Client" desc={`Work does not meet requirements. The milestone goes back to the worker's To Do list with your notes; ${d.escrow} stays in escrow.`} />

                <div style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, display: 'block', marginBottom: 6 }}>Resolution Notes <span style={{ color: 'var(--muted-foreground)', fontWeight: 400 }}>(required)</span></label>
                  <textarea id="resolutionNote" className="resolution-note" placeholder="Summarise your findings and reasoning for this verdict. This note is visible to both parties."
                            value={note} style={noteBorder ? { borderColor: noteBorder } : undefined}
                            onChange={e => { setNote(e.target.value); setNoteBorder(e.target.value.trim().length >= 50 ? 'var(--border)' : ''); }}></textarea>
                  <div id="resolutionNoteErr" style={{ fontSize: 12, color: '#ef4444', marginTop: 4, display: noteErr.show ? 'block' : 'none' }}>{noteErr.text}</div>
                </div>

                <div style={{ marginTop: 16 }}>
                  <button className="btn-resolve-confirm" onClick={submitVerdict}>
                    <Icon name="shield-check" style={{ width: 15, height: 15 }} /> Submit Verdict
                  </button>
                  {' '}
                  <Link to="/expert-dispute-cases" className="btn-back">
                    <Icon name="arrow-left" style={{ width: 14, height: 14 }} /> Back to Disputes
                  </Link>
                </div>
                </>}
              </div>
            </div>

          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

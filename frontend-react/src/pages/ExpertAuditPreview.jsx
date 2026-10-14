/**
 * LANNENT — ExpertAuditPreview (Review before accepting)
 * Converted from front-end/pages/expert-audit-preview.html.
 *
 * What an Expert Reviewer sees before taking an audit (?id=<auditRequestId>):
 * the project, the dispute (for dispute audits), the milestones, the people
 * involved and the fee negotiation — quote, accept, start or decline.
 */
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ExpertAuditPreview.css?raw';

const money = n => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// Style of the small "View report" / "Audit this milestone" buttons
const MS_BUTTON_STYLE = { textDecoration: 'none', padding: '6px 12px', borderRadius: 8, fontSize: 12.5, whiteSpace: 'nowrap' };

/**
 * One milestone in the reviewer's list.
 *
 * Three states, and only one of them is a way in:
 *   audited    — the report is filed; open it to read, never to re-file.
 *   submitted  — the worker has handed the work over; this is auditable.
 *   waiting    — nothing submitted yet, so there is nothing to audit.
 */
function MilestoneRow({ m, a, session }) {
  const audited = !!(a.auditProgress && a.auditProgress.auditedMilestoneIds.includes(m.id));
  const submitted = ['submitted', 'review', 'disputed'].includes(m.status) || !!m.deliverable;
  const engaged = a.status === 'in-progress' || a.status === 'paid';
  const mine = session && a.expertId === session.userId;
  const reportUrl = `/expert-report-audit?id=${a.id}&milestoneId=${m.id}`;

  let tag, action = '';
  if (audited) {
    tag = <span className="st" style={{ color: '#047857' }}>✓ Report submitted</span>;
    if (mine) action = <Link to={reportUrl} className="btn-outline" style={MS_BUTTON_STYLE}>View report</Link>;
  } else if (!submitted) {
    tag = <span className="st">Awaiting the worker's submission</span>;
  } else if (engaged && mine) {
    tag = <span className="st" style={{ color: '#b45309' }}>Ready to audit</span>;
    action = <Link to={reportUrl} className="btn-primary" style={MS_BUTTON_STYLE}>Audit this milestone</Link>;
  } else {
    tag = <span className="st">Submitted</span>;
  }

  return (
    <div className="pv-ms" style={audited ? { opacity: 0.72 } : undefined}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600 }}>{m.title}</div>
        <div style={{ color: 'var(--muted-foreground)' }}>{m.description || ''}</div>
        <div style={{ marginTop: 4 }}>{tag}</div>
      </div>
      <div style={{ textAlign: 'right', flex: 'none', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
        <div style={{ fontWeight: 700 }}>{money(m.budget)}</div>
        {action}
      </div>
    </div>
  );
}

/** A small round avatar with initials. */
function PersonAvatar({ background, children }) {
  return (
    <div style={{ width: 40, height: 40, borderRadius: '50%', background, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 13 }}>{children}</div>
  );
}

export default function ExpertAuditPreview() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Review Before Accepting — Lannent');
  const navigate = useNavigate();
  const reload = useRerender();
  const [searchParams] = useSearchParams();
  const arId = searchParams.get('id');
  const [quoteValue, setQuoteValue] = useState('');

  const emptyStateProps = { role: 'expert', activePath: '/expert-audit-requests', pageTitle: 'Review before accepting', linkHref: '/expert-audit-requests', linkLabel: 'Back to Audit Requests' };
  if (!arId) return <PageWithStyle><EmptyState {...emptyStateProps} message="No audit request selected." /></PageWithStyle>;

  const pv = Store.getAuditPreview(arId);
  if (!pv) return <PageWithStyle><EmptyState {...emptyStateProps} message="This audit request could not be loaded." /></PageWithStyle>;

  const session = Auth.getCurrentUser();
  const a = pv.auditRequest;
  const p = pv.project;
  const live = (pv.offers || []).find(o => o.status === 'pending');
  const canAccept = live && live.offeredBy === 'client';
  const negotiating = ['preview-sent', 'negotiating'].includes(a.status);

  function quote() {
    const amount = parseFloat(quoteValue);
    if (!amount || amount < 1) { Validate.toast('Enter a price greater than zero.', 'error'); return; }
    const r = Store.makeAuditOffer(arId, { amount, offeredBy: 'expert', note: 'Quote from reviewer' });
    if (!r) { Validate.toast('Could not send that quote.', 'error'); return; }
    Validate.toast(`Quote of $${amount.toLocaleString()} sent to the client.`, 'success');
    setQuoteValue('');
    reload();
  }

  function acceptOffer(offerId) {
    const r = Store.acceptAuditOffer(arId, offerId);
    if (!r) { Validate.toast('Could not accept that offer.', 'error'); return; }
    Validate.toast('Fee agreed. The client now funds escrow.', 'success');
    reload();
  }

  function takeJob() {
    const r = Store.acceptAuditEngagement(arId, Auth.getCurrentUser().userId);
    if (!r) { Validate.toast('Could not accept the engagement.', 'error'); return; }
    Validate.toast('Engagement accepted. You can now file your report.', 'success');
    reload();
  }

  function decline() {
    Validate.confirm('Decline this audit? The client will need to find another reviewer.', () => {
      const r = Store.declineAuditEngagement(arId, 'Declined by reviewer');
      if (!r) { Validate.toast('Could not decline.', 'error'); return; }
      Validate.toast('Audit declined.', 'info');
      navigate('/expert-audit-requests');
    });
  }

  const payout = Store.Fees.expertPayout(a.agreedAmount);

  return (
    <PageWithStyle>
      <DashboardLayout
        role="expert"
        activePath="/expert-audit-requests"
        pageTitle="Review before accepting"
        pageSubtitle={`${pv.kind === 'dispute-audit' ? 'Dispute audit' : 'Technical audit'} · status: ${a.status.replace(/-/g, ' ')}`}
      >
        <div className="pv-grid">
          <div>
            <div className="pv-card">
              <h2>{p ? p.title : 'Project'}</h2>
              <div className="pv-meta">
                <div><div className="k">Budget</div><div className="v">{p ? money(p.budget) : '—'}</div></div>
                <div><div className="k">Category</div><div className="v">{p ? p.category : '—'}</div></div>
                <div><div className="k">Deadline</div><div className="v">{p && p.deadline ? p.deadline : 'Not set'}</div></div>
                <div><div className="k">Progress</div><div className="v">{p ? p.progress + '%' : '—'}</div></div>
              </div>
              <div style={{ fontSize: 13, lineHeight: 1.65, color: 'var(--muted-foreground)' }}>{p ? p.description : ''}</div>
              {p && p.skills && p.skills.length ? (
                <div style={{ marginTop: 14, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {p.skills.map(sk => <span key={sk} style={{ fontSize: 11, padding: '4px 9px', borderRadius: 6, background: 'var(--secondary)' }}>{sk}</span>)}
                </div>
              ) : ''}
            </div>

            {pv.dispute ? (
              <div className="pv-card">
                <h2>The dispute you would be arbitrating</h2>
                <div className="pv-claim">{pv.dispute.reason}</div>
                <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginTop: 10 }}>
                  {`Raised by ${pv.dispute.raisedByName} against ${pv.dispute.againstName} · amount in question ${pv.dispute.amount || 'n/a'}`}
                </div>
              </div>
            ) : ''}

            <div className="pv-card">
              <h2>{`Milestones (${pv.milestones.length})`}</h2>
              {a.auditProgress ? (
                <div className="pv-fee" style={{ margin: '-4px 0 12px' }}>
                  {`${a.auditProgress.audited} of ${a.auditProgress.total} audited. You are paid once every milestone has a report.`}
                </div>
              ) : ''}
              {pv.milestones.length
                ? pv.milestones.map(m => <MilestoneRow key={m.id} m={m} a={a} session={session} />)
                : <div style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>No milestones defined yet.</div>}
            </div>
          </div>

          <div>
            <div className="pv-card">
              <h2>Client</h2>
              <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                <PersonAvatar background={pv.client ? pv.client.avatarColor : '#94a3b8'}>{pv.client ? pv.client.avatar : '?'}</PersonAvatar>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{pv.client ? pv.client.name : 'Unknown'}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{pv.client && pv.client.company ? pv.client.company : ''}</div>
                </div>
              </div>
              {pv.worker ? (
                <>
                  <h2 style={{ marginTop: 18 }}>Worker</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
                    <PersonAvatar background={pv.worker.avatarColor}>{pv.worker.avatar}</PersonAvatar>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>{pv.worker.name}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`Rating ${pv.worker.rating || '—'}`}</div>
                    </div>
                  </div>
                </>
              ) : ''}
            </div>

            <div className="pv-card">
              <h2>Your fee</h2>
              {(pv.offers || []).length ? pv.offers.map(o => (
                <div key={o.id} className="offer-row">
                  <span className="offer-who">{o.offeredBy === 'expert' ? 'You' : 'Client'}</span>
                  <span className="offer-amt">{money(o.amount)}</span>
                  <span className={`offer-tag ${o.status}`}>{o.status}</span>
                  <span style={{ color: 'var(--muted-foreground)', flex: 1, minWidth: 0 }}>{o.note || ''}</span>
                </div>
              )) : (
                <div className="offer-row" style={{ color: 'var(--muted-foreground)' }}>No offers yet — name your price below.</div>
              )}

              {negotiating ? (
                <>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 14 }}>
                    <span style={{ fontWeight: 700, color: 'var(--muted-foreground)' }}>$</span>
                    <input className="form-input" type="number" min="1" step="1" id="quoteInput" placeholder="Your price" style={{ maxWidth: 130 }}
                           value={quoteValue} onChange={e => setQuoteValue(e.target.value)} />
                    <button className="btn-outline" onClick={quote}>Send</button>
                  </div>
                  <div className="pv-fee">
                    The platform keeps 10% of the agreed fee. Nothing is committed until the client funds escrow.
                  </div>
                </>
              ) : ''}

              <div className="pv-actions">
                {canAccept && <button className="btn-primary" onClick={() => acceptOffer(live.id)}>{`Accept ${money(live.amount)}`}</button>}
                {a.status === 'escrow-funded' && (
                  <>
                    <button className="btn-primary" onClick={takeJob}>Accept engagement &amp; start</button>
                    <div className="pv-fee">{`${money(a.agreedAmount)} is already in escrow. You receive ${money(payout.net)} after the ${money(payout.fee)} platform commission.`}</div>
                  </>
                )}
                {a.status === 'agreed' && <div className="pv-fee">{`Fee agreed at ${money(a.agreedAmount)}. Waiting for the client to fund escrow.`}</div>}
                {/* A dispute is one claim, so there is a single place to go. A project
                    audit has one report per milestone, reached from the list on the left. */}
                {a.status === 'in-progress' && a.kind === 'dispute-audit' && (
                  <Link to={`/resolve-dispute?id=${a.disputeId}`} className="btn-primary" style={{ textDecoration: 'none', textAlign: 'center' }}>Resolve this dispute</Link>
                )}
                {!['paid', 'declined', 'cancelled', 'in-progress'].includes(a.status) && (
                  <button className="btn-outline" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={decline}>Decline this audit</button>
                )}
              </div>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </PageWithStyle>
  );
}

/** Adds this page's own stylesheet around whatever the page renders. */
function PageWithStyle({ children }) {
  return (
    <>
      <PageStyle css={pageCss} />
      {children}
    </>
  );
}

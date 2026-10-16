/**
 * LANNENT — AuditOffers (Audit & Dispute Fees)
 *
 * Every reviewer engagement the client pays for: the technical audit they
 * asked for when posting a project, and the reviewer fee for any dispute they
 * raised (only clients raise disputes). Each card shows the offer history and
 * the next step: counter, accept, fund the escrow, or — after a decline —
 * choose another reviewer.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import ExpertPicker from '../components/ExpertPicker';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ClientAuditOffers.css?raw';
import { money } from '../utils/transactions';

const STATUS_TEXT = {
  'preview-sent': 'waiting for the reviewer',
  negotiating: 'negotiating',
  agreed: 'fee agreed — fund it',
  'escrow-funded': 'funded — waiting for the reviewer to start',
  'in-progress': 'in progress',
  paid: 'completed',
  declined: 'declined',
  cancelled: 'cancelled',
};

/** Engagements this client pays for, newest first. */
function loadEngagements(Store, userId) {
  const tasks = Store.getTasks();
  const disputes = Store.getDisputes();
  return Store.getAuditRequests()
    .filter(a => a.clientId === userId)
    .filter(a => a.status !== 'cancelled')
    // A declined one stays only while it can still be replaced.
    .filter(a => {
      if (a.status !== 'declined') return true;
      if (a.replacedBy) return false;
      if (a.kind === 'dispute-audit') return disputes.some(d => d.id === a.disputeId && d.status === 'open');
      return tasks.some(t => t.id === a.taskId && t.status === 'draft');
    })
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)) || String(b.id).localeCompare(String(a.id)));
}

/** Runs a Store write, showing the server's reason if it is refused. */
function attempt(Validate, fn) {
  try {
    return fn();
  } catch (e) {
    Validate.toast(e.message, 'error');
    return null;
  }
}

function ReassignPanel({ engagement, task, onDone }) {
  const Store = useStore();
  const Validate = useValidation();
  const [expertId, setExpertId] = useState(null);
  const [offer, setOffer] = useState(String(engagement.agreedAmount || engagement.offers?.[0]?.amount || ''));

  function send() {
    const amount = parseFloat(offer);
    if (!expertId) { Validate.toast('Choose a reviewer first.', 'error'); return; }
    if (!(amount >= 1)) { Validate.toast('Enter an opening offer of at least ₹1.', 'error'); return; }
    const r = attempt(Validate, () => Store.reassignAudit(engagement.id, expertId, amount));
    if (!r) return;
    Validate.toast(`Request sent to ${Store.getUserById(expertId)?.name || 'the reviewer'}.`, 'success');
    onDone();
  }

  return (
    <div style={{ marginTop: 14, padding: 16, border: '1px dashed var(--border)', borderRadius: 12 }}>
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 8 }}>Choose another reviewer</div>
      <ExpertPicker category={task ? task.category : null} selectedId={expertId} onChange={setExpertId}
                    excludeIds={[engagement.declinedBy].filter(Boolean)} />
      <div className="ao-counter" style={{ marginTop: 12 }}>
        <span style={{ fontWeight: 700, color: 'var(--muted-foreground)' }}>₹</span>
        <input className="form-input" type="number" min="1" step="1" placeholder="Opening offer" value={offer} onChange={e => setOffer(e.target.value)} />
        <button className="btn-primary" onClick={send}>Send request</button>
      </div>
    </div>
  );
}

export default function AuditOffers() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Audit & Dispute Fees — Lannent');
  const session = Auth.getCurrentUser();
  const reload = useRerender();
  const [counterValues, setCounterValues] = useState({});
  const [reassigning, setReassigning] = useState(null);

  const engagements = loadEngagements(Store, session.userId);

  function counter(id) {
    const amount = parseFloat(counterValues[id]);
    if (!amount || amount < 1) { Validate.toast('Enter a price of at least ₹1.', 'error'); return; }
    const r = attempt(Validate, () => Store.makeAuditOffer(id, { amount, note: 'Counter-offer' }));
    if (!r) return;
    Validate.toast(`Offer of ${money(amount)} sent to the reviewer.`, 'success');
    setCounterValues(v => ({ ...v, [id]: '' }));
    reload();
  }

  function acceptOffer(id, offerId) {
    const r = attempt(Validate, () => Store.acceptAuditOffer(id, offerId));
    if (!r) return;
    Validate.toast('Fee agreed. Fund the escrow so the reviewer can start.', 'success');
    reload();
  }

  function fundEscrow(a) {
    Validate.confirm(
      `Move ${money(a.agreedAmount)} from your wallet into escrow? The reviewer is paid from it when the work is done; if they decline, it comes back to you.`,
      () => {
        const r = attempt(Validate, () => Store.fundAuditEscrow(a.id));
        if (!r) return;
        Validate.toast('Escrow funded. The reviewer can now start.', 'success');
        reload();
      },
    );
  }

  /**
   * Withdraws a request the reviewer has not accepted yet. For a dispute that
   * withdraws the dispute itself, and the milestone goes back to your review
   * queue. Anything funded comes back to your wallet.
   */
  function withdraw(a) {
    const isDispute = a.kind === 'dispute-audit';
    Validate.confirm(
      isDispute
        ? 'Withdraw this dispute? Any fee you funded comes back, and the milestone returns to your review — approve it, ask for changes or dispute it again. It will be approved automatically in 2 days if you do nothing.'
        : 'Withdraw this audit request? Any fee you funded comes back to your wallet.',
      () => {
        const r = attempt(Validate, () => (isDispute ? Store.withdrawDispute(a.disputeId) : Store.cancelAuditRequest(a.id)));
        if (!r) return;
        Validate.toast(isDispute ? 'Dispute withdrawn.' : 'Audit request withdrawn.', 'success');
        reload();
      },
    );
  }

  function cancelDraft(taskId) {
    Validate.confirm('Cancel this draft project? Its budget and any audit escrow are returned to your wallet.', () => {
      const r = attempt(Validate, () => Store.cancelDraftTask(taskId));
      if (!r) return;
      Validate.toast('Draft cancelled and your money returned.', 'success');
      reload();
    });
  }

  const wallet = Store.getUserById(session.userId)?.walletBalance || 0;

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role={session.role} activePath="/audit-offers" pageTitle="Audit & Dispute Fees"
                       pageSubtitle="Agree a price with an Expert Reviewer, then fund it into escrow">
        <div style={{ marginBottom: 16, fontSize: 13, color: 'var(--muted-foreground)' }}>
          Wallet balance: <strong style={{ color: 'var(--foreground)' }}>{money(wallet)}</strong>
        </div>
        <div id="aoList">
          {!engagements.length ? (
            <div className="ao-empty">
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>Nothing to pay a reviewer for</div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 18 }}>
                Turn on Technical Audit when posting a project, or raise a dispute on a submitted milestone, to hire an Expert Reviewer.
              </div>
              <Link to="/post-task" className="btn-primary" style={{ textDecoration: 'none' }}>Post a Task</Link>
            </div>
          ) : engagements.map(a => {
            const task = Store.getTaskById(a.taskId);
            const expert = a.expertId ? Store.getUserById(a.expertId) : null;
            const declinedBy = a.declinedBy ? Store.getUserById(a.declinedBy) : null;
            const live = (a.offers || []).find(o => o.status === 'pending');
            const canAccept = live && live.offeredBy === 'expert';
            const negotiating = ['preview-sent', 'negotiating'].includes(a.status);
            const isDraft = task && task.status === 'draft';
            const isDispute = a.kind === 'dispute-audit';

            return (
              <div key={a.id} className="ao-card">
                <div className="ao-head">
                  <div>
                    <div className="ao-title">{task ? task.title : a.project || 'Project'}</div>
                    <div className="ao-sub">
                      {[isDispute ? `Dispute review${a.milestone ? ' — ' + a.milestone : ''}` : 'Technical audit',
                        task ? 'budget ' + money(task.budget) : '',
                        expert ? 'reviewer ' + expert.name : declinedBy ? `declined by ${declinedBy.name}` : ''].filter(Boolean).join(' · ')}
                    </div>
                    {isDraft && !isDispute && <div className="ao-sub"><strong>The project stays a draft until a reviewer accepts.</strong></div>}
                  </div>
                  <span className={`ao-status st-${a.status}`}>{STATUS_TEXT[a.status] || a.status}</span>
                </div>

                {a.agreedAmount ? (
                  <div className="ao-sub" style={{ marginBottom: 10 }}>Agreed fee: <strong>{money(a.agreedAmount)}</strong></div>
                ) : ''}

                {(a.offers || []).length ? a.offers.map(o => (
                  <div key={o.id} className="offer-row">
                    <span className="offer-who">{o.offeredBy === 'expert' ? 'Reviewer' : 'You'}</span>
                    <span className="offer-amt">{money(o.amount)}</span>
                    <span className={`offer-tag ${o.status}`}>{o.status}</span>
                    <span style={{ color: 'var(--muted-foreground)', flex: 1, minWidth: 0 }}>{o.note || ''}</span>
                  </div>
                )) : (
                  <div className="offer-row" style={{ color: 'var(--muted-foreground)' }}>No offers yet.</div>
                )}

                {negotiating && (
                  <div className="ao-counter">
                    <span style={{ fontWeight: 700, color: 'var(--muted-foreground)' }}>₹</span>
                    <input className="form-input" type="number" min="1" step="1" placeholder="Your price"
                           value={counterValues[a.id] || ''} onChange={e => setCounterValues(v => ({ ...v, [a.id]: e.target.value }))} />
                    <button className="btn-outline" onClick={() => counter(a.id)}>Send offer</button>
                  </div>
                )}

                <div className="ao-actions">
                  {canAccept && <button className="btn-primary" onClick={() => acceptOffer(a.id, live.id)}>{`Accept ${money(live.amount)}`}</button>}
                  {a.status === 'agreed' && <button className="btn-primary" onClick={() => fundEscrow(a)}>{`Fund ${money(a.agreedAmount)} into escrow`}</button>}
                  {a.status === 'escrow-funded' && <span className="ao-sub">Waiting for the reviewer to accept.</span>}
                  {a.status === 'in-progress' && <span className="ao-sub">{isDispute ? 'The reviewer is reviewing the dispute. Their verdict pays them from escrow.' : 'The reviewer is auditing your milestones.'}</span>}
                  {a.status === 'paid' && <span className="ao-sub">Completed — the reviewer has been paid.</span>}
                  {a.status === 'declined' && (
                    <button className="btn-primary" onClick={() => setReassigning(reassigning === a.id ? null : a.id)}>
                      {reassigning === a.id ? 'Close' : 'Choose another reviewer'}
                    </button>
                  )}
                  {isDraft && !isDispute && <button className="btn-outline" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => cancelDraft(a.taskId)}>Cancel draft project</button>}
                  {(['preview-sent', 'negotiating', 'agreed', 'escrow-funded'].includes(a.status) || (isDispute && a.status === 'declined')) && (isDispute || !isDraft) && (
                    <button className="btn-outline" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => withdraw(a)}>
                      {isDispute ? 'Withdraw dispute' : 'Withdraw request'}
                    </button>
                  )}
                  {isDispute && a.disputeId && (
                    <Link to={`/expert-report-dispute?id=${a.disputeId}`} className="btn-outline" style={{ textDecoration: 'none' }}>View dispute</Link>
                  )}
                </div>

                {reassigning === a.id && a.status === 'declined' && (
                  <ReassignPanel engagement={a} task={task} onDone={() => { setReassigning(null); reload(); }} />
                )}
              </div>
            );
          })}
        </div>
      </DashboardLayout>
    </>
  );
}

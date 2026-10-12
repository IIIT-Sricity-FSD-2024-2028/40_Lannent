/**
 * LANNENT — ClientAuditOffers
 * Converted from front-end/pages/client-audit-offers.html.
 *
 * The client's audit engagements with Expert Reviewers. Each card shows the
 * offer history; the client can counter-offer, accept the reviewer's price,
 * fund the escrow, look for another reviewer, or cancel a draft project.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ClientAuditOffers.css?raw';

function statusLabel(s) { return s.replace(/-/g, ' '); }

function money(n) {
  return '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** The client's engagements, newest first. */
function loadEngagements(Store, userId) {
  const draftTaskIds = new Set(
    Store.getTasksByClient(userId).filter(t => t.status === 'draft').map(t => t.id)
  );
  return Store.getAuditRequests()
    .filter(a => a.clientId === userId)
    // Hide finished engagements, but keep a declined one while its project
    // is still a draft — that card carries the "find another reviewer" action.
    .filter(a => a.status !== 'cancelled')
    .filter(a => a.status !== 'declined' || draftTaskIds.has(a.taskId))
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

export default function ClientAuditOffers() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Audit Offers — Lannent');
  const session = Auth.getCurrentUser();
  const reload = useRerender();
  const [counterValues, setCounterValues] = useState({});   // counter-offer input per engagement

  const engagements = loadEngagements(Store, session.userId);

  function counter(id) {
    const amount = parseFloat(counterValues[id]);
    if (!amount || amount < 1) {
      Validate.toast('Enter a price greater than zero.', 'error');
      return;
    }
    const r = Store.makeAuditOffer(id, { amount, offeredBy: 'client', note: 'Counter-offer' });
    if (!r) { Validate.toast('Could not send that offer. Please try again.', 'error'); return; }
    Validate.toast(`Offer of $${amount.toLocaleString()} sent to the reviewer.`, 'success');
    setCounterValues(v => ({ ...v, [id]: '' }));
    reload();
  }

  function acceptOffer(id, offerId) {
    const r = Store.acceptAuditOffer(id, offerId);
    if (!r) { Validate.toast('Could not accept that offer.', 'error'); return; }
    Validate.toast('Fee agreed. Fund the escrow to hire the reviewer.', 'success');
    reload();
  }

  function fundEscrow(id) {
    const ar = Store.getAuditRequestById(id);
    Validate.confirm(
      `Move $${Number(ar.agreedAmount).toLocaleString()} into escrow for this audit? The reviewer is paid from it once they file their report.`,
      () => {
        const r = Store.fundAuditEscrow(id);
        if (!r) { Validate.toast('Funding failed. Check your wallet balance.', 'error'); return; }
        Validate.toast('Escrow funded. The reviewer can now start.', 'success');
        reload();
      }
    );
  }

  function findAnotherReviewer(taskId) {
    const task = Store.getTaskById(taskId);
    const r = Store.createAuditRequest({
      kind: 'project-audit',
      taskId,
      clientId: task.clientId,
      project: task.title,
      severity: 'Medium',
      openingOffer: undefined,
    });
    if (!r) { Validate.toast('Could not open a new audit request.', 'error'); return; }
    Validate.toast('New audit request opened. Reviewers can now quote for it.', 'success');
    reload();
  }

  function cancelDraft(taskId) {
    Validate.confirm(
      'Cancel this draft project? Any audit escrow is refunded to your wallet.',
      () => {
        const r = Store.cancelDraftTask(taskId);
        if (!r) { Validate.toast('Could not cancel the draft.', 'error'); return; }
        Validate.toast('Draft cancelled and escrow refunded.', 'success');
        reload();
      }
    );
  }

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/client-audit-offers" pageTitle="Audit Offers" pageSubtitle="Agree a price with an Expert Reviewer, then fund the audit">
        <div id="aoList">
          {!engagements.length ? (
            <div className="ao-empty">
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 6 }}>No audit engagements</div>
              <div style={{ color: 'var(--muted-foreground)', fontSize: 14, marginBottom: 18 }}>
                Enable Technical Audit when posting a project to hire an Expert Reviewer.
              </div>
              <Link to="/post-task" className="btn-primary" style={{ textDecoration: 'none' }}>Post a Task</Link>
            </div>
          ) : engagements.map(a => {
            const task = Store.getTaskById(a.taskId);
            const expert = a.expertId ? Store.getUserById(a.expertId) : null;
            const live = (a.offers || []).find(o => o.status === 'pending');
            const canAccept = live && live.offeredBy === 'expert';
            const negotiating = ['preview-sent', 'negotiating'].includes(a.status);
            const isDraft = task && task.status === 'draft';

            // Subtitle: "Technical audit · budget $X · Reviewer" (+ draft note)
            const subText = (a.kind === 'dispute-audit' ? 'Dispute audit' : 'Technical audit')
              + ' ' + (task ? ' · budget ' + money(task.budget) : '')
              + ' ' + (expert ? ' · ' + expert.name : '')
              + ' ' + (isDraft ? ' · ' : '');

            return (
              <div key={a.id} className="ao-card">
                <div className="ao-head">
                  <div>
                    <div className="ao-title">{task ? task.title : a.project || 'Project'}</div>
                    <div className="ao-sub">
                      {subText}
                      {isDraft && <strong>project is a draft until a reviewer accepts</strong>}
                    </div>
                  </div>
                  <span className={`ao-status st-${a.status}`}>{statusLabel(a.status)}</span>
                </div>

                {a.agreedAmount ? (
                  <div className="ao-sub" style={{ marginBottom: 10 }}>
                    Agreed fee: <strong>{money(a.agreedAmount)}</strong>
                  </div>
                ) : ''}

                {(a.offers || []).length ? a.offers.map(o => (
                  <div key={o.id} className="offer-row">
                    <span className="offer-who">{o.offeredBy === 'client' ? 'You' : 'Reviewer'}</span>
                    <span className="offer-amt">{money(o.amount)}</span>
                    <span className={`offer-tag ${o.status}`}>{o.status}</span>
                    <span style={{ color: 'var(--muted-foreground)', flex: 1, minWidth: 0 }}>{o.note || ''}</span>
                  </div>
                )) : (
                  <div className="offer-row" style={{ color: 'var(--muted-foreground)' }}>No offers yet.</div>
                )}

                {negotiating && (
                  <div className="ao-counter">
                    <span style={{ fontWeight: 700, color: 'var(--muted-foreground)' }}>$</span>
                    <input className="form-input" type="number" min="1" step="1" id={`counter_${a.id}`} placeholder="Your price"
                           value={counterValues[a.id] || ''} onChange={e => setCounterValues(v => ({ ...v, [a.id]: e.target.value }))} />
                    <button className="btn-outline" onClick={() => counter(a.id)}>Send offer</button>
                  </div>
                )}

                <div className="ao-actions">
                  {canAccept && <button className="btn-primary" onClick={() => acceptOffer(a.id, live.id)}>{`Accept ${money(live.amount)}`}</button>}
                  {a.status === 'agreed' && <button className="btn-primary" onClick={() => fundEscrow(a.id)}>{`Fund ${money(a.agreedAmount)} into escrow`}</button>}
                  {a.status === 'escrow-funded' && <span className="ao-sub">Waiting for the reviewer to start.</span>}
                  {a.status === 'declined' && isDraft && <button className="btn-primary" onClick={() => findAnotherReviewer(a.taskId)}>Find another reviewer</button>}
                  {isDraft && <button className="btn-outline" style={{ color: '#b91c1c', borderColor: '#fca5a5' }} onClick={() => cancelDraft(a.taskId)}>Cancel draft project</button>}
                </div>
              </div>
            );
          })}
        </div>
      </DashboardLayout>
    </>
  );
}

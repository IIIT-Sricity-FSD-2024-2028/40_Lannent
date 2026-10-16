/**
 * LANNENT — ClientWallet (Wallet & Escrow)
 * Converted from front-end/pages/client-wallet.html.
 *
 * The client's available balance, money held in escrow per project and the
 * transaction history, plus three dialogs: Add Funds, Withdraw and All
 * Transactions. The dialogs stay mounted and are shown with display:flex,
 * exactly like the original.
 */
import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './ClientWallet.css?raw';
import { newestFirst } from '../utils/helpers';
import { describeTx, TONE_STYLE, money } from '../utils/transactions';

const ADD_AMOUNTS = ['₹500', '₹1,000', '₹2,000', '₹5,000', '₹10,000', 'Custom'];
const WITHDRAW_AMOUNTS = ['₹100', '₹500', '₹1000', '₹2500'];
// Every deposit carries the same card-processing fee on the server, whatever
// the method, so the methods differ only in how they are described.
const PAYMENT_METHODS = [
  { id: 'card', name: 'Credit/Debit Card', icon: 'credit-card', color: '#f59e0b', bg: '#fffbeb' },
  { id: 'bank', name: 'Bank Transfer', icon: 'building-2', color: '#10b981', bg: '#ecfdf5' },
];

// ── Shared dialog styles ──
const OVERLAY_STYLE = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, alignItems: 'flex-start', justifyContent: 'center', backdropFilter: 'blur(4px)', overflowY: 'auto' };
const GRADIENT_TITLE = { fontSize: 24, fontWeight: 700, marginBottom: 4, background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' };
const MONEY_INPUT_STYLE = { width: '100%', padding: '14px 14px 14px 38px', border: '2px solid #ddd6fe', borderRadius: 12, fontSize: 16, fontWeight: 600, color: '#111827', fontFamily: 'system-ui,-apple-system,sans-serif', background: 'white', outline: 'none', transition: 'all 0.2s' };
const CANCEL_BUTTON_STYLE = { flex: 1, padding: 14, borderRadius: 12, border: '1px solid #e5e7eb', background: 'white', fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', transition: 'all 0.2s' };

// ── Hover / focus helpers (they change the element's inline style directly, as the original did) ──
const purpleFocus = {
  onFocus: e => { e.currentTarget.style.borderColor = '#a855f7'; },
  onBlur: e => { e.currentTarget.style.borderColor = '#ddd6fe'; },
};
const cancelHover = {
  onMouseEnter: e => { e.currentTarget.style.background = '#f9fafb'; },
  onMouseLeave: e => { e.currentTarget.style.background = 'white'; },
};

/** Balances, escrow per project and the transaction list for a client. */
function computeWalletData(Store, userId) {
  const user = Store.getUserById(userId);
  const allTxs = Store.getTransactions();
  const clientTasks = Store.getTasksByClient(userId);
  const clientTaskIds = new Set(clientTasks.map(t => t.id));
  const sum = (rows, pick) => rows.reduce((s, t) => s + (pick(t) || 0), 0);

  const walletBalance = user?.walletBalance || 0;
  const mineOut = t => t.fromId === userId;
  const deposits = sum(allTxs.filter(t => t.type === 'deposit' && t.toId === userId), t => t.netAmount ?? t.amount);
  // Marketplace/contract fees, plus any cancellation fee kept from escrow.
  const fees = sum(allTxs.filter(t => ['platform-fee', 'cancellation-fee'].includes(t.type) && mineOut(t)), t => t.amount);
  // Paid out to workers and reviewers from this client's escrow.
  const released = sum(
    allTxs.filter(t => clientTaskIds.has(t.taskId) && (
      // Only clients pay reviewers, so every audit and dispute fee on their projects is theirs.
      ['milestone-release', 'audit-release', 'dispute-fee-release'].includes(t.type)
    )),
    t => t.grossAmount ?? t.amount,
  );
  const refunded = sum(allTxs.filter(t => t.type === 'refund' && t.toId === userId), t => t.amount);

  // What is actually held right now — read from the server's escrow, bucket
  // by bucket. It used to be estimated from milestone budgets, which missed
  // the audit and dispute fees entirely.
  const escrow = Store.getMyEscrow();
  const escrowProjects = escrow.projects
    .filter(p => clientTaskIds.has(p.taskId))
    .map(p => {
      const t = clientTasks.find(x => x.id === p.taskId);
      const paidOut = sum(allTxs.filter(x => x.type === 'milestone-release' && x.taskId === p.taskId), x => x.grossAmount ?? x.amount);
      const lastActivity = allTxs
        .filter(tx => tx.taskId === p.taskId && tx.createdAt)
        .reduce((latest, tx) => (tx.createdAt > latest ? tx.createdAt : latest), t?.createdAt || '');
      return {
        ...p,
        lastActivity,
        name: p.title,
        worker: (t && Store.getUserById(t.workerId)?.name) || 'Not hired yet',
        paidOut,
        progress: t && t.budget ? Math.min(100, Math.round((paidOut / t.budget) * 100)) : 0,
      };
    });

  // Your own money movements, plus what was paid out of your projects' escrow.
  const rows = newestFirst(allTxs.filter(t => t.toId === userId || t.fromId === userId
    || (clientTaskIds.has(t.taskId) && ['milestone-release', 'audit-release', 'dispute-fee-release'].includes(t.type))));
  const transactions = rows.map(tx => {
    const d = describeTx(tx, userId);
    const tone = TONE_STYLE[d.tone] || TONE_STYLE.other;
    const task = tx.taskId ? Store.getTaskById(tx.taskId) : null;
    return {
      id: tx.id,
      label: d.label,
      sub: [(task?.title || (tx.taskId ? 'Project' : 'Wallet')), String(tx.createdAt || '').slice(0, 10)].join(' • '),
      amount: `${d.sign < 0 ? '−' : d.sign > 0 ? '+' : ''}${money(d.amount)}`,
      positive: d.sign > 0,
      neutral: d.sign === 0,
      icon: tone.icon, color: tone.color, bg: `${tone.color}1a`,
    };
  });

  return {
    walletBalance, deposits, fees, released, refunded,
    escrowTotals: escrow.totals,
    activeEscrowCount: escrowProjects.length,
    escrowProjects: newestFirst(escrowProjects, p => p.lastActivity),
    transactions,
  };
}

/** Bottom-right notice used by the withdraw dialog (this page's own variant). */
function showNotification(message, type) {
  const notification = document.createElement('div');
  const bgColor = type === 'success' ? '#10b981' : '#ef4444';
  notification.style.cssText = `
    position:fixed;
    bottom:24px;
    right:24px;
    background:${bgColor};
    color:white;
    padding:16px 24px;
    border-radius:12px;
    font-size:14px;
    font-weight:600;
    z-index:300;
    box-shadow:0 8px 24px rgba(0,0,0,0.2);
    animation:slideInRight 0.3s ease;
  `;
  notification.textContent = message;
  document.body.appendChild(notification);
  setTimeout(() => {
    notification.style.animation = 'slideInLeft 0.3s ease reverse';
    setTimeout(() => notification.remove(), 300);
  }, 3500);
}

/** Round close (×) button in a dialog header. */
function CloseButton({ onClick, size = 32, iconSize = 18 }) {
  return (
    <button onClick={onClick} style={{ background: 'linear-gradient(135deg,#f3e8ff,#ede9fe)', border: 'none', cursor: 'pointer', color: '#7c3aed', width: size, height: size, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'transform 0.2s' }}
            onMouseOver={e => { e.currentTarget.style.transform = 'scale(1.1)'; }} onMouseOut={e => { e.currentTarget.style.transform = 'scale(1)'; }}>
      <Icon name="x" style={{ width: iconSize, height: iconSize }} />
    </button>
  );
}

/** One row in the "Recent Transactions" card. */
function TxRow({ t }) {
  return (
    <div className="tx-row">
      <div className="tx-icon" style={{ background: t.bg }}>
        <Icon name={t.icon} style={{ width: 18, height: 18, color: t.color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{t.label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{t.sub}</div>
      </div>
      <span className={t.positive ? 'tx-amount-pos' : t.neutral ? '' : 'tx-amount-neg'} style={t.neutral ? { color: 'var(--muted-foreground)', fontWeight: 600 } : undefined}>{t.amount}</span>
    </div>
  );
}

/** One project's escrow bar in the "Escrow by Project" card. */
function EscrowProject({ p }) {
  return (
    <div className="escrow-project">
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14 }}>{p.name}</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#6366f1' }}>{money(p.total)}</span>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', marginBottom: 10 }}>{`Worker: ${p.worker}`}</div>
      <div style={{ height: 6, borderRadius: 9999, background: 'var(--muted)', overflow: 'hidden', marginBottom: 8 }}>
        <div style={{ height: '100%', borderRadius: 9999, background: 'linear-gradient(90deg,#10b981,#34d399)', width: `${p.progress}%` }}></div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, flexWrap: 'wrap', gap: 6 }}>
        <span style={{ color: '#10b981', fontWeight: 500 }}>{`Paid to worker: ${money(p.paidOut)}`}</span>
        <span style={{ color: '#6366f1', fontWeight: 500 }}>{`Project: ${money(p.projectHeld)}`}</span>
        {p.auditHeld > 0 && <span style={{ color: '#7c3aed', fontWeight: 500 }}>{`Audit fee: ${money(p.auditHeld)}`}</span>}
        {p.disputeHeld > 0 && <span style={{ color: '#f59e0b', fontWeight: 500 }}>{`Dispute fee: ${money(p.disputeHeld)}`}</span>}
      </div>
    </div>
  );
}

/** One preview line ("You pay", fees, …) in a dialog. */
function PreviewRow({ label, labelStyle, valueStyle, id, value, marginBottom }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', ...(marginBottom ? { marginBottom } : {}) }}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle} id={id}>{value}</span>
    </div>
  );
}

export default function ClientWallet() {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  usePageTitle('Wallet & Escrow — Lannent');
  const [session] = useState(() => Auth.getCurrentUser());
  const walletUserId = session.userId;
  const refreshWallet = useRerender();

  const d = computeWalletData(Store, walletUserId);
  const availableBalance = d.walletBalance;

  // ── Add Funds dialog ──
  const [addOpen, setAddOpen] = useState(false);
  const [currentBalanceText, setCurrentBalanceText] = useState('₹4,875');  // filled in when the dialog opens
  const [selectedAmount, setSelectedAmount] = useState(null);
  const [customAmount, setCustomAmount] = useState('');
  const [selectedMethod, setSelectedMethod] = useState(null);

  const customInputRef = useRef(null);

  // ── Withdraw dialog ──
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawBalanceText, setWithdrawBalanceText] = useState('₹4,875'); // filled in when the dialog opens
  const [withdrawAmount, setWithdrawAmountValue] = useState('');

  // ── All Transactions dialog (list captured when it opens) ──
  const [allOpen, setAllOpen] = useState(false);
  const [allTx, setAllTx] = useState(null);

  // Amount chosen in the Add Funds dialog
  const addAmount = selectedAmount === null ? 0
    : selectedAmount === 'Custom' ? (parseFloat(customAmount) || 0)
    : (parseFloat(selectedAmount.replace(/[₹,]/g, '')) || 0);
  // Matches the server: one processing fee, and the wallet is credited the net.
  const depositQuote = Store.Fees.deposit(addAmount);

  const withdrawValue = parseFloat(withdrawAmount) || 0;
  const withdrawQuote = Store.Fees.withdrawal(withdrawValue);

  // ── Add Funds ──
  function showAddFunds() {
    setAddOpen(true);
    setCurrentBalanceText(money(availableBalance));
    // Reset previous modal state
    setSelectedAmount(null);
    setSelectedMethod(null);
    setCustomAmount('');
  }

  function selectAmount(amt, el) {
    if (amt === 'Custom') {
      flushSync(() => setSelectedAmount(amt));
      customInputRef.current?.focus();
    } else {
      setSelectedAmount(amt);
      setCustomAmount('');
    }
    // Re-selecting the same amount after hovering repaints it, as the original did
    el.style.borderColor = '#6366f1';
    el.style.background = '#eef2ff';
  }

  function selectPaymentMethod(methodId) {
    setSelectedMethod(methodId);
  }

  function processAddFunds() {
    if (addAmount <= 0) {
      Validate.toast('Please select or enter a valid amount greater than 0.', 'error');
      return;
    }
    if (depositQuote.fee >= addAmount) {
      Validate.toast(`The amount must be more than the ${money(depositQuote.fee)} processing fee.`, 'error');
      return;
    }
    if (!selectedMethod) {
      Validate.toast('Please select a payment method.', 'error');
      return;
    }

    // One call: the server charges card processing, credits the net and writes
    // the ledger row together.
    let deposit;
    try {
      deposit = Store.addToWallet(walletUserId, addAmount);
    } catch (e) {
      Validate.toast((e.message), 'error');
      return;
    }

    // Close modal and refresh all wallet data
    setAddOpen(false);
    refreshWallet();
    Validate.toast('✓ ₹' + deposit.net.toFixed(2) + ' credited to your wallet (₹'
      + deposit.fee.toFixed(2) + ' processing fee).', 'success');
  }

  // ── All transactions ──
  function showAllTransactions() {
    setAllTx(computeWalletData(Store, walletUserId).transactions);
    setAllOpen(true);
  }

  // ── Withdraw ──
  function showWithdraw() {
    setWithdrawOpen(true);
    setWithdrawAmountValue('');
    setWithdrawBalanceText(money(availableBalance));
  }

  function setWithdrawAmount(amt) {
    const amount = parseFloat(amt.replace(/[₹,]/g, ''));
    if (amount <= availableBalance) setWithdrawAmountValue(String(amount));
  }

  function processWithdraw() {
    const amount = withdrawValue;
    if (amount <= 0) { showNotification('Please enter a valid amount', 'error'); return; }
    if (amount < 50) { showNotification('Minimum withdrawal amount is ₹50', 'error'); return; }
    if (amount > availableBalance) { showNotification('Insufficient balance for this withdrawal', 'error'); return; }

    // One call: the server debits the gross, keeps the payout fee and writes
    // the ledger row together.
    let result;
    try {
      result = Store.withdrawFromWallet(walletUserId, amount);
    } catch (e) {
      showNotification(e.message, 'error');
      return;
    }

    // Close modal and refresh all wallet data
    setWithdrawOpen(false);
    refreshWallet();
    showNotification(`✓ Withdrew ${money(result.gross)} — ${money(result.net)} paid out after a ${money(result.fee)} payout fee.`, 'success');
  }

  const stats = [
    { label: 'Total Deposited', val: money(d.deposits), color: '#6366f1', icon: 'arrow-down-circle' },
    { label: 'Paid to workers & reviewers', val: money(d.released), color: '#10b981', icon: 'unlock' },
    { label: 'Platform fees', val: money(d.fees), color: '#f97316', icon: 'percent' },
    { label: 'Refunded to you', val: money(d.refunded), color: '#0ea5e9', icon: 'rotate-ccw' },
  ];

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="client" activePath="/client-wallet" pageTitle="Wallet & Escrow" pageSubtitle="Manage your balance and track escrow payments">
        <div id="walletDynamicContent">
          <div className="wallet-grid">
            <div className="wallet-card" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, marginBottom: 8 }}>Available Balance</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 20 }} id="availableBalanceDisplay">{money(d.walletBalance)}</div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <button onClick={showAddFunds} style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.3)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}>+ Add Funds</button>
                  <button onClick={showWithdraw} style={{ padding: '8px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.15)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.25)'; }} onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.15)'; }}>Withdraw</button>
                </div>
              </div>
            </div>
            <div className="wallet-card" style={{ background: 'linear-gradient(135deg,#10b981,#059669)' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.8, marginBottom: 8 }}>Total in Escrow</div>
                <div style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 8 }}>{money(d.escrowTotals.total)}</div>
                <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 16, lineHeight: 1.6 }}>
                  {`Projects ${money(d.escrowTotals.project)} · Audit fees ${money(d.escrowTotals.audit)} · Dispute fees ${money(d.escrowTotals.dispute)}`}
                  <br />{`Across ${d.activeEscrowCount} project${d.activeEscrowCount !== 1 ? 's' : ''}`}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, opacity: 0.9 }}>
                  <Icon name="shield-check" style={{ width: 14, height: 14 }} /> Secured & Protected
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 16, marginBottom: 24 }}>
            {stats.map(s => (
              <div className="stat-card" key={s.label}>
                <div><div className="stat-val" style={{ color: s.color }}>{s.val}</div><div className="stat-label">{s.label}</div></div>
                <div className="stat-icon-wrap" style={{ background: `${s.color}20` }}>
                  <Icon name={s.icon} style={{ width: 20, height: 20, color: s.color }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
              <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 20 }}>Escrow by Project</h3>
              {d.escrowProjects.length
                ? d.escrowProjects.map(p => <EscrowProject key={p.id} p={p} />)
                : <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted-foreground)', fontSize: 13 }}>Nothing is held in escrow right now.</div>}
            </div>
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, padding: '20px 24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600 }}>Recent Transactions</h3>
                <button className="btn-outline" style={{ fontSize: 13, padding: '5px 12px' }} onClick={showAllTransactions}>View All</button>
              </div>
              {d.transactions.length === 0 ? (
                <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
                  <Icon name="wallet" style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontWeight: 600, marginBottom: 4 }}>No transactions yet</div>
                  <div style={{ fontSize: 13 }}>Transactions will appear here once you add funds or post a project.</div>
                </div>
              ) : d.transactions.slice(0, 10).map(t => <TxRow key={t.id} t={t} />)}
            </div>
          </div>
        </div>

        {/* Add Funds Modal — its @keyframes (slideUp, pulse) are in ClientWallet.css */}
        <div id="addFundsModal" style={{ display: addOpen ? 'flex' : 'none', ...OVERLAY_STYLE, padding: '24px 0' }}>
          <div style={{ background: 'white', borderRadius: 28, width: '100%', maxWidth: 520, margin: '0 auto', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32, padding: '32px 32px 0' }}>
              <div>
                <h2 style={GRADIENT_TITLE}>Add Funds</h2>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Securely add money to your Lannent wallet</p>
              </div>
              <CloseButton onClick={() => setAddOpen(false)} />
            </div>

            {/* Current Balance Info */}
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #a7f3d0', borderRadius: 16, padding: 20, margin: '0 32px', marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#065f46', fontWeight: 600, marginBottom: 6 }}>💰 Current Balance</div>
              <div style={{ fontSize: 28, fontWeight: 900, color: '#059669', letterSpacing: '-0.02em' }} id="currentBalanceDisplay">{currentBalanceText}</div>
            </div>

            {/* Amount Selection */}
            <div style={{ padding: '0 32px', marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Choose Amount</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
                {ADD_AMOUNTS.map(amt => {
                  const selected = selectedAmount === amt;
                  return (
                    <button key={amt} type="button" className={selected ? 'amount-selected' : undefined} onClick={e => selectAmount(amt, e.currentTarget)}
                            style={{ padding: 14, borderRadius: 14, border: selected ? '2px solid #6366f1' : '2px solid #e5e7eb', background: selected ? '#eef2ff' : 'white', fontSize: 15, fontWeight: 600, color: '#111827', cursor: 'pointer', transition: 'all 0.2s', position: 'relative', overflow: 'hidden' }}
                            onMouseEnter={e => { const s = e.currentTarget.style; s.borderColor = '#6366f1'; s.background = '#f8fafc'; s.transform = 'translateY(-2px)'; s.boxShadow = '0 8px 24px rgba(99,102,241,0.15)'; }}
                            onMouseLeave={e => {
                              // The original checks for a 'selected' class that is never set
                              // (selection uses 'amount-selected'), so leaving always un-highlights.
                              const el = e.currentTarget, s = el.style, on = el.classList.contains('selected');
                              s.borderColor = on ? '#6366f1' : '#e5e7eb'; s.background = on ? '#eef2ff' : 'white'; s.transform = 'translateY(0)'; s.boxShadow = 'none';
                            }}>
                      <span style={{ position: 'relative', zIndex: 1 }}>{amt}</span>
                      <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg,#6366f1,#a855f7)', opacity: selected ? 0.1 : 0, transition: 'opacity 0.2s' }} className="amount-bg"></div>
                    </button>
                  );
                })}
              </div>

              {/* Custom Amount Input */}
              <div id="customAmountSection" style={{ display: selectedAmount === 'Custom' ? 'block' : 'none', marginTop: 16 }}>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: 18, fontWeight: 600, color: '#6366f1' }}>₹</span>
                  {' '}
                  <input ref={customInputRef} type="number" id="customAmountInput" placeholder="Enter custom amount" style={MONEY_INPUT_STYLE}
                         value={customAmount} onChange={e => setCustomAmount(e.target.value)} {...purpleFocus} />
                </div>
              </div>
            </div>

            {/* Payment Methods */}
            <div style={{ padding: '0 32px', marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 12 }}>Payment Method</label>
              <div style={{ display: 'grid', gap: 10 }}>
                {PAYMENT_METHODS.map(method => (
                  <div key={method.id} className={selectedMethod === method.id ? 'method-selected' : undefined} onClick={() => selectPaymentMethod(method.id)}
                       style={{ padding: 16, border: '2px solid #e5e7eb', borderRadius: 14, background: 'white', cursor: 'pointer', transition: 'all 0.2s' }}
                       onMouseOver={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.background = '#f8fafc'; }}
                       onMouseLeave={e => { const on = e.currentTarget.classList.contains('selected'); e.currentTarget.style.borderColor = on ? '#6366f1' : '#e5e7eb'; e.currentTarget.style.background = on ? '#eef2ff' : 'white'; }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: method.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon name={method.icon} style={{ width: 22, height: 22, color: method.color }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>{method.name}</div>
                        <div style={{ fontSize: 13, color: '#6b7280', marginTop: 2 }}>{`Processing fee ${Store.Fees.rates().deposit.percent}% + ₹${Store.Fees.rates().deposit.fixed}`}</div>
                      </div>
                      <div style={{ width: 20, height: 20, border: '2px solid #d1d5db', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} className="method-radio">
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#6366f1', opacity: selectedMethod === method.id ? 1 : 0, transition: 'opacity 0.2s' }} className="method-radio-dot"></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Amount Preview */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 16, padding: 20, margin: '0 32px', marginBottom: 24 }}>
              <PreviewRow label="You pay" labelStyle={{ fontSize: 14, color: '#6b7280' }} valueStyle={{ fontWeight: 700, color: '#111827', fontSize: 15 }} id="previewAddAmount" value={money(depositQuote.gross)} marginBottom={12} />
              <PreviewRow label={`Processing fee (${Store.Fees.rates().deposit.percent}% + ₹${Store.Fees.rates().deposit.fixed})`} labelStyle={{ fontSize: 14, color: '#6b7280' }} valueStyle={{ fontWeight: 600, color: '#ef4444', fontSize: 14 }} id="previewFee" value={addAmount > 0 ? money(depositQuote.fee) : '₹0.00'} marginBottom={12} />
              <div style={{ height: 1, background: '#e5e7eb', margin: '12px 0' }}></div>
              <PreviewRow label="Credited to your wallet" labelStyle={{ fontSize: 16, fontWeight: 700, color: '#111827' }} valueStyle={{ fontSize: 20, fontWeight: 900, background: 'linear-gradient(135deg,#6366f1,#a855f7)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} id="previewTotal" value={addAmount > 0 ? money(depositQuote.net) : '₹0.00'} />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 14, padding: '0 32px 32px' }}>
              <button onClick={() => setAddOpen(false)} style={CANCEL_BUTTON_STYLE} {...cancelHover}>
                Cancel
              </button>
              <button onClick={processAddFunds} style={{ flex: 2, padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#6366f1,#a855f7)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(99,102,241,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(99,102,241,0.3)'; }}>
                💳 Add Funds Securely
              </button>
            </div>
          </div>
        </div>

        {/* Withdraw Modal */}
        <div id="withdrawModal" style={{ display: withdrawOpen ? 'flex' : 'none', ...OVERLAY_STYLE, padding: '24px 0' }}>
          <div style={{ background: 'white', borderRadius: 28, padding: 40, width: '100%', maxWidth: 500, margin: '0 auto', boxShadow: '0 40px 100px rgba(0,0,0,0.2)', animation: 'slideUp 0.3s ease', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 32 }}>
              <div>
                <h2 style={GRADIENT_TITLE}>Withdraw Funds</h2>
                <p style={{ fontSize: 13, color: '#6b7280' }}>Securely transfer funds to your bank account</p>
              </div>
              <CloseButton onClick={() => setWithdrawOpen(false)} />
            </div>

            {/* Available Balance Info */}
            <div style={{ background: 'linear-gradient(135deg,#f3e8ff,#ede9fe)', border: '1px solid #ddd6fe', borderRadius: 16, padding: 20, marginBottom: 24 }}>
              <div style={{ fontSize: 12, color: '#6b21a8', fontWeight: 600, marginBottom: 6 }}>💰 Available for Withdrawal</div>
              <div style={{ fontSize: 32, fontWeight: 900, color: '#7c3aed', letterSpacing: '-0.02em' }} id="withdrawAvailableDisplay">{withdrawBalanceText}</div>
            </div>

            {/* Withdrawal Amount Input */}
            <div className="form-group" style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: 12 }}>How much would you like to withdraw?</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <span style={{ position: 'absolute', left: 16, fontSize: 18, fontWeight: 600, color: '#7c3aed' }}>₹</span>
                <input type="number" id="withdrawAmount" placeholder="0.00" style={MONEY_INPUT_STYLE}
                       value={withdrawAmount} onChange={e => setWithdrawAmountValue(e.target.value)} {...purpleFocus} />
              </div>
              <div style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>
                Minimum: <strong>₹50</strong> | Maximum: <strong id="maxWithdrawAmt">{withdrawBalanceText}</strong>
              </div>
            </div>

            {/* Quick Amount Selection */}
            <div style={{ marginBottom: 24 }}>
              <label className="form-label" style={{ fontWeight: 600, marginBottom: 10, fontSize: 12 }}>Quick Amounts</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {WITHDRAW_AMOUNTS.map(amt => (
                  <button key={amt} type="button" onClick={() => setWithdrawAmount(amt)}
                          style={{ padding: 10, borderRadius: 10, border: '1px solid #ddd6fe', background: 'white', fontSize: 13, fontWeight: 600, color: '#7c3aed', cursor: 'pointer', transition: 'all 0.2s' }}
                          onMouseEnter={e => { e.currentTarget.style.background = '#f3e8ff'; e.currentTarget.style.borderColor = '#a855f7'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#ddd6fe'; }}>{amt}</button>
                ))}
              </div>
            </div>

            {/* Withdrawal Preview */}
            <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 14, padding: 18, marginBottom: 24 }}>
              <PreviewRow label="Amount to Withdraw" labelStyle={{ fontSize: 13, color: '#6b7280' }} valueStyle={{ fontWeight: 600, color: '#111827', fontSize: 13 }} id="previewAmount" value={money(withdrawValue)} marginBottom={10} />
              <PreviewRow label={`Payout fee (${Store.Fees.rates().withdrawal.percent}% + ₹${Store.Fees.rates().withdrawal.fixed})`} labelStyle={{ fontSize: 13, color: '#6b7280' }} valueStyle={{ fontWeight: 600, color: '#ef4444', fontSize: 13 }} id="withdrawPreviewFee" value={withdrawValue > 0 ? money(withdrawQuote.fee) : '₹0.00'} marginBottom={10} />
              <div style={{ height: 1, background: '#e5e7eb', margin: '10px 0' }}></div>
              <PreviewRow label="You'll Receive" labelStyle={{ fontSize: 14, fontWeight: 700, color: '#111827' }} valueStyle={{ fontSize: 18, fontWeight: 900, background: 'linear-gradient(135deg,#10b981,#059669)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }} id="previewReceive" value={withdrawValue > 0 ? money(withdrawQuote.net) : '₹0.00'} />
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setWithdrawOpen(false)} style={CANCEL_BUTTON_STYLE} {...cancelHover}>
                Cancel
              </button>
              <button onClick={processWithdraw} style={{ flex: 1.5, padding: 14, borderRadius: 12, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s', boxShadow: '0 4px 12px rgba(16,185,129,0.3)' }}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(16,185,129,0.4)'; }} onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 12px rgba(16,185,129,0.3)'; }}>
                ✓ Confirm Withdrawal
              </button>
            </div>
          </div>
        </div>

        {/* All Transactions Modal */}
        <div id="allTransactionsModal" style={{ display: allOpen ? 'flex' : 'none', ...OVERLAY_STYLE, padding: '20px 0' }}>
          <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 600, boxShadow: '0 40px 100px rgba(0,0,0,0.2)', margin: '0 auto', maxHeight: 'calc(100vh - 40px)', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '28px 32px', borderBottom: '1px solid #e5e7eb', background: 'linear-gradient(135deg,#f3e8ff,#ede9fe)' }}>
              <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>All Transactions</h2>
                <p style={{ fontSize: 13, color: '#6b7280', margin: '4px 0 0 0' }}>Complete transaction history</p>
              </div>
              <CloseButton onClick={() => setAllOpen(false)} size={36} iconSize={20} />
            </div>

            {/* Transactions List */}
            <div style={{ padding: '24px 32px', maxHeight: 600, overflowY: 'auto' }} id="allTransactionsListContainer">
              {allTx === null ? <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>Loading transactions...</div>
                : allTx.length === 0 ? <div style={{ padding: 20, textAlign: 'center', color: '#6b7280' }}>No transactions found.</div>
                : allTx.map(t => (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 16, border: '1px solid #e5e7eb', borderRadius: 12, marginBottom: 12, transition: 'all 0.2s' }}
                       onMouseOver={e => { e.currentTarget.style.background = '#f9fafb'; e.currentTarget.style.borderColor = '#d1d5db'; }}
                       onMouseOut={e => { e.currentTarget.style.background = 'white'; e.currentTarget.style.borderColor = '#e5e7eb'; }}>
                    <div className="tx-icon" style={{ background: t.bg, flexShrink: 0 }}>
                      <Icon name={t.icon} style={{ width: 18, height: 18, color: t.color }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{t.label}</div>
                      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>{t.sub}</div>
                    </div>
                    <span className={t.positive ? 'tx-amount-pos' : t.neutral ? '' : 'tx-amount-neg'} style={{ fontSize: 16, fontWeight: 700, ...(t.neutral ? { color: 'var(--muted-foreground)' } : {}) }}>{t.amount}</span>
                  </div>
                ))}
            </div>

            {/* Footer */}
            <div style={{ padding: '20px 32px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', borderRadius: '0 0 20px 20px', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setAllOpen(false)} style={{ padding: '10px 24px', borderRadius: 10, background: 'white', border: '1px solid #e5e7eb', fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', transition: 'all 0.2s' }}
                      onMouseEnter={e => { const s = e.currentTarget.style; s.background = '#f3e8ff'; s.borderColor = '#a855f7'; s.color = '#7c3aed'; }}
                      onMouseLeave={e => { const s = e.currentTarget.style; s.background = 'white'; s.borderColor = '#e5e7eb'; s.color = '#111827'; }}>
                Close
              </button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    </>
  );
}

/**
 * LANNENT — EarningsWallet
 * The wallet for people who are paid on the platform — gig workers and
 * Expert Reviewers. Balance and history come from the server's ledger; the
 * withdrawal fee preview uses the current published rates.
 *
 *   <EarningsWallet role="expert" activePath="/expert-wallet" stats={[...]} />
 */
import { useState } from 'react';
import DashboardLayout from './DashboardLayout';
import FilterTabs from './FilterTabs';
import Icon from './Icon';
import StatCard from './StatCard';
import { useAuth } from '../context/AuthContext';
import { useStore } from '../context/StoreContext';
import { useValidation } from '../context/ValidationContext';
import useRerender from '../hooks/useRerender';
import { newestFirst } from '../utils/helpers';
import { describeTx, TONE_STYLE, money } from '../utils/transactions';

const FILTERS = [['all', 'All'], ['in', 'Money in'], ['out', 'Money out']];
const FILTER_BAR_STYLE = { display: 'flex', gap: 4, background: 'var(--input-bg)', padding: 4, borderRadius: 12 };
const FILTER_BUTTON_STYLE = { padding: '5px 12px', borderRadius: 9, fontSize: 12, fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', border: 'none' };
const MIN_WITHDRAWAL = 50;

function TxRow({ t, viewerId, Store }) {
  const d = describeTx(t, viewerId);
  const s = TONE_STYLE[d.tone] || TONE_STYLE.other;
  const task = t.taskId ? Store.getTaskById(t.taskId) : null;
  return (
    <div className="tx-row">
      <div style={{ width: 40, height: 40, borderRadius: 12, background: `${s.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <Icon name={s.icon} style={{ width: 18, height: 18, color: s.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.label}</div>
        <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>
          {[task ? task.title : t.description, String(t.createdAt || '').slice(0, 10), d.fee ? `fee ${money(d.fee)}` : ''].filter(Boolean).join(' · ')}
        </div>
      </div>
      <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 90 }}>
        <div style={{ fontWeight: 700, color: d.sign < 0 ? '#ef4444' : d.sign > 0 ? '#10b981' : 'var(--muted-foreground)', fontSize: 15 }}>
          {`${d.sign < 0 ? '−' : d.sign > 0 ? '+' : ''}${money(d.amount)}`}
        </div>
      </div>
    </div>
  );
}

/**
 * @param {string} role, activePath, title, subtitle
 * @param {(Store, userId) => Array<{value,label,icon,color}>} stats - the role's own summary tiles
 */
export default function EarningsWallet({ role, activePath, title, subtitle, stats }) {
  const Store = useStore();
  const Auth = useAuth();
  const Validate = useValidation();
  const session = Auth.getCurrentUser();
  const rerender = useRerender();
  const [filter, setFilter] = useState('all');
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [amountError, setAmountError] = useState('');

  const user = Store.getUserById(session.userId);
  const available = user ? user.walletBalance || 0 : 0;
  // Only rows that moved this person's own money.
  const mine = newestFirst(Store.getTransactions().filter(t => t.toId === session.userId || t.fromId === session.userId));
  const rows = mine.filter(t => {
    if (filter === 'all') return true;
    const sign = describeTx(t, session.userId).sign;
    return filter === 'in' ? sign > 0 : sign < 0;
  });

  const amt = parseFloat(amount) || 0;
  const quote = Store.Fees.withdrawal(amt);
  const w = Store.Fees.rates().withdrawal;

  function openWithdraw() {
    setAmount('');
    setAmountError('');
    setWithdrawOpen(true);
  }

  function confirmWithdraw() {
    setAmountError('');
    if (!(amt >= MIN_WITHDRAWAL)) { setAmountError(`The minimum withdrawal is ₹${MIN_WITHDRAWAL}.`); return; }
    if (amt > available) { setAmountError(`That is more than your available balance of ${money(available)}.`); return; }
    let result;
    try {
      result = Store.withdrawFromWallet(session.userId, amt);
    } catch (e) {
      setAmountError(e.message);
      return;
    }
    setWithdrawOpen(false);
    rerender();
    Validate.toast(`Withdrew ${money(result.gross)} — ${money(result.net)} paid out after a ${money(result.fee)} payout fee.`, 'success');
  }

  const tiles = stats(Store, session.userId);

  return (
    <DashboardLayout role={role} activePath={activePath} pageTitle={title} pageSubtitle={subtitle}>
      <div className="wallet-hero" style={{ gridTemplateColumns: '1fr' }}>
        <div className="wallet-hero-card" style={{ background: 'linear-gradient(135deg,#6366f1,#4f46e5)' }}>
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: 13, fontWeight: 500, opacity: 0.85, marginBottom: 8 }}>Available Balance</div>
            <div style={{ fontSize: 38, fontWeight: 900, letterSpacing: '-0.03em', marginBottom: 20 }}>{money(available)}</div>
            <button onClick={openWithdraw} disabled={available < MIN_WITHDRAWAL}
                    title={available < MIN_WITHDRAWAL ? `You need at least ₹${MIN_WITHDRAWAL} to withdraw` : ''}
                    style={{ padding: '9px 22px', borderRadius: 10, background: 'rgba(255,255,255,0.2)', color: 'white', border: '1px solid rgba(255,255,255,0.3)', fontSize: 13, fontWeight: 600, cursor: available < MIN_WITHDRAWAL ? 'not-allowed' : 'pointer', opacity: available < MIN_WITHDRAWAL ? 0.6 : 1 }}>
              Withdraw Funds
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${tiles.length},1fr)`, gap: 16, marginBottom: 24 }}>
        {tiles.map(s => (
          <StatCard key={s.label} value={s.value} valueStyle={{ color: s.color }} label={s.label} icon={s.icon} iconBg={`${s.color}1a`} iconColor={s.color} />
        ))}
      </div>

      <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ fontWeight: 600, fontSize: 15 }}>Transaction History</span>
          <FilterTabs id="earningsFilterBar" tabs={FILTERS} active={filter} onChange={setFilter}
                      barStyle={FILTER_BAR_STYLE} buttonStyle={FILTER_BUTTON_STYLE} nowrap={false} />
        </div>
        <div style={{ padding: '0 24px' }}>
          {!rows.length ? (
            <div style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--muted-foreground)' }}>
              <Icon name="wallet" style={{ width: 40, height: 40, opacity: 0.3, margin: '0 auto 12px', display: 'block' }} />
              <div>No transactions yet.</div>
            </div>
          ) : rows.map(t => <TxRow key={t.id} t={t} viewerId={session.userId} Store={Store} />)}
        </div>
      </div>

      {withdrawOpen && (
        <div style={{ display: 'flex', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)', overflow: 'auto' }}
             onClick={e => { if (e.target === e.currentTarget) setWithdrawOpen(false); }}>
          <div style={{ background: 'white', borderRadius: 24, padding: 26, width: '100%', maxWidth: 480, margin: 18, boxShadow: '0 32px 80px rgba(0,0,0,0.15)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div>
                <h2 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#4f46e5' }}>Withdraw Funds</h2>
                <p style={{ margin: '6px 0 0', fontSize: 14, color: '#6b7280' }}>Available: {money(available)}</p>
              </div>
              <button onClick={() => setWithdrawOpen(false)} aria-label="Close" style={{ width: 34, height: 34, borderRadius: 10, border: 'none', background: '#eef2ff', color: '#4f46e5', cursor: 'pointer', fontSize: 22, lineHeight: 1 }}>×</button>
            </div>
            <label style={{ fontWeight: 700, fontSize: 14 }} htmlFor="withdrawAmount">Amount to withdraw</label>
            <div style={{ marginTop: 10, position: 'relative' }}>
              <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#4f46e5', fontSize: 18, fontWeight: 700 }}>₹</span>
              <input id="withdrawAmount" type="number" min={MIN_WITHDRAWAL} step="0.01" placeholder="0.00" value={amount} onChange={e => setAmount(e.target.value)}
                     style={{ width: '100%', padding: '14px 14px 14px 40px', border: amountError ? '2px solid #ef4444' : '2px solid #e5e7eb', borderRadius: 14, fontSize: 22, fontWeight: 800, outline: 'none', boxSizing: 'border-box' }} />
            </div>
            {amountError && <div style={{ color: '#ef4444', fontSize: 12, marginTop: 6 }}>{amountError}</div>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '12px 0 16px' }}>
              {[100, 500, 1000].filter(v => v <= available).map(v => (
                <button key={v} type="button" onClick={() => setAmount(String(v))} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #c7d2fe', background: 'white', color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>{`₹${v}`}</button>
              ))}
              <button type="button" onClick={() => setAmount(String(available))} style={{ padding: '8px 14px', borderRadius: 10, border: '1px solid #c7d2fe', background: 'white', color: '#4f46e5', fontWeight: 700, cursor: 'pointer' }}>All</button>
            </div>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 16, padding: '14px 16px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>Amount</span><span style={{ fontWeight: 700 }}>{money(amt)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#6b7280' }}>{`Payout fee (${w.percent}% + ₹${w.fixed}, min ₹${w.min})`}</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>{amt > 0 ? money(quote.fee) : money(0)}</span>
              </div>
              <div style={{ height: 1, background: '#eef2ff', margin: '8px 0' }}></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 800 }}>
                <span>You'll receive</span><span style={{ color: '#059669' }}>{amt > 0 ? money(Math.max(0, quote.net)) : money(0)}</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={() => setWithdrawOpen(false)} style={{ flex: 1, padding: 14, border: '1px solid #c7d2fe', borderRadius: 12, background: 'white', fontSize: 15, fontWeight: 700, color: '#4f46e5', cursor: 'pointer' }}>Cancel</button>
              <button onClick={confirmWithdraw} style={{ flex: 1, padding: 14, border: 'none', borderRadius: 12, background: '#22c55e', color: 'white', fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>Withdraw</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

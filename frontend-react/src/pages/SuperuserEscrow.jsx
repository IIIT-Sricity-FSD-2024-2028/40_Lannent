/**
 * LANNENT — SuperuserEscrow (Escrow & Finance)
 * Converted from front-end/pages/superuser-escrow.html.
 *
 * Platform money overview for the super user: finance totals read from the
 * ledger and the transaction log, and a searchable, filterable ledger of
 * every transaction (newest first).
 */
import { useState } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import Icon from '../components/Icon';
import PageStyle from '../components/PageStyle';
import { useStore } from '../context/StoreContext';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './SuperuserEscrow.css?raw';

// Icon + colours + label for each transaction type
const TYPE_CONFIG = {
  'escrow-lock':       { bg: '#eff6ff', color: '#3b82f6', icon: 'lock', label: 'Escrow Lock' },
  'milestone-release': { bg: '#ecfdf5', color: '#10b981', icon: 'check-circle', label: 'Released' },
  'deposit':           { bg: '#faf5ff', color: '#a855f7', icon: 'arrow-down-circle', label: 'Deposit' },
  'refund':            { bg: '#fff7ed', color: '#f97316', icon: 'rotate-ccw', label: 'Refund' },
  'withdrawal':        { bg: '#fef2f2', color: '#ef4444', icon: 'arrow-up-circle', label: 'Withdrawal' },
  'audit-escrow-lock': { bg: '#eef2ff', color: '#6366f1', icon: 'lock', label: 'Audit Escrow' },
  'audit-release':     { bg: '#ecfeff', color: '#0891b2', icon: 'clipboard-check', label: 'Audit Payout' },
  'dispute-escrow-lock': { bg: '#fffbeb', color: '#d97706', icon: 'lock', label: 'Dispute Escrow' },
  'dispute-fee-release': { bg: '#f5f3ff', color: '#8b5cf6', icon: 'scale', label: 'Dispute Payout' },
  'platform-fee':      { bg: '#f0fdfa', color: '#0d9488', icon: 'percent', label: 'Platform Fee' },
  'cancellation-fee':  { bg: '#fff1f2', color: '#e11d48', icon: 'x-circle', label: 'Cancellation Fee' },
};

/** "escrow" and "platform" are ledger accounts, not users. */
const ACCOUNT_NAMES = { escrow: 'Escrow', platform: 'Platform', external: 'Bank / card' };
const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** One finance summary tile. */
function FinanceCard({ label, value, color, sub }) {
  return (
    <div className="finance-card">
      <div className="finance-card-label">{label}</div>
      <div className="finance-card-val" style={color ? { color } : undefined}>{value}</div>
      <div className="finance-card-sub">{sub}</div>
    </div>
  );
}

/** One ledger row. */
function TransactionRow({ tx }) {
  const Store = useStore();
  const from = Store.getUserById(tx.fromId);
  const to = Store.getUserById(tx.toId);
  const task = Store.getTaskById(tx.taskId);
  const tc = TYPE_CONFIG[tx.type] || { bg: '#f1f5f9', color: '#64748b', icon: 'circle', label: tx.type };
  const nameOf = (u, id) => u?.name || ACCOUNT_NAMES[id] || id || '—';
  // Payout rows record what the recipient netted; show the gross and the fee too.
  const grossAmt = tx.grossAmount != null ? tx.grossAmount : tx.amount;
  const fee = tx.type !== 'platform-fee' && tx.type !== 'cancellation-fee' ? Number(tx.feeAmount || 0) : 0;

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="tx-type-icon" style={{ background: tc.bg }}>
            <Icon name={tc.icon} style={{ width: 16, height: 16, color: tc.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{tx.description}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{`${tc.label} · ${tx.createdAt ? String(tx.createdAt).slice(0, 10) : ''}`}</div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 13 }}>{nameOf(from, tx.fromId)}</td>
      <td style={{ fontSize: 13 }}>{nameOf(to, tx.toId)}</td>
      <td style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{task?.title || (tx.taskId ? 'Deleted project' : '—')}</td>
      <td style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>
        {money(grossAmt)}
        {fee > 0 ? <div style={{ fontSize: 11, fontWeight: 400, color: 'var(--muted-foreground)' }}>{`${money(fee)} fee · ${money(tx.netAmount != null ? tx.netAmount : tx.amount)} net`}</div> : null}
      </td>
      <td><span className={`badge ${tx.status === 'completed' ? 'badge-green' : 'badge-orange'}`}>{tx.status}</span></td>
    </tr>
  );
}

export default function SuperuserEscrow() {
  const Store = useStore();
  usePageTitle('Escrow & Finance — Lannent');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const allTx = Store.getTransactions();

  // Escrow and revenue come from the ledger, which is authoritative. Deriving
  // escrow from transaction rows under-counts: a milestone-release row records
  // the NET paid to the worker, while the full gross left escrow.
  const [ledger] = useState(() => Store.getLedgerSummary());
  const escrowBalance = ledger.totalHeld;
  const platformRevenue = ledger.totalRevenue;

  const gross = t => (t.grossAmount != null ? t.grossAmount : t.amount);
  const sumOf = (...types) => allTx.filter(t => types.includes(t.type)).reduce((s, t) => s + gross(t), 0);
  const totalReleased = sumOf('milestone-release');
  const reviewerPaid = sumOf('audit-release', 'dispute-fee-release');
  const totalRefunded = sumOf('refund');
  const totalDeposits = sumOf('deposit');
  const totalWithdrawn = sumOf('withdrawal');
  // The old "Total Volume" added every row together, so each escrowed dollar
  // was counted twice (once locked, once released) — not a real figure.

  // Search + type filter
  const q = search.toLowerCase();
  const filtered = [...allTx].sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))).filter(tx => {
    const from = Store.getUserById(tx.fromId);
    const to = Store.getUserById(tx.toId);
    const task = Store.getTaskById(tx.taskId);
    const matchSearch = !q ||
      String(from?.name || tx.fromId || '').toLowerCase().includes(q) ||
      String(to?.name || tx.toId || '').toLowerCase().includes(q) ||
      (task?.title || '').toLowerCase().includes(q) ||
      (tx.description || '').toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-escrow" pageTitle="Escrow & Finance" pageSubtitle="Monitor all platform transactions and escrow activity">
        <div className="finance-grid">
          <FinanceCard label="Held in Escrow" value={money(escrowBalance)} color="#6366f1" sub="Project, audit and dispute escrow right now" />
          <FinanceCard label="Paid to Workers" value={money(totalReleased)} color="#10b981" sub="Milestone payouts (gross)" />
          <FinanceCard label="Paid to Reviewers" value={money(reviewerPaid)} color="#8b5cf6" sub="Audit and dispute fees (gross)" />
          <FinanceCard label="Refunded to Clients" value={money(totalRefunded)} color="#f97316" sub="Cancellations, unused budget, declined reviews" />
          <FinanceCard label="Client Deposits" value={money(totalDeposits)} color="#a855f7" sub="Wallet top-ups" />
          <FinanceCard label="Withdrawn" value={money(totalWithdrawn)} color="#ef4444" sub="Paid out to users' banks" />
          <FinanceCard label="Platform Revenue" value={money(platformRevenue)} color="#0d9488" sub="All fees earned, incl. cancellation fees" />
        </div>

        <div className="su-toolbar">
          <input className="su-search" id="txSearch" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
          {' '}
          <select className="su-filter" id="txTypeFilter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([value, c]) => <option key={value} value={value}>{c.label}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: 12, fontSize: 13, color: 'var(--muted-foreground)' }}>
          Showing <strong id="txCount">{filtered.length + ' transaction' + (filtered.length !== 1 ? 's' : '')}</strong>
        </div>

        <div className="tx-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Transaction</th>
                <th>From</th>
                <th>To</th>
                <th>Task</th>
                <th>Amount</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="txTableBody">
              {filtered.length ? filtered.map(tx => <TransactionRow key={tx.id} tx={tx} />) : (
                <tr>
                  <td colSpan="6" style={{ padding: 48, textAlign: 'center', color: 'var(--muted-foreground)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <Icon name="wallet" style={{ width: 36, height: 36, opacity: 0.3 }} />
                      <div style={{ fontWeight: 600 }}>No transactions found</div>
                      <div style={{ fontSize: 13 }}>Adjust filters or check back later.</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </DashboardLayout>
    </>
  );
}

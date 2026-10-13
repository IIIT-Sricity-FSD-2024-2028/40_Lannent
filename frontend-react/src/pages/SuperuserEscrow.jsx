/**
 * LANNENT — SuperuserEscrow (Escrow & Finance)
 * Converted from front-end/pages/superuser-escrow.html.
 *
 * Platform money overview for the super user: six finance totals and a
 * searchable, filterable ledger of every transaction.
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
  'dispute-release':   { bg: '#f5f3ff', color: '#8b5cf6', icon: 'scale', label: 'Dispute Release' },
  'audit-escrow-lock': { bg: '#eef2ff', color: '#6366f1', icon: 'lock', label: 'Audit Escrow' },
  'audit-release':     { bg: '#ecfeff', color: '#0891b2', icon: 'clipboard-check', label: 'Audit Payout' },
  'platform-fee':      { bg: '#f0fdfa', color: '#0d9488', icon: 'percent', label: 'Platform Fee' },
};

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
  const isCredit = tx.type === 'deposit' || tx.type === 'milestone-release';

  return (
    <tr>
      <td>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div className="tx-type-icon" style={{ background: tc.bg }}>
            <Icon name={tc.icon} style={{ width: 16, height: 16, color: tc.color }} />
          </div>
          <div>
            <div style={{ fontWeight: 500, fontSize: 13 }}>{tx.description}</div>
            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{tx.createdAt}</div>
          </div>
        </div>
      </td>
      <td style={{ fontSize: 13 }}>{from?.name || tx.fromId}</td>
      <td style={{ fontSize: 13 }}>{to?.name || tx.toId}</td>
      <td style={{ fontSize: 13, color: 'var(--muted-foreground)' }}>{task?.title || '—'}</td>
      <td className={isCredit ? 'amount-credit' : 'amount-debit'}>
        {`${isCredit ? '+' : '-'}$${tx.amount.toLocaleString()}`}
      </td>
      <td><span className="badge badge-green">{tx.status}</span></td>
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
  const totalReleased = allTx.filter(t => t.type === 'milestone-release').reduce((s, t) => s + gross(t), 0);
  const totalDeposits = allTx.filter(t => t.type === 'deposit').reduce((s, t) => s + gross(t), 0);
  const totalWithdrawn = allTx.filter(t => t.type === 'withdrawal').reduce((s, t) => s + gross(t), 0);
  // platform-fee rows restate fees already counted inside other rows.
  const totalVolume = allTx.filter(t => t.type !== 'platform-fee').reduce((s, t) => s + gross(t), 0);

  // Search + type filter
  const q = search.toLowerCase();
  const filtered = allTx.filter(tx => {
    const from = Store.getUserById(tx.fromId);
    const to = Store.getUserById(tx.toId);
    const task = Store.getTaskById(tx.taskId);
    const matchSearch = !q ||
      (from?.name || tx.fromId).toLowerCase().includes(q) ||
      (to?.name || tx.toId).toLowerCase().includes(q) ||
      (task?.title || '').toLowerCase().includes(q) ||
      tx.description.toLowerCase().includes(q);
    const matchType = typeFilter === 'all' || tx.type === typeFilter;
    return matchSearch && matchType;
  });

  return (
    <>
      <PageStyle css={pageCss} />
      <DashboardLayout role="superuser" activePath="/superuser-escrow" pageTitle="Escrow & Finance" pageSubtitle="Monitor all platform transactions and escrow activity">
        <div className="finance-grid">
          <FinanceCard label="Escrow Balance" value={`$${escrowBalance.toLocaleString()}`} color="#6366f1" sub="Currently locked in escrow" />
          <FinanceCard label="Total Released" value={`$${totalReleased.toLocaleString()}`} color="#10b981" sub="Paid to workers" />
          <FinanceCard label="Total Deposits" value={`$${totalDeposits.toLocaleString()}`} color="#a855f7" sub="Client top-ups" />
          <FinanceCard label="Total Withdrawn" value={`$${totalWithdrawn.toLocaleString()}`} color="#ef4444" sub="Paid out to users" />
          <FinanceCard label="Platform Revenue" value={`$${platformRevenue.toLocaleString()}`} color="#0d9488" sub="Fees earned all-time" />
          <FinanceCard label="Total Volume" value={`$${totalVolume.toLocaleString()}`} sub="All-time transaction value" />
        </div>

        <div className="su-toolbar">
          <input className="su-search" id="txSearch" placeholder="Search transactions..." value={search} onChange={e => setSearch(e.target.value)} />
          {' '}
          <select className="su-filter" id="txTypeFilter" value={typeFilter} onChange={e => setTypeFilter(e.target.value)}>
            <option value="all">All Types</option>
            <option value="escrow-lock">Escrow Lock</option>
            <option value="milestone-release">Milestone Release</option>
            <option value="deposit">Deposit</option>
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

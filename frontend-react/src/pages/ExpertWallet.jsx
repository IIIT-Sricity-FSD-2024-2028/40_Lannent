/**
 * LANNENT — ExpertWallet (Expert Reviewer earnings)
 *
 * What a reviewer has been paid for technical audits and dispute reviews, the
 * fees still held in escrow for engagements in progress, and withdrawals.
 */
import EarningsWallet from '../components/EarningsWallet';
import PageStyle from '../components/PageStyle';
import { useSelector } from 'react-redux';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerWallet.css?raw';
import { money } from '../utils/transactions';
import { selectAllTransactions } from '../store/slices/transactionsSlice';
import { selectAllAuditRequests } from '../store/slices/auditRequestsSlice';

/** Summary tiles, from the transactions and audit-requests slices. */
function useExpertStats(userId) {
  const txs = useSelector(selectAllTransactions);
  const auditRequests = useSelector(selectAllAuditRequests);
  const sumNet = rows => rows.reduce((s, t) => s + (t.netAmount != null ? t.netAmount : t.amount || 0), 0);
  const audits = txs.filter(t => t.type === 'audit-release' && t.toId === userId);
  const disputes = txs.filter(t => t.type === 'dispute-fee-release' && t.toId === userId);
  // Agreed fees already funded into escrow for work this reviewer is doing.
  const pending = auditRequests
    .filter(a => a.expertId === userId && ['escrow-funded', 'in-progress'].includes(a.status) && !a.feePaid)
    .reduce((s, a) => s + (a.agreedAmount || 0), 0);
  return [
    { value: money(sumNet(audits)), label: 'Earned from audits', icon: 'shield-check', color: '#6366f1' },
    { value: money(sumNet(disputes)), label: 'Earned from disputes', icon: 'scale', color: '#a855f7' },
    { value: money(pending), label: 'Fees held in escrow for you', icon: 'lock', color: '#f59e0b' },
  ];
}

export default function ExpertWallet() {
  usePageTitle('Wallet — Lannent');
  return (
    <>
      <PageStyle css={pageCss} />
      <EarningsWallet role="expert" activePath="/expert-wallet" title="Wallet"
                      subtitle="Your audit and dispute earnings, and withdrawals" useStats={useExpertStats} />
    </>
  );
}

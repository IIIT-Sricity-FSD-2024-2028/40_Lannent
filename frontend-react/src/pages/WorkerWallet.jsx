/**
 * LANNENT — WorkerWallet (Wallet & Earnings)
 *
 * The worker's balance, what they have earned, what is waiting on the client,
 * what is held in escrow for their contracts, and every movement of their
 * own money — with withdrawals. Figures come from the server's ledger.
 */
import EarningsWallet from '../components/EarningsWallet';
import PageStyle from '../components/PageStyle';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import usePageTitle from '../hooks/usePageTitle';
import pageCss from './WorkerWallet.css?raw';
import { money } from '../utils/transactions';
import { selectAllTransactions } from '../store/slices/transactionsSlice';
import { selectTasksByWorker } from '../store/slices/tasksSlice';
import { selectAllMilestones } from '../store/slices/milestonesSlice';
import { fetchMyEscrow, selectMyEscrow } from '../store/slices/ledgerSlice';

/** Summary tiles, from the transactions, tasks, milestones and ledger slices. */
function useWorkerStats(userId) {
  const dispatch = useDispatch();
  useEffect(() => { dispatch(fetchMyEscrow()); }, [dispatch]);
  const txs = useSelector(selectAllTransactions);
  const myTasks = useSelector(s => selectTasksByWorker(s, userId));
  const milestones = useSelector(selectAllMilestones);
  const myEscrow = useSelector(selectMyEscrow);
  const earned = txs.filter(t => t.type === 'milestone-release' && t.toId === userId);
  const net = earned.reduce((s, t) => s + (t.netAmount != null ? t.netAmount : t.amount || 0), 0);
  const fees = earned.reduce((s, t) => s + (t.feeAmount || 0), 0);
  const awaiting = myTasks.reduce((s, t) => s + milestones.filter(m => m.taskId === t.id)
    .filter(m => ['submitted', 'review'].includes(m.status))
    .reduce((a, m) => a + (m.budget || 0), 0), 0);
  // What the client has already put behind this worker's open milestones.
  const escrow = (myEscrow ? myEscrow.projects : [])
    .filter(p => myTasks.some(t => t.id === p.taskId))
    .reduce((s, p) => s + p.projectHeld, 0);
  return [
    { value: money(net), label: 'Total earned', icon: 'trending-up', color: '#6366f1' },
    { value: money(awaiting), label: 'Awaiting approval', icon: 'clock', color: '#f59e0b' },
    { value: money(escrow), label: 'Held in escrow for you', icon: 'lock', color: '#a855f7' },
    { value: money(fees), label: 'Service fees paid', icon: 'percent', color: '#64748b' },
  ];
}

export default function WorkerWallet() {
  usePageTitle('Wallet & Earnings — Lannent');
  return (
    <>
      <PageStyle css={pageCss} />
      <EarningsWallet role="worker" activePath="/worker-wallet" title="Wallet & Earnings"
                      subtitle="Track your earnings and manage withdrawals" useStats={useWorkerStats} />
    </>
  );
}

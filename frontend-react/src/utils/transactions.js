/**
 * How a ledger row reads to the person looking at it.
 *
 * Every money movement on the platform is one of these rows, written by the
 * server. A wallet page used to label them by guessing — every non-withdrawal
 * was "Released", so a refund, an escrow hold and a fee all looked like income.
 *
 * Returns { label, detail, amount, sign, tone } where sign is +1 (money in to
 * the viewer), -1 (money out of the viewer's wallet) or 0 (a movement on the
 * viewer's project that did not touch their wallet).
 */
export function describeTx(t, viewerId) {
  const toMe = t.toId === viewerId;
  const fromMe = t.fromId === viewerId;
  const net = t.netAmount != null ? t.netAmount : t.amount || 0;
  const gross = t.grossAmount != null ? t.grossAmount : t.amount || 0;

  switch (t.type) {
    case 'deposit':
      return { label: 'Wallet top-up', amount: net, sign: toMe ? 1 : 0, tone: 'in', fee: t.feeAmount };
    case 'withdrawal':
      return { label: 'Withdrawal', amount: gross, sign: fromMe ? -1 : 0, tone: 'out', fee: t.feeAmount };
    case 'escrow-lock':
      return { label: 'Project budget held in escrow', amount: net, sign: fromMe ? -1 : 0, tone: 'escrow' };
    case 'platform-fee':
      return { label: 'Marketplace & contract fees', amount: t.amount || 0, sign: fromMe ? -1 : 0, tone: 'fee' };
    case 'audit-escrow-lock':
      return { label: 'Audit fee held in escrow', amount: net, sign: fromMe ? -1 : 0, tone: 'escrow' };
    case 'dispute-escrow-lock':
      return { label: 'Dispute reviewer fee held in escrow', amount: net, sign: fromMe ? -1 : 0, tone: 'escrow' };
    case 'milestone-release':
      return toMe
        ? { label: 'Milestone payment', amount: net, sign: 1, tone: 'in', fee: t.feeAmount }
        : { label: 'Released to the worker', amount: gross, sign: 0, tone: 'released' };
    case 'audit-release':
      return toMe
        ? { label: 'Audit fee received', amount: net, sign: 1, tone: 'in', fee: t.feeAmount }
        : { label: 'Audit fee paid to the reviewer', amount: gross, sign: 0, tone: 'released' };
    case 'dispute-fee-release':
      return toMe
        ? { label: 'Dispute review fee received', amount: net, sign: 1, tone: 'in', fee: t.feeAmount }
        : { label: 'Dispute fee paid to the reviewer', amount: gross, sign: 0, tone: 'released' };
    case 'cancellation-fee':
      // Kept out of the project's escrow — the wallet itself does not change.
      return { label: 'Cancellation fee (kept from escrow)', amount: t.amount || 0, sign: 0, tone: 'fee' };
    case 'refund':
      return toMe
        ? { label: t.bucket === 'dispute' ? 'Dispute fee refunded' : t.bucket === 'audit' ? 'Audit fee refunded' : 'Refund from escrow', amount: t.amount || 0, sign: 1, tone: 'refund' }
        : { label: 'Refunded from escrow', amount: t.amount || 0, sign: 0, tone: 'refund' };
    default:
      return { label: t.type || 'Transaction', amount: t.amount || 0, sign: toMe ? 1 : fromMe ? -1 : 0, tone: 'other' };
  }
}

export const TONE_STYLE = {
  in: { icon: 'arrow-down-circle', color: '#10b981', badge: 'badge-green', text: 'Received' },
  out: { icon: 'arrow-up-circle', color: '#ef4444', badge: 'badge-red', text: 'Withdrawn' },
  escrow: { icon: 'lock', color: '#6366f1', badge: 'badge-blue', text: 'In escrow' },
  fee: { icon: 'percent', color: '#f97316', badge: 'badge-orange', text: 'Fee' },
  released: { icon: 'unlock', color: '#10b981', badge: 'badge-green', text: 'Released' },
  refund: { icon: 'rotate-ccw', color: '#0ea5e9', badge: 'badge-blue', text: 'Refund' },
  other: { icon: 'circle', color: '#64748b', badge: 'badge-gray', text: '' },
};

export const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

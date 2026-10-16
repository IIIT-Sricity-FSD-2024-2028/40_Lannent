import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerRepository, EscrowBucket } from './ledger.repository';
import { AppLoggerService } from '../../common/logging/app-logger.service';
import {
  round2,
  depositFee,
  withdrawalFee,
  marketplaceFee,
  initiationFee,
  workerServiceRate,
  FEE_CONFIG,
  AmountTier,
  resetFeeConfig,
} from './fee-config';

/**
 * LedgerService — the only place money moves.
 *
 * Before this existed, `escrow` was a string on a transaction row: funding a
 * project never debited the client, and approving a milestone credited the
 * worker with no matching debit, so the system minted money. Every method here
 * debits, credits, records the platform's fee and writes the transaction rows
 * together, so the books balance:
 *
 *   deposits - withdrawals = wallet balances + escrow held + platform revenue
 */
@Injectable()
export class LedgerService {
  constructor(
    private readonly ledger: LedgerRepository,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    @Inject(forwardRef(() => TransactionsService)) private readonly transactions: TransactionsService,
    private readonly log: AppLoggerService,
  ) {}

  private balanceOf(userId: string): number {
    const u = this.users.findById(userId);
    return u?.walletBalance ?? 0;
  }

  private requireFunds(userId: string, amount: number, what: string) {
    const balance = this.balanceOf(userId);
    if (balance < amount) {
      throw new BadRequestException(
        `Insufficient wallet balance for ${what}. Required ₹${round2(amount)}, available ₹${round2(balance)}.`,
      );
    }
  }

  // ── Wallet in and out ─────────────────────────────────────────────────────

  /** Tops up a wallet. The platform keeps card processing; the user is credited the net. */
  deposit(userId: string, gross: number) {
    if (gross <= 0) throw new BadRequestException('Deposit amount must be greater than zero.');
    const fee = depositFee(gross);
    if (fee >= gross) {
      throw new BadRequestException(
        `Deposit of ₹${round2(gross)} does not cover the ₹${fee} processing fee.`,
      );
    }
    const net = round2(gross - fee);

    this.users.addToWallet(userId, net);
    this.ledger.recordRevenue({
      feeType: 'deposit-processing',
      amount: fee,
      baseAmount: gross,
      rate: FEE_CONFIG.deposit.percent,
      fromUserId: userId,
      taskId: null,
      milestoneId: null,
    });
    this.transactions.create({
      type: 'deposit',
      amount: net,
      grossAmount: gross,
      feeAmount: fee,
      netAmount: net,
      feeType: 'deposit-processing',
      fromId: 'external',
      toId: userId,
      description: `Wallet top-up (₹${gross} less ₹${fee} processing fee)`,
      status: 'completed',
    });

    this.log.money('deposit', {
      user: userId, gross, fee, net, balance: this.balanceOf(userId),
    });
    return { gross, fee, net, balance: this.balanceOf(userId) };
  }

  /** Withdraws to an external account. The full gross leaves the wallet; the payout fee is ours. */
  withdraw(userId: string, gross: number) {
    if (gross <= 0) throw new BadRequestException('Withdrawal amount must be greater than zero.');
    const fee = withdrawalFee(gross);
    if (fee >= gross) {
      throw new BadRequestException(
        `Withdrawal of ₹${round2(gross)} does not cover the ₹${fee} payout fee.`,
      );
    }
    this.requireFunds(userId, gross, 'this withdrawal');
    const net = round2(gross - fee);

    this.users.deductFromWallet(userId, gross);
    this.ledger.recordRevenue({
      feeType: 'withdrawal-processing',
      amount: fee,
      baseAmount: gross,
      rate: FEE_CONFIG.withdrawal.percent,
      fromUserId: userId,
      taskId: null,
      milestoneId: null,
    });
    this.transactions.create({
      type: 'withdrawal',
      amount: gross,
      grossAmount: gross,
      feeAmount: fee,
      netAmount: net,
      feeType: 'withdrawal-processing',
      fromId: userId,
      toId: 'external',
      description: `Withdrawal (₹${gross} less ₹${fee} payout fee)`,
      status: 'completed',
    });

    this.log.money('withdraw', {
      user: userId, gross, fee, net, balance: this.balanceOf(userId),
    });
    return { gross, fee, net, balance: this.balanceOf(userId) };
  }

  // ── Escrow in ─────────────────────────────────────────────────────────────

  /**
   * Moves a project's budget from the client's wallet into project escrow.
   *
   * This happens when the project is posted, so the money behind every
   * milestone is held from the start — a worker never accepts a contract the
   * client has not already paid for. No fee is taken here; the marketplace and
   * contract-initiation fees are charged when someone is hired, because that
   * is when a contract exists. A project cancelled before hiring therefore
   * gets every cent back.
   */
  fundProjectBudget(taskId: string, clientId: string, budget: number, taskTitle = 'project') {
    if (budget <= 0) throw new BadRequestException('Project budget must be greater than zero.');
    this.requireFunds(clientId, budget, 'funding this project');
    this.users.deductFromWallet(clientId, budget);
    this.ledger.addProjectHeld(taskId, budget);

    this.transactions.create({
      type: 'escrow-lock',
      amount: budget,
      grossAmount: budget,
      feeAmount: 0,
      netAmount: budget,
      fromId: clientId,
      toId: 'escrow',
      taskId,
      description: `Project budget held in escrow for ${taskTitle}`,
      status: 'completed',
    });

    this.log.money('escrow.fund.project', {
      task: taskId, client: clientId, budget, held: this.ledger.getEscrow(taskId).projectHeld,
    });
    return { budget, held: this.ledger.getEscrow(taskId) };
  }

  /**
   * Charges the client the marketplace and contract-initiation fees when a
   * worker is hired. If the project's escrow does not already cover the
   * budget (a project posted before budgets were held up front), the
   * shortfall is funded in the same step so the contract is fully backed.
   */
  chargeContractFees(taskId: string, clientId: string, budget: number, taskTitle = 'project') {
    if (budget <= 0) throw new BadRequestException('Project budget must be greater than zero.');
    const marketplace = marketplaceFee(budget);
    const initiation = initiationFee(budget);
    const fees = round2(marketplace + initiation);
    const shortfall = round2(Math.max(0, budget - this.ledger.getEscrow(taskId).projectHeld));

    this.requireFunds(clientId, round2(fees + shortfall), 'hiring for this project');
    if (shortfall > 0) this.fundProjectBudget(taskId, clientId, shortfall, taskTitle);

    this.users.deductFromWallet(clientId, fees);
    this.ledger.recordRevenue({
      feeType: 'client-marketplace',
      amount: marketplace,
      baseAmount: budget,
      rate: FEE_CONFIG.clientMarketplace.percent,
      fromUserId: clientId,
      taskId,
      milestoneId: null,
    });
    this.ledger.recordRevenue({
      feeType: 'contract-initiation',
      amount: initiation,
      baseAmount: budget,
      rate: 0,
      fromUserId: clientId,
      taskId,
      milestoneId: null,
    });
    this.transactions.create({
      type: 'platform-fee',
      amount: fees,
      grossAmount: fees,
      feeAmount: fees,
      netAmount: 0,
      feeType: 'client-marketplace',
      fromId: clientId,
      toId: 'platform',
      taskId,
      description: `Marketplace fee ₹${marketplace} + contract initiation ₹${initiation} — ${taskTitle}`,
      status: 'completed',
    });

    this.log.money('contract.fees', {
      task: taskId, client: clientId, budget, marketplace, initiation, toppedUp: shortfall,
    });
    return {
      budget, marketplace, initiation, fees, toppedUp: shortfall,
      totalCharged: round2(fees + shortfall), held: this.ledger.getEscrow(taskId),
    };
  }

  /**
   * Refuses a hire the client cannot pay for, before anything moves: the
   * difference between what is held and the agreed price, plus the fees on
   * that price. Checking piece by piece could refund or top up escrow and then
   * fail on the fees.
   */
  assertCanStartContract(taskId: string, clientId: string, price: number) {
    const held = this.ledger.getEscrow(taskId).projectHeld;
    const topUp = round2(Math.max(0, price - held));
    const fees = round2(marketplaceFee(price) + initiationFee(price));
    this.requireFunds(clientId, round2(topUp + fees), 'hiring at this price');
  }

  /** The worker fee schedule as it stands now — stored on a contract when it starts. */
  workerServiceSnapshot(): AmountTier[] {
    return FEE_CONFIG.workerService.map(t => ({ ...t }));
  }

  /** The reviewer commission as it stands now — stored on an engagement when it is funded. */
  expertCommissionSnapshot(): number {
    return FEE_CONFIG.expertService.percent;
  }

  /**
   * Funds the budget and charges the contract fees in one step — the client
   * pays the budget plus fees; only the budget is held.
   */
  fundProjectEscrow(taskId: string, clientId: string, budget: number, taskTitle = 'project') {
    if (budget <= 0) throw new BadRequestException('Project budget must be greater than zero.');
    const total = round2(budget + marketplaceFee(budget) + initiationFee(budget));
    this.requireFunds(clientId, total, 'funding this project');
    this.fundProjectBudget(taskId, clientId, budget, taskTitle);
    const fees = this.chargeContractFees(taskId, clientId, budget, taskTitle);
    return {
      budget, marketplace: fees.marketplace, initiation: fees.initiation,
      totalCharged: total, held: this.ledger.getEscrow(taskId),
    };
  }

  /**
   * Keeps the cancellation fee from a cancelled project's escrow. It goes to
   * the platform, like any other fee; whatever is left is refunded after.
   */
  chargeCancellationFee(params: { taskId: string; clientId: string; amount: number; rate: number; base: number; title: string }) {
    const { taskId, clientId, rate, base, title } = params;
    const held = this.ledger.getEscrow(taskId).projectHeld;
    const fee = round2(Math.min(params.amount, held));
    if (fee <= 0) return null;

    this.ledger.addProjectHeld(taskId, -fee);
    this.ledger.recordRevenue({
      feeType: 'cancellation',
      amount: fee,
      baseAmount: base,
      rate,
      fromUserId: clientId,
      taskId,
      milestoneId: null,
    });
    this.transactions.create({
      type: 'cancellation-fee',
      amount: fee,
      grossAmount: fee,
      feeAmount: fee,
      netAmount: 0,
      feeType: 'cancellation',
      bucket: 'project',
      fromId: clientId,
      toId: 'platform',
      taskId,
      description: `Cancellation fee (${rate}% of ₹${base}) — ${title}`,
      status: 'completed',
    });
    this.log.money('cancellation.fee', { task: taskId, client: clientId, rate: `${rate}%`, base, fee });
    return { fee, rate, base };
  }

  /**
   * Funds a reviewer's agreed fee into escrow — the technical-audit bucket or
   * the dispute bucket. Held apart from project funds and from each other, so
   * a dispute fee is never mistaken for the audit fee.
   */
  fundAuditEscrow(
    taskId: string,
    payerId: string,
    auditFee: number,
    label = 'technical audit',
    bucket: 'audit' | 'dispute' = 'audit',
  ) {
    if (auditFee <= 0) throw new BadRequestException('Reviewer fee must be greater than zero.');
    this.requireFunds(payerId, auditFee, `funding this ${bucket === 'dispute' ? 'dispute review' : 'audit'}`);

    this.users.deductFromWallet(payerId, auditFee);
    this.ledger.addHeld(taskId, bucket, auditFee);

    this.transactions.create({
      type: bucket === 'dispute' ? 'dispute-escrow-lock' : 'audit-escrow-lock',
      amount: auditFee,
      grossAmount: auditFee,
      feeAmount: 0,
      netAmount: auditFee,
      fromId: payerId,
      toId: 'escrow',
      taskId,
      description: `Escrow funded for ${label}`,
      status: 'completed',
    });

    this.log.money(`escrow.fund.${bucket}`, {
      task: taskId, payer: payerId, fee: auditFee, held: this.ledger.held(taskId, bucket),
    });
    return { auditFee, held: this.ledger.getEscrow(taskId) };
  }

  // ── Escrow out ────────────────────────────────────────────────────────────

  /**
   * Releases a milestone to the worker, net of the tiered service fee.
   * Idempotent: a second call for the same milestone is a no-op, so double
   * approval cannot pay twice.
   */
  releaseMilestone(params: {
    milestoneId: string;
    taskId: string;
    clientId: string;
    workerId: string;
    amount: number;
    description?: string;
    /** The fee schedule agreed when the contract started. Defaults to today's. */
    workerServiceTiers?: AmountTier[];
  }) {
    const { milestoneId, taskId, clientId, workerId, amount } = params;

    if (this.ledger.isMilestoneReleased(milestoneId)) {
      // Not an error — the guard is doing its job — but a second approval
      // arriving at all is worth seeing in the log.
      this.log.money('milestone.release.skipped', {
        milestone: milestoneId, task: taskId, reason: 'already-released',
      });
      return { alreadyReleased: true, amount: 0, fee: 0, net: 0 };
    }
    if (amount <= 0) throw new BadRequestException('Milestone amount must be greater than zero.');
    if (!workerId) throw new BadRequestException('Milestone has no worker to pay.');

    const held = this.ledger.getEscrow(taskId).projectHeld;
    if (held < amount) {
      throw new BadRequestException(
        `Escrow for this project holds ₹${round2(held)}, which does not cover the ₹${round2(amount)} milestone.`,
      );
    }

    // A rate change by the revenue desk applies to contracts started after
    // it, not to work a worker already agreed to at the old rate.
    const priorBillings = this.ledger.getBillings(clientId, workerId);
    const rate = workerServiceRate(priorBillings, params.workerServiceTiers);
    const fee = round2(amount * (rate / 100));
    const net = round2(amount - fee);

    this.ledger.addProjectHeld(taskId, -amount);
    this.users.addToWallet(workerId, net);
    this.ledger.addBillings(clientId, workerId, amount);
    this.ledger.markMilestoneReleased(milestoneId);

    this.ledger.recordRevenue({
      feeType: 'worker-service',
      amount: fee,
      baseAmount: amount,
      rate,
      fromUserId: workerId,
      taskId,
      milestoneId,
    });
    this.transactions.create({
      type: 'milestone-release',
      amount: net,
      grossAmount: amount,
      feeAmount: fee,
      netAmount: net,
      feeType: 'worker-service',
      fromId: 'escrow',
      toId: workerId,
      taskId,
      milestoneId,
      description: params.description || `Payment released (₹${amount} less ${rate}% service fee)`,
      status: 'completed',
    });

    this.log.money('milestone.release', {
      milestone: milestoneId, task: taskId, client: clientId, worker: workerId,
      gross: amount, fee, rate: `${rate}%`, net,
      held: this.ledger.getEscrow(taskId).projectHeld,
    });
    return { alreadyReleased: false, amount, fee, rate, net, balance: this.balanceOf(workerId) };
  }

  /**
   * Pays the reviewer their agreed fee from the audit or dispute bucket, net
   * of commission. Idempotent per engagement.
   */
  releaseAuditFee(params: {
    auditRequestId: string;
    taskId: string;
    expertId: string;
    amount: number;
    description?: string;
    bucket?: 'audit' | 'dispute';
    /** What makes this payout unique. One per engagement, or one per audited milestone. */
    payoutKey?: string;
    /** The commission agreed when the fee was funded. Defaults to today's. */
    commissionPercent?: number;
  }) {
    const { auditRequestId, taskId, expertId, amount } = params;
    const bucket = params.bucket || 'audit';
    const key = params.payoutKey || auditRequestId;

    if (this.ledger.isAuditPaid(key)) {
      this.log.money('audit.release.skipped', {
        audit: auditRequestId, task: taskId, reason: 'already-paid',
      });
      return { alreadyPaid: true, amount: 0, fee: 0, net: 0 };
    }
    if (amount <= 0) throw new BadRequestException('Agreed reviewer fee must be greater than zero.');
    if (!expertId) throw new BadRequestException('This engagement has no reviewer to pay.');

    const held = this.ledger.held(taskId, bucket);
    if (held < amount) {
      throw new BadRequestException(
        `${bucket === 'dispute' ? 'Dispute' : 'Audit'} escrow holds ₹${round2(held)}, which does not cover the agreed fee of ₹${round2(amount)}.`,
      );
    }

    const commission = params.commissionPercent ?? FEE_CONFIG.expertService.percent;
    const fee = round2(amount * (commission / 100));
    const net = round2(amount - fee);

    this.ledger.addHeld(taskId, bucket, -amount);
    this.users.addToWallet(expertId, net);
    this.ledger.markAuditPaid(key);

    this.ledger.recordRevenue({
      feeType: 'expert-service',
      amount: fee,
      baseAmount: amount,
      rate: commission,
      fromUserId: expertId,
      taskId,
      milestoneId: null,
    });
    this.transactions.create({
      type: bucket === 'dispute' ? 'dispute-fee-release' : 'audit-release',
      amount: net,
      grossAmount: amount,
      feeAmount: fee,
      netAmount: net,
      feeType: 'expert-service',
      fromId: 'escrow',
      toId: expertId,
      taskId,
      auditRequestId,
      description:
        params.description ||
        `${bucket === 'dispute' ? 'Dispute review' : 'Audit'} fee released (₹${amount} less ${commission}% commission)`,
      status: 'completed',
    });

    this.log.money(`${bucket}.release`, {
      audit: auditRequestId, task: taskId, expert: expertId,
      gross: amount, fee, net, held: this.ledger.held(taskId, bucket),
    });
    return { alreadyPaid: false, amount, fee, net, balance: this.balanceOf(expertId) };
  }

  /**
   * Returns held project funds to the client. Marketplace and initiation fees
   * are not refunded, which matches how the major marketplaces treat them.
   */
  refundToClient(params: { taskId: string; clientId: string; amount: number; reason?: string }) {
    return this.refundFrom('project', params.taskId, params.clientId, params.amount, params.reason || 'Escrow refunded to client');
  }

  /** Returns unspent reviewer escrow (audit or dispute bucket) to whoever paid it. */
  refundAuditEscrow(params: {
    taskId: string;
    clientId: string;
    amount: number;
    reason?: string;
    bucket?: 'audit' | 'dispute';
  }) {
    const bucket = params.bucket || 'audit';
    return this.refundFrom(
      bucket, params.taskId, params.clientId, params.amount,
      params.reason || `${bucket === 'dispute' ? 'Dispute' : 'Audit'} escrow refunded`,
    );
  }

  /**
   * Returns everything still held for a task, bucket by bucket, to the people
   * who paid it. Used when a project ends with money left over (a cancelled
   * project, or a completed one whose milestones did not use the full budget).
   */
  refundRemaining(taskId: string, clientId: string, reason: string, buckets: EscrowBucket[] = ['project']) {
    const refunds: any[] = [];
    for (const bucket of buckets) {
      const held = this.ledger.held(taskId, bucket);
      if (held > 0) refunds.push(this.refundFrom(bucket, taskId, clientId, held, reason));
    }
    return refunds;
  }

  private refundFrom(bucket: EscrowBucket, taskId: string, toId: string, amount: number, reason: string) {
    if (amount <= 0) throw new BadRequestException('Refund amount must be greater than zero.');
    const held = this.ledger.held(taskId, bucket);
    if (held < amount) {
      throw new BadRequestException(
        `Escrow for this ${bucket === 'project' ? 'project' : bucket + ' fee'} holds ₹${round2(held)}, which does not cover a ₹${round2(amount)} refund.`,
      );
    }

    this.ledger.addHeld(taskId, bucket, -amount);
    this.users.addToWallet(toId, amount);

    this.transactions.create({
      type: 'refund',
      amount,
      grossAmount: amount,
      feeAmount: 0,
      netAmount: amount,
      bucket,
      fromId: 'escrow',
      toId,
      taskId,
      description: reason,
      status: 'completed',
    });

    this.log.money(`refund.${bucket}`, {
      task: taskId, to: toId, amount, held: this.ledger.held(taskId, bucket), reason,
    });
    return { amount, bucket, balance: this.balanceOf(toId) };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────
  getEscrow(taskId: string) {
    return this.ledger.getEscrow(taskId);
  }
  /** The current fee rates, for previews. Rates only — nothing about who paid what. */
  feeRates() {
    return JSON.parse(JSON.stringify(FEE_CONFIG, (_k, v) => (v === Infinity ? null : v)));
  }
  allEscrow() {
    return this.ledger.allEscrow();
  }
  totalHeld() {
    return this.ledger.totalHeld();
  }
  getRevenue() {
    return this.ledger.getRevenue();
  }
  totalRevenue() {
    return this.ledger.totalRevenue();
  }
  isMilestoneReleased(milestoneId: string) {
    return this.ledger.isMilestoneReleased(milestoneId);
  }
  getBillings(clientId: string, workerId: string) {
    return this.ledger.getBillings(clientId, workerId);
  }

  resetToSeed() {
    this.ledger.resetToSeed();
    // Rates are part of the known state a reset restores.
    resetFeeConfig();
  }
}

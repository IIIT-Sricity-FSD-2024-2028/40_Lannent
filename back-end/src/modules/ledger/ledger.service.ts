import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerRepository } from './ledger.repository';
import { AppLoggerService } from '../../common/logging/app-logger.service';
import {
  round2,
  depositFee,
  withdrawalFee,
  marketplaceFee,
  initiationFee,
  workerServiceFee,
  workerServiceRate,
  expertServiceFee,
  FEE_CONFIG,
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
        `Insufficient wallet balance for ${what}. Required $${round2(amount)}, available $${round2(balance)}.`,
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
        `Deposit of $${round2(gross)} does not cover the $${fee} processing fee.`,
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
      description: `Wallet top-up ($${gross} less $${fee} processing fee)`,
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
        `Withdrawal of $${round2(gross)} does not cover the $${fee} payout fee.`,
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
      description: `Withdrawal ($${gross} less $${fee} payout fee)`,
      status: 'completed',
    });

    this.log.money('withdraw', {
      user: userId, gross, fee, net, balance: this.balanceOf(userId),
    });
    return { gross, fee, net, balance: this.balanceOf(userId) };
  }

  // ── Escrow in ─────────────────────────────────────────────────────────────

  /**
   * Funds project escrow when a worker is hired. The client pays the budget
   * plus the marketplace and contract-initiation fees; only the budget is held.
   */
  fundProjectEscrow(taskId: string, clientId: string, budget: number, taskTitle = 'project') {
    if (budget <= 0) throw new BadRequestException('Project budget must be greater than zero.');
    const marketplace = marketplaceFee(budget);
    const initiation = initiationFee(budget);
    const total = round2(budget + marketplace + initiation);

    this.requireFunds(clientId, total, 'funding this project');
    this.users.deductFromWallet(clientId, total);
    this.ledger.addProjectHeld(taskId, budget);

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
      type: 'escrow-lock',
      amount: budget,
      grossAmount: total,
      feeAmount: round2(marketplace + initiation),
      netAmount: budget,
      fromId: clientId,
      toId: 'escrow',
      taskId,
      description: `Escrow funded for ${taskTitle}`,
      status: 'completed',
    });
    this.transactions.create({
      type: 'platform-fee',
      amount: round2(marketplace + initiation),
      feeAmount: round2(marketplace + initiation),
      feeType: 'client-marketplace',
      fromId: clientId,
      toId: 'platform',
      taskId,
      description: `Marketplace fee $${marketplace} + contract initiation $${initiation}`,
      status: 'completed',
    });

    this.log.money('escrow.fund.project', {
      task: taskId, client: clientId, budget, marketplace, initiation,
      charged: total, held: this.ledger.getEscrow(taskId).projectHeld,
    });
    return { budget, marketplace, initiation, totalCharged: total, held: this.ledger.getEscrow(taskId) };
  }

  /** Funds the expert reviewer's agreed audit fee into escrow. Held separately from project funds. */
  fundAuditEscrow(taskId: string, clientId: string, auditFee: number, label = 'technical audit') {
    if (auditFee <= 0) throw new BadRequestException('Audit fee must be greater than zero.');
    this.requireFunds(clientId, auditFee, 'funding this audit');

    this.users.deductFromWallet(clientId, auditFee);
    this.ledger.addAuditHeld(taskId, auditFee);

    this.transactions.create({
      type: 'audit-escrow-lock',
      amount: auditFee,
      fromId: clientId,
      toId: 'escrow',
      taskId,
      description: `Escrow funded for ${label}`,
      status: 'completed',
    });

    this.log.money('escrow.fund.audit', {
      task: taskId, client: clientId, fee: auditFee,
      held: this.ledger.getEscrow(taskId).auditHeld,
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
        `Escrow for this project holds $${round2(held)}, which does not cover the $${round2(amount)} milestone.`,
      );
    }

    const priorBillings = this.ledger.getBillings(clientId, workerId);
    const rate = workerServiceRate(priorBillings);
    const fee = workerServiceFee(amount, priorBillings);
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
      description: params.description || `Payment released ($${amount} less ${rate}% service fee)`,
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
   * Pays the expert reviewer their agreed fee from audit escrow, net of
   * commission. Idempotent per audit request.
   */
  releaseAuditFee(params: {
    auditRequestId: string;
    taskId: string;
    expertId: string;
    amount: number;
    description?: string;
  }) {
    const { auditRequestId, taskId, expertId, amount } = params;

    if (this.ledger.isAuditPaid(auditRequestId)) {
      this.log.money('audit.release.skipped', {
        audit: auditRequestId, task: taskId, reason: 'already-paid',
      });
      return { alreadyPaid: true, amount: 0, fee: 0, net: 0 };
    }
    if (amount <= 0) throw new BadRequestException('Agreed audit fee must be greater than zero.');
    if (!expertId) throw new BadRequestException('Audit has no expert to pay.');

    const held = this.ledger.getEscrow(taskId).auditHeld;
    if (held < amount) {
      throw new BadRequestException(
        `Audit escrow holds $${round2(held)}, which does not cover the agreed fee of $${round2(amount)}.`,
      );
    }

    const fee = expertServiceFee(amount);
    const net = round2(amount - fee);

    this.ledger.addAuditHeld(taskId, -amount);
    this.users.addToWallet(expertId, net);
    this.ledger.markAuditPaid(auditRequestId);

    this.ledger.recordRevenue({
      feeType: 'expert-service',
      amount: fee,
      baseAmount: amount,
      rate: FEE_CONFIG.expertService.percent,
      fromUserId: expertId,
      taskId,
      milestoneId: null,
    });
    this.transactions.create({
      type: 'audit-release',
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
        `Audit fee released ($${amount} less ${FEE_CONFIG.expertService.percent}% commission)`,
      status: 'completed',
    });

    this.log.money('audit.release', {
      audit: auditRequestId, task: taskId, expert: expertId,
      gross: amount, fee, net, held: this.ledger.getEscrow(taskId).auditHeld,
    });
    return { alreadyPaid: false, amount, fee, net, balance: this.balanceOf(expertId) };
  }

  /**
   * Returns held project funds to the client. Marketplace and initiation fees
   * are not refunded, which matches how the major marketplaces treat them.
   */
  refundToClient(params: { taskId: string; clientId: string; amount: number; reason?: string }) {
    const { taskId, clientId, amount } = params;
    if (amount <= 0) throw new BadRequestException('Refund amount must be greater than zero.');

    const held = this.ledger.getEscrow(taskId).projectHeld;
    if (held < amount) {
      throw new BadRequestException(
        `Escrow for this project holds $${round2(held)}, which does not cover a $${round2(amount)} refund.`,
      );
    }

    this.ledger.addProjectHeld(taskId, -amount);
    this.users.addToWallet(clientId, amount);

    this.transactions.create({
      type: 'refund',
      amount,
      fromId: 'escrow',
      toId: clientId,
      taskId,
      description: params.reason || 'Escrow refunded to client',
      status: 'completed',
    });

    this.log.money('refund.project', {
      task: taskId, client: clientId, amount,
      held: this.ledger.getEscrow(taskId).projectHeld, reason: params.reason,
    });
    return { amount, balance: this.balanceOf(clientId) };
  }

  /** Returns unspent audit escrow to the client — e.g. an abandoned draft project. */
  refundAuditEscrow(params: { taskId: string; clientId: string; amount: number; reason?: string }) {
    const { taskId, clientId, amount } = params;
    if (amount <= 0) throw new BadRequestException('Refund amount must be greater than zero.');

    const held = this.ledger.getEscrow(taskId).auditHeld;
    if (held < amount) {
      throw new BadRequestException(
        `Audit escrow holds $${round2(held)}, which does not cover a $${round2(amount)} refund.`,
      );
    }

    this.ledger.addAuditHeld(taskId, -amount);
    this.users.addToWallet(clientId, amount);

    this.transactions.create({
      type: 'refund',
      amount,
      fromId: 'escrow',
      toId: clientId,
      taskId,
      description: params.reason || 'Audit escrow refunded to client',
      status: 'completed',
    });

    this.log.money('refund.audit', {
      task: taskId, client: clientId, amount,
      held: this.ledger.getEscrow(taskId).auditHeld, reason: params.reason,
    });
    return { amount, balance: this.balanceOf(clientId) };
  }

  // ── Reads ─────────────────────────────────────────────────────────────────
  getEscrow(taskId: string) {
    return this.ledger.getEscrow(taskId);
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
  getBillings(clientId: string, workerId: string) {
    return this.ledger.getBillings(clientId, workerId);
  }

  resetToSeed() {
    this.ledger.resetToSeed();
    // Rates are part of the known state a reset restores.
    resetFeeConfig();
  }
}

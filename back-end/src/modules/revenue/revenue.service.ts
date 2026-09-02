import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { FEE_CONFIG, round2 } from '../ledger/fee-config';
import { UpdateFeeConfigDto } from './dto/update-fee-config.dto';

/** Money that left escrow and reached a person. */
const PAYOUT_TYPES = ['milestone-release', 'audit-release'];

/**
 * RevenueService — read-only aggregation over the ledger, plus fee tuning.
 *
 * Everything here is derived from `LedgerService`'s revenue entries and the
 * transaction rows; nothing is stored twice. `grossAmount` is used wherever a
 * total is needed, because a payout row records the NET the recipient received.
 */
@Injectable()
export class RevenueService {
  constructor(
    @Inject(forwardRef(() => LedgerService)) private readonly ledger: LedgerService,
    @Inject(forwardRef(() => TransactionsService)) private readonly transactions: TransactionsService,
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
  ) {}

  private gross(t: any): number {
    return t.grossAmount ?? t.amount ?? 0;
  }

  /** Total value delivered to workers and reviewers — the platform's GMV. */
  private grossVolume(): number {
    return round2(
      this.transactions
        .findAll()
        .filter((t: any) => PAYOUT_TYPES.includes(t.type))
        .reduce((a: number, t: any) => a + this.gross(t), 0),
    );
  }

  summary() {
    const totalRevenue = this.ledger.totalRevenue();
    const grossVolume = this.grossVolume();
    const allTasks = this.tasks.findAll({ status: undefined } as any) || [];

    return {
      totalRevenue,
      grossVolume,
      // What share of the value flowing through the platform the platform keeps.
      takeRate: grossVolume > 0 ? round2((totalRevenue / grossVolume) * 100) : 0,
      escrowHeld: this.ledger.totalHeld(),
      activeContracts: allTasks.filter((t: any) => t.status === 'in-progress').length,
      draftProjects: allTasks.filter((t: any) => t.status === 'draft').length,
      feeEvents: this.ledger.getRevenue().length,
    };
  }

  byFeeType() {
    const rows: Record<string, { feeType: string; total: number; count: number; baseTotal: number }> = {};
    for (const r of this.ledger.getRevenue()) {
      rows[r.feeType] ||= { feeType: r.feeType, total: 0, count: 0, baseTotal: 0 };
      rows[r.feeType].total = round2(rows[r.feeType].total + r.amount);
      rows[r.feeType].baseTotal = round2(rows[r.feeType].baseTotal + r.baseAmount);
      rows[r.feeType].count++;
    }
    const total = this.ledger.totalRevenue();
    return Object.values(rows)
      .map((r) => ({ ...r, share: total > 0 ? round2((r.total / total) * 100) : 0 }))
      .sort((a, b) => b.total - a.total);
  }

  /** Revenue bucketed over time. `period` is day | week | month. */
  timeseries(period = 'day') {
    const bucketOf = (iso: string) => {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      if (period === 'month') return iso.slice(0, 7);
      if (period === 'week') {
        // Bucket to the Monday of that week.
        const day = (d.getUTCDay() + 6) % 7;
        d.setUTCDate(d.getUTCDate() - day);
        return d.toISOString().slice(0, 10);
      }
      return iso.slice(0, 10);
    };

    const buckets: Record<string, { period: string; revenue: number; events: number }> = {};
    for (const r of this.ledger.getRevenue()) {
      const key = bucketOf(r.createdAt);
      buckets[key] ||= { period: key, revenue: 0, events: 0 };
      buckets[key].revenue = round2(buckets[key].revenue + r.amount);
      buckets[key].events++;
    }
    return Object.values(buckets).sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Per-user money movement — the "how much each user receives" view.
   * Providers see gross earned, fees paid and net received; clients see what
   * they funded and what the platform charged them on top.
   */
  byUser() {
    const txs = this.transactions.findAll();
    const revenue = this.ledger.getRevenue();

    return this.users
      .findAll()
      .map((u: any) => {
        const payouts = txs.filter((t: any) => PAYOUT_TYPES.includes(t.type) && t.toId === u.id);
        const grossEarned = round2(payouts.reduce((a: number, t: any) => a + this.gross(t), 0));
        const netReceived = round2(payouts.reduce((a: number, t: any) => a + (t.netAmount ?? t.amount ?? 0), 0));

        const deposits = txs.filter((t: any) => t.type === 'deposit' && t.toId === u.id);
        const withdrawals = txs.filter((t: any) => t.type === 'withdrawal' && t.fromId === u.id);
        const escrowFunded = txs.filter(
          (t: any) => ['escrow-lock', 'audit-escrow-lock'].includes(t.type) && t.fromId === u.id,
        );

        const feesPaid = round2(
          revenue.filter((r) => r.fromUserId === u.id).reduce((a, r) => a + r.amount, 0),
        );

        return {
          userId: u.id,
          name: u.name,
          role: u.role,
          avatar: u.avatar,
          avatarColor: u.avatarColor,
          walletBalance: u.walletBalance,
          grossEarned,
          netReceived,
          feesPaid,
          totalDeposited: round2(deposits.reduce((a: number, t: any) => a + this.gross(t), 0)),
          totalWithdrawn: round2(withdrawals.reduce((a: number, t: any) => a + this.gross(t), 0)),
          escrowFunded: round2(escrowFunded.reduce((a: number, t: any) => a + this.gross(t), 0)),
          // Effective rate this user paid on what they earned.
          effectiveRate: grossEarned > 0 ? round2((feesPaid / grossEarned) * 100) : 0,
        };
      })
      .filter((r) => r.grossEarned > 0 || r.feesPaid > 0 || r.escrowFunded > 0 || r.totalDeposited > 0)
      .sort((a, b) => b.grossEarned - a.grossEarned);
  }

  /**
   * Where every dollar that entered escrow ended up. The buckets are mutually
   * exclusive and sum to the total funded, so the chart always adds up.
   */
  distribution() {
    const txs = this.transactions.findAll();
    const sum = (rows: any[], pick = (t: any) => this.gross(t)) =>
      round2(rows.reduce((a: number, t: any) => a + pick(t), 0));

    // An escrow-lock row's grossAmount is what the client was charged in total
    // (budget + marketplace + initiation); only netAmount entered escrow.
    const funded = sum(
      txs.filter((t: any) => ['escrow-lock', 'audit-escrow-lock'].includes(t.type)),
      (t) => t.netAmount ?? t.amount ?? 0,
    );
    const workerNet = sum(
      txs.filter((t: any) => t.type === 'milestone-release'),
      (t) => t.netAmount ?? t.amount ?? 0,
    );
    const expertNet = sum(
      txs.filter((t: any) => t.type === 'audit-release'),
      (t) => t.netAmount ?? t.amount ?? 0,
    );
    const refunded = sum(txs.filter((t: any) => t.type === 'refund'));

    // Only fees taken out of escrow belong in this split; deposit and
    // withdrawal fees never entered it.
    const escrowFees = round2(
      this.ledger
        .getRevenue()
        .filter((r) => ['worker-service', 'expert-service'].includes(r.feeType))
        .reduce((a, r) => a + r.amount, 0),
    );
    const stillHeld = this.ledger.totalHeld();

    const segments = [
      { label: 'Paid to workers', amount: workerNet },
      { label: 'Paid to reviewers', amount: expertNet },
      { label: 'Platform commission', amount: escrowFees },
      { label: 'Refunded to clients', amount: refunded },
      { label: 'Still held in escrow', amount: stillHeld },
    ];
    const accounted = round2(segments.reduce((a, s) => a + s.amount, 0));

    return {
      totalFunded: funded,
      accounted,
      // Non-zero only if the ledger and the transaction log disagree.
      unaccounted: round2(funded - accounted),
      segments: segments.map((s) => ({
        ...s,
        share: funded > 0 ? round2((s.amount / funded) * 100) : 0,
      })),
    };
  }

  // ── Fee configuration ─────────────────────────────────────────────────────

  getFeeConfig() {
    return {
      deposit: FEE_CONFIG.deposit,
      clientMarketplace: FEE_CONFIG.clientMarketplace,
      contractInitiation: FEE_CONFIG.contractInitiation,
      workerService: FEE_CONFIG.workerService,
      expertService: FEE_CONFIG.expertService,
      withdrawal: FEE_CONFIG.withdrawal,
    };
  }

  /**
   * Applies rate changes in place. Existing revenue entries keep the rate they
   * were charged at — changing a rate never rewrites history.
   */
  updateFeeConfig(dto: UpdateFeeConfigDto) {
    if (dto.depositPercent !== undefined) FEE_CONFIG.deposit.percent = dto.depositPercent;
    if (dto.depositFixed !== undefined) FEE_CONFIG.deposit.fixed = dto.depositFixed;
    if (dto.clientMarketplacePercent !== undefined) {
      FEE_CONFIG.clientMarketplace.percent = dto.clientMarketplacePercent;
    }
    if (dto.expertServicePercent !== undefined) FEE_CONFIG.expertService.percent = dto.expertServicePercent;
    if (dto.withdrawalPercent !== undefined) FEE_CONFIG.withdrawal.percent = dto.withdrawalPercent;
    if (dto.withdrawalFixed !== undefined) FEE_CONFIG.withdrawal.fixed = dto.withdrawalFixed;

    if (dto.workerServicePercents) {
      if (dto.workerServicePercents.length !== FEE_CONFIG.workerService.length) {
        throw new BadRequestException(
          `Expected ${FEE_CONFIG.workerService.length} worker service tiers, received ${dto.workerServicePercents.length}.`,
        );
      }
      dto.workerServicePercents.forEach((p, i) => {
        if (typeof p !== 'number' || p < 0 || p > 100) {
          throw new BadRequestException(`Worker service tier ${i + 1} must be between 0 and 100.`);
        }
        FEE_CONFIG.workerService[i].percent = p;
      });
    }

    if (dto.contractInitiationFees) {
      if (dto.contractInitiationFees.length !== FEE_CONFIG.contractInitiation.length) {
        throw new BadRequestException(
          `Expected ${FEE_CONFIG.contractInitiation.length} initiation bands, received ${dto.contractInitiationFees.length}.`,
        );
      }
      dto.contractInitiationFees.forEach((f, i) => {
        if (typeof f !== 'number' || f < 0) {
          throw new BadRequestException(`Initiation band ${i + 1} must be zero or greater.`);
        }
        FEE_CONFIG.contractInitiation[i].fee = f;
      });
    }

    return this.getFeeConfig();
  }
}

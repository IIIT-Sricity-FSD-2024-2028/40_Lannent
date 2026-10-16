import { Injectable, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { TransactionsService } from '../transactions/transactions.service';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { AuditService } from '../audit/audit.service';
import { FEE_CONFIG, round2 } from '../ledger/fee-config';
import { UpdateFeeConfigDto } from './dto/update-fee-config.dto';

/** Money that left escrow and reached a person. */
const PAYOUT_TYPES = ['milestone-release', 'audit-release', 'dispute-fee-release'];
/** Money that entered escrow. */
const LOCK_TYPES = ['escrow-lock', 'audit-escrow-lock', 'dispute-escrow-lock'];

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
    @Inject(forwardRef(() => AuditRequestsService)) private readonly auditRequests: AuditRequestsService,
    private readonly audit: AuditService,
  ) {}

  private safe<T>(fn: () => T): T | null {
    try { return fn(); } catch { return null; }
  }

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
    // 'system' includes drafts. The viewer-less call hid them, so
    // `draftProjects` always reported 0.
    const allTasks = this.tasks.findAll({}, 'system');

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
          (t: any) => LOCK_TYPES.includes(t.type) && t.fromId === u.id,
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
          escrowFunded: round2(escrowFunded.reduce((a: number, t: any) => a + (t.netAmount ?? t.amount ?? 0), 0)),
          // Effective rate this user paid on what they earned.
          effectiveRate: grossEarned > 0 ? round2((feesPaid / grossEarned) * 100) : 0,
        };
      })
      .filter((r) => r.grossEarned > 0 || r.feesPaid > 0 || r.escrowFunded > 0 || r.totalDeposited > 0)
      .sort((a, b) => b.grossEarned - a.grossEarned);
  }

  /**
   * Where every rupee that entered escrow ended up. The buckets are mutually
   * exclusive and sum to the total funded, so the chart always adds up.
   */
  distribution() {
    const txs = this.transactions.findAll();
    const sum = (rows: any[], pick = (t: any) => this.gross(t)) =>
      round2(rows.reduce((a: number, t: any) => a + pick(t), 0));

    // An escrow-lock row's grossAmount is what the client was charged in total
    // (budget + marketplace + initiation); only netAmount entered escrow.
    const funded = sum(
      txs.filter((t: any) => LOCK_TYPES.includes(t.type)),
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
    const disputeNet = sum(
      txs.filter((t: any) => t.type === 'dispute-fee-release'),
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
    const cancellationFees = round2(
      this.ledger
        .getRevenue()
        .filter((r) => r.feeType === 'cancellation')
        .reduce((a, r) => a + r.amount, 0),
    );
    const stillHeld = this.ledger.totalHeld();

    const segments = [
      { label: 'Paid to workers', amount: workerNet },
      { label: 'Paid to reviewers (audits)', amount: expertNet },
      { label: 'Paid to reviewers (disputes)', amount: disputeNet },
      { label: 'Platform commission', amount: escrowFees },
      { label: 'Cancellation fees', amount: cancellationFees },
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

  /** One row per project, for the Admin list. */
  byProject() {
    const txs = this.transactions.findAll();
    const revenue = this.ledger.getRevenue();
    const taskIds = new Set<string>();
    txs.forEach((t: any) => t.taskId && taskIds.add(t.taskId));
    revenue.forEach((r) => r.taskId && taskIds.add(r.taskId));

    return [...taskIds]
      .map((taskId) => {
        const task = this.safe(() => this.tasks.findById(taskId));
        const rev = round2(
          revenue.filter((r) => r.taskId === taskId).reduce((a, r) => a + r.amount, 0),
        );
        const funded = round2(
          txs
            .filter((t: any) => LOCK_TYPES.includes(t.type) && t.taskId === taskId)
            .reduce((a: number, t: any) => a + (t.netAmount ?? t.amount ?? 0), 0),
        );
        return {
          taskId,
          title: task?.title || 'Unknown project',
          status: task?.status || 'unknown',
          clientId: task?.clientId || null,
          budget: task?.budget || 0,
          funded,
          platformRevenue: rev,
          escrowHeld: round2(
            this.ledger.getEscrow(taskId).projectHeld +
            this.ledger.getEscrow(taskId).auditHeld +
            this.ledger.getEscrow(taskId).disputeHeld,
          ),
        };
      })
      .sort((a, b) => b.platformRevenue - a.platformRevenue);
  }

  /**
   * The complete money flow for one project: what the client paid in, what each
   * party took out, and what the platform kept — split so an audit payout can be
   * told apart from a dispute payout.
   */
  projectBreakdown(taskId: string) {
    const task = this.tasks.findById(taskId);
    const txs = this.transactions.findAll().filter((t: any) => t.taskId === taskId);
    const revenue = this.ledger.getRevenue().filter((r) => r.taskId === taskId);
    const escrow = this.ledger.getEscrow(taskId);

    const sum = (rows: any[], pick: (t: any) => number) => round2(rows.reduce((a, t) => a + pick(t), 0));
    const gross = (t: any) => t.grossAmount ?? t.amount ?? 0;
    const net = (t: any) => t.netAmount ?? t.amount ?? 0;
    const feeOf = (type: string) =>
      round2(revenue.filter((r) => r.feeType === type).reduce((a, r) => a + r.amount, 0));

    // Audit and dispute fees move through separate escrow buckets and are
    // recorded under separate transaction types, so they are never summed.
    const auditRows = txs.filter((t: any) => t.type === 'audit-release');
    const disputeRows = txs.filter((t: any) => t.type === 'dispute-fee-release');

    const escrowLocks = txs.filter((t: any) => t.type === 'escrow-lock');
    const auditLocks = txs.filter((t: any) => t.type === 'audit-escrow-lock');
    const disputeLocks = txs.filter((t: any) => t.type === 'dispute-escrow-lock');
    const releases = txs.filter((t: any) => t.type === 'milestone-release');
    const refunds = txs.filter((t: any) => t.type === 'refund');

    const client = task.clientId ? this.safe(() => this.users.findById(task.clientId)) : null;
    const worker = task.workerId ? this.safe(() => this.users.findById(task.workerId)) : null;
    const nameOf = (id: string) => this.safe(() => this.users.findById(id))?.name || id;

    const marketplace = feeOf('client-marketplace');
    const initiation = feeOf('contract-initiation');
    const workerFees = feeOf('worker-service');
    const expertFees = feeOf('expert-service');
    const cancellationFee = feeOf('cancellation');
    const platformRevenue = round2(marketplace + initiation + workerFees + expertFees + cancellationFee);

    return {
      project: {
        id: task.id, title: task.title, status: task.status,
        category: task.category, budget: task.budget,
        client: client ? { id: client.id, name: client.name } : null,
        worker: worker ? { id: worker.id, name: worker.name } : null,
      },

      // What the client paid in
      clientPaid: {
        intoProjectEscrow: sum(escrowLocks, net),
        intoAuditEscrow: sum(auditLocks, net),
        // Only clients raise disputes, so only clients pay dispute reviewers.
        intoDisputeEscrow: sum(disputeLocks, net),
        marketplaceFee: marketplace,
        initiationFee: initiation,
        total: round2(
          sum(escrowLocks, net) + sum(auditLocks, net) + sum(disputeLocks, net) + marketplace + initiation,
        ),
      },

      // What the gig worker took out
      worker: {
        name: worker?.name || null,
        grossReleased: sum(releases, gross),
        serviceFees: workerFees,
        netReceived: sum(releases, net),
        milestonesPaid: releases.length,
      },

      // Reviewer money, split by what earned it
      reviewerAudit: {
        grossFees: sum(auditRows, gross),
        commission: round2(sum(auditRows, gross) - sum(auditRows, net)),
        netReceived: sum(auditRows, net),
        count: auditRows.length,
        reviewers: [...new Set(auditRows.map((t: any) => t.toId))].map(nameOf),
      },
      reviewerDispute: {
        grossFees: sum(disputeRows, gross),
        commission: round2(sum(disputeRows, gross) - sum(disputeRows, net)),
        netReceived: sum(disputeRows, net),
        count: disputeRows.length,
        reviewers: [...new Set(disputeRows.map((t: any) => t.toId))].map(nameOf),
      },

      refunded: sum(refunds, gross),
      refundedToClient: sum(refunds.filter((t: any) => t.toId === task.clientId), gross),
      stillHeld: { project: escrow.projectHeld, audit: escrow.auditHeld, dispute: escrow.disputeHeld,
                   total: round2(escrow.projectHeld + escrow.auditHeld + escrow.disputeHeld) },

      platformEarnings: {
        marketplaceFee: marketplace,
        initiationFee: initiation,
        workerServiceFees: workerFees,
        reviewerCommission: expertFees,
        cancellationFee,
        total: platformRevenue,
      },

      ledger: txs.map((t: any) => ({
        id: t.id, type: t.type, gross: gross(t), fee: t.feeAmount ?? 0, net: net(t),
        from: t.fromId, to: t.toId, description: t.description, createdAt: t.createdAt,
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
      cancellation: FEE_CONFIG.cancellation,
    };
  }

  /**
   * Applies rate changes in place. Existing revenue entries keep the rate they
   * were charged at — changing a rate never rewrites history.
   *
   * A rate change alters what every user on the platform is charged, and this
   * recorded nothing about who made it. With one admin that was survivable;
   * with a dedicated revenue desk, "who cut the worker fee to 2%?" needs an
   * answer. Before and after are captured and written to the audit trail.
   */
  updateFeeConfig(dto: UpdateFeeConfigDto) {
    // A snapshot, not a reference. `getFeeConfig()` hands back the live
    // FEE_CONFIG objects, so the rates below would mutate `before` too and
    // every diff would come out empty.
    const before = structuredClone(this.getFeeConfig());

    // Validate the whole request before changing anything. The tier arrays
    // were checked while being applied, so a bad third value threw after the
    // scalar rates and the first tiers had already changed — a half-applied
    // update, with no audit record because the throw skipped it.
    const tiers = FEE_CONFIG.workerService.length;
    const bands = FEE_CONFIG.contractInitiation.length;
    if (dto.workerServicePercents) {
      if (!Array.isArray(dto.workerServicePercents) || dto.workerServicePercents.length !== tiers) {
        throw new BadRequestException(`Expected ${tiers} worker service tiers.`);
      }
      dto.workerServicePercents.forEach((p, i) => {
        if (typeof p !== 'number' || !Number.isFinite(p) || p < 0 || p > 100) {
          throw new BadRequestException(`Worker service tier ${i + 1} must be between 0 and 100.`);
        }
      });
    }
    const freeHours = dto.cancellationFreeHours ?? FEE_CONFIG.cancellation.freeHours;
    const earlyDays = dto.cancellationEarlyDays ?? FEE_CONFIG.cancellation.earlyDays;
    if (earlyDays * 24 < freeHours) {
      throw new BadRequestException('The early-cancellation window must end after the free window.');
    }
    if (dto.contractInitiationFees) {
      if (!Array.isArray(dto.contractInitiationFees) || dto.contractInitiationFees.length !== bands) {
        throw new BadRequestException(`Expected ${bands} initiation bands.`);
      }
      dto.contractInitiationFees.forEach((f, i) => {
        if (typeof f !== 'number' || !Number.isFinite(f) || f < 0) {
          throw new BadRequestException(`Initiation band ${i + 1} must be zero or greater.`);
        }
      });
    }

    if (dto.depositPercent !== undefined) FEE_CONFIG.deposit.percent = dto.depositPercent;
    if (dto.depositFixed !== undefined) FEE_CONFIG.deposit.fixed = dto.depositFixed;
    if (dto.clientMarketplacePercent !== undefined) {
      FEE_CONFIG.clientMarketplace.percent = dto.clientMarketplacePercent;
    }
    if (dto.expertServicePercent !== undefined) FEE_CONFIG.expertService.percent = dto.expertServicePercent;
    if (dto.withdrawalPercent !== undefined) FEE_CONFIG.withdrawal.percent = dto.withdrawalPercent;
    if (dto.withdrawalFixed !== undefined) FEE_CONFIG.withdrawal.fixed = dto.withdrawalFixed;
    dto.workerServicePercents?.forEach((p, i) => { FEE_CONFIG.workerService[i].percent = p; });
    dto.contractInitiationFees?.forEach((f, i) => { FEE_CONFIG.contractInitiation[i].fee = f; });
    if (dto.cancellationFreeHours !== undefined) FEE_CONFIG.cancellation.freeHours = dto.cancellationFreeHours;
    if (dto.cancellationEarlyDays !== undefined) FEE_CONFIG.cancellation.earlyDays = dto.cancellationEarlyDays;
    if (dto.cancellationEarlyPercent !== undefined) FEE_CONFIG.cancellation.earlyPercent = dto.cancellationEarlyPercent;
    if (dto.cancellationLatePercent !== undefined) FEE_CONFIG.cancellation.latePercent = dto.cancellationLatePercent;

    const after = this.getFeeConfig();
    this.audit.record({
      kind: 'fee.change',
      outcome: 'ok',
      detail: { changed: diffRates(before, after) },
    });
    return after;
  }
}

/**
 * Which rates actually moved, as `{ before, after }` per field. Recording the
 * whole config on every change would bury the one number that mattered.
 */
function diffRates(before: any, after: any, path = ''): Record<string, any> {
  const out: Record<string, any> = {};
  for (const key of new Set([...Object.keys(before || {}), ...Object.keys(after || {})])) {
    const a = before?.[key];
    const b = after?.[key];
    const where = path ? `${path}.${key}` : key;
    if (a && b && typeof a === 'object' && typeof b === 'object') {
      Object.assign(out, diffRates(a, b, where));
    } else if (a !== b) {
      out[where] = { before: a, after: b };
    }
  }
  return out;
}

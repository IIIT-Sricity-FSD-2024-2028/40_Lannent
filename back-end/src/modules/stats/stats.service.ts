import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { TasksService } from '../tasks/tasks.service';
import { TransactionsService } from '../transactions/transactions.service';
import { LedgerService } from '../ledger/ledger.service';
import { DisputesService } from '../disputes/disputes.service';
import { round2 } from '../ledger/fee-config';

/**
 * StatsService — the few platform-wide figures the public landing pages show.
 *
 * The landing pages used to advertise invented numbers ("12,500+ freelancers",
 * "$24M escrow", "98.5% satisfaction") and testimonials from people who do not
 * exist. Everything here is counted from the live records instead, and only
 * aggregates go out.
 */
@Injectable()
export class StatsService {
  constructor(
    @Inject(forwardRef(() => UsersService)) private readonly users: UsersService,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
    @Inject(forwardRef(() => TransactionsService)) private readonly transactions: TransactionsService,
    @Inject(forwardRef(() => LedgerService)) private readonly ledger: LedgerService,
    @Inject(forwardRef(() => DisputesService)) private readonly disputes: DisputesService,
  ) {}

  publicStats() {
    const users = this.users.findAll().filter((u: any) => u.status === 'active');
    const tasks = this.tasks.findAll({}, 'system').filter((t: any) => t.status !== 'draft');
    const txs = this.transactions.findAll();
    const gross = (t: any) => t.grossAmount ?? t.amount ?? 0;
    const sum = (types: string[]) => round2(txs.filter((t: any) => types.includes(t.type)).reduce((a: number, t: any) => a + gross(t), 0));

    const disputes = this.disputes.findAll();

    return {
      clients: users.filter((u: any) => u.role === 'client').length,
      workers: users.filter((u: any) => u.role === 'worker').length,
      experts: users.filter((u: any) => u.role === 'expert').length,
      projectsPosted: tasks.length,
      projectsCompleted: tasks.filter((t: any) => t.status === 'completed').length,
      projectsInProgress: tasks.filter((t: any) => t.status === 'in-progress').length,
      paidToWorkers: sum(['milestone-release']),
      paidToReviewers: sum(['audit-release', 'dispute-fee-release']),
      auditsCompleted: txs.filter((t: any) => t.type === 'audit-release').length,
      disputesResolved: disputes.filter((d: any) => d.status === 'resolved').length,
      escrowHeld: this.ledger.totalHeld(),
    };
  }
}

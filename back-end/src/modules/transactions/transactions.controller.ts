import { Controller, Get, Query, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { TransactionsService } from './transactions.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';
import { ROLES } from '../../common/constants/roles';
import { TasksService } from '../tasks/tasks.service';

/** Desks whose job includes the whole ledger. */
const LEDGER_READERS: string[] = [ROLES.SUPERUSER, ROLES.REVENUE_ADMIN, ROLES.COMPLIANCE_ADMIN];

/**
 * Read-only.
 *
 * `POST /transactions` was removed. It let any client or worker append any
 * row they liked — a $50,000 "milestone-release" to themselves showed up in
 * every revenue report. Every real movement is written by LedgerService
 * alongside the balance change that justifies it, so nothing else needs to.
 */
@ApiTags('Transactions')
@Controller('transactions')
@UseGuards(RoleGuard)
export class TransactionsController {
  constructor(
    private readonly transactionsService: TransactionsService,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Your transactions (ledger staff may read all, or one user\'s with ?userId=)' })
  @ApiQuery({ name: 'userId', required: false })
  findAll(@CurrentActor() actor: Actor, @Query('userId') userId?: string) {
    if (LEDGER_READERS.includes(actor.role)) return this.transactionsService.findAll({ userId });

    // Everyone's payments used to be readable by everyone. Now: your own rows,
    // plus every movement on a project you are the client or worker of — the
    // client's wallet shows the releases paid out of their escrow, and the
    // worker's shows the escrow funded for their contract, neither of which
    // names the viewer as sender or recipient.
    // A client sees every movement on the projects they pay for (the
    // releases to their worker included). Anyone else sees only money that
    // moved to or from them — a worker used to see the client's escrow,
    // fees and refunds on every shared project.
    const mine = new Set(
      this.tasks
        .findAll({}, 'system')
        .filter((t: any) => t.clientId === actor.id)
        .map((t: any) => t.id),
    );
    return this.transactionsService
      .findAll()
      .filter((t: any) => t.fromId === actor.id || t.toId === actor.id || (t.taskId && mine.has(t.taskId)));
  }
}

import { Controller, Get, Param, UseGuards, Inject, forwardRef } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';
import { assertCanViewTask } from '../../common/guards/viewer.util';
import { TasksService } from '../tasks/tasks.service';
import { round2 } from './fee-config';

/** Escrow, platform revenue totals, and the published fee rates. */
@ApiTags('Ledger')
@Controller('ledger')
@UseGuards(RoleGuard)
export class LedgerController {
  constructor(
    private readonly ledger: LedgerService,
    @Inject(forwardRef(() => TasksService)) private readonly tasks: TasksService,
  ) {}

  @Get('summary')
  // The authoritative financial state. The revenue desk needs it to reconcile
  // the model it owns — every /revenue figure is derived from these totals, so
  // granting the derived view while withholding the source would leave that
  // desk unable to check its own numbers.
  @Roles('superuser', 'revenue-admin', 'compliance-admin')
  @ApiOperation({ summary: 'Escrow held and platform revenue totals' })
  summary() {
    return {
      totalHeld: this.ledger.totalHeld(),
      totalRevenue: this.ledger.totalRevenue(),
      escrowByTask: this.ledger.allEscrow(),
      revenueEntries: this.ledger.getRevenue(),
    };
  }

  /**
   * The rates every form previews a charge with. Public rates, not revenue —
   * every signed-in user is charged by them, so every signed-in user may read
   * them. Previews used to hardcode the defaults and went wrong the moment
   * the revenue desk changed a rate.
   */
  @Get('fee-rates')
  @ApiOperation({ summary: 'Current fee rates, for previews' })
  feeRates() {
    return this.ledger.feeRates();
  }

  /** Escrow held on every project the caller is a party to, bucket by bucket. */
  @Get('my-escrow')
  @ApiOperation({ summary: 'Escrow held on your projects' })
  myEscrow(@CurrentActor() actor: Actor) {
    const rows = this.tasks
      .findAll({}, 'system')
      .filter((t: any) => t.clientId === actor.id || t.workerId === actor.id)
      .map((t: any) => {
        const e = this.ledger.getEscrow(t.id);
        return {
          taskId: t.id,
          title: t.title,
          status: t.status,
          projectHeld: e.projectHeld,
          auditHeld: e.auditHeld,
          disputeHeld: e.disputeHeld,
          total: round2(e.projectHeld + e.auditHeld + e.disputeHeld),
        };
      });
    const sum = (k: 'projectHeld' | 'auditHeld' | 'disputeHeld' | 'total') =>
      round2(rows.reduce((a: number, r: any) => a + r[k], 0));
    return {
      projects: rows.filter((r: any) => r.total > 0),
      totals: { project: sum('projectHeld'), audit: sum('auditHeld'), dispute: sum('disputeHeld'), total: sum('total') },
    };
  }

  @Get('escrow/:taskId')
  @ApiOperation({ summary: 'Escrow held for one task (its parties and staff)' })
  escrow(@Param('taskId') taskId: string, @CurrentActor() actor: Actor) {
    const task = this.tasks.findById(taskId);
    assertCanViewTask(actor.id, actor.role, task, ...this.tasks.reviewersOf(taskId));
    return this.ledger.getEscrow(taskId);
  }
}

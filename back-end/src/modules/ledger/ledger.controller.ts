import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader } from '@nestjs/swagger';
import { LedgerService } from './ledger.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

/**
 * Read-only view of escrow and platform revenue.
 *
 * Deliberately minimal — the Admin revenue dashboard and its aggregations are
 * built on top of this in a later phase.
 */
@ApiTags('Ledger')
@Controller('ledger')
@UseGuards(RoleGuard)
export class LedgerController {
  constructor(private readonly ledger: LedgerService) {}

  @Get('summary')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
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

  @Get('escrow/:taskId')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'expert', 'superuser', 'revenue-admin', 'intake-admin', 'compliance-admin')
  @ApiOperation({ summary: 'Escrow held for one task' })
  escrow(@Param('taskId') taskId: string) {
    return this.ledger.getEscrow(taskId);
  }
}

import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditService } from './audit.service';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

/**
 * The compliance desk's own surface — the one capability no other role holds.
 *
 * Reads only. There is deliberately no route to write, edit or delete an
 * event: everything here is recorded by the middleware that watches requests,
 * and a trail an operator can amend is not evidence of anything.
 */
@ApiTags('Audit')
@Controller('audit-log')
@UseGuards(RoleGuard)
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles(ROLES.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'Read the audit trail (compliance only)' })
  @ApiQuery({ name: 'actorId', required: false })
  @ApiQuery({ name: 'actorRole', required: false })
  @ApiQuery({ name: 'kind', required: false, description: 'admin.read · admin.change · money · fee.change' })
  @ApiQuery({ name: 'from', required: false, description: 'ISO timestamp, inclusive' })
  @ApiQuery({ name: 'to', required: false, description: 'ISO timestamp, inclusive' })
  @ApiQuery({ name: 'limit', required: false, description: 'Default 200, max 1000' })
  findAll(
    @Query('actorId') actorId?: string,
    @Query('actorRole') actorRole?: string,
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('limit') limit?: string,
  ) {
    return this.audit.findAll({ actorId, actorRole, kind, from, to, limit: Number(limit) });
  }

  @Get('export')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles(ROLES.COMPLIANCE_ADMIN)
  @ApiOperation({ summary: 'The same rows as CSV' })
  export(
    @Res() res: Response,
    @Query('actorId') actorId?: string,
    @Query('actorRole') actorRole?: string,
    @Query('kind') kind?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const { events } = this.audit.findAll({ actorId, actorRole, kind, from, to, limit: 1000 });
    const stamp = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="lannent-audit-${stamp}.csv"`);
    res.send(this.audit.toCsv(events));
  }
}

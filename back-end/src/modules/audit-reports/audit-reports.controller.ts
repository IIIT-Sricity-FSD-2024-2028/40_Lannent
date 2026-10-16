import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditReportsService } from './audit-reports.service';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Audit Reports')
@Controller('audit-reports')
@UseGuards(RoleGuard)
export class AuditReportsController {
  constructor(private readonly auditReportsService: AuditReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit reports (supports ?taskId=&auditRequestId= filters)' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'auditRequestId', required: false })
  findAll(
    @Query('taskId') taskId?: string,
    @Query('auditRequestId') auditRequestId?: string,
    @CurrentActor() actor?: Actor,
  ) {
    return this.auditReportsService.findAll({ taskId, auditRequestId }, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit report by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.auditReportsService.findById(id, actor);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  // Previously unguarded — any caller could file an audit report, which now
  // releases money from escrow.
  @Roles('expert')
  @ApiOperation({ summary: 'Submit audit report (updates milestone status on pass/fail)' })
  create(@Body() dto: CreateAuditReportDto, @CurrentActor() actor: Actor) {
    return this.auditReportsService.create(dto, actor);
  }
}

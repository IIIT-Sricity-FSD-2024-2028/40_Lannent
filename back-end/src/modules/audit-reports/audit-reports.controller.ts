import { Controller, Get, Post, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AuditReportsService } from './audit-reports.service';
import { CreateAuditReportDto } from './dto/create-audit-report.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Audit Reports')
@Controller('audit-reports')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: false, description: 'User role' })
export class AuditReportsController {
  constructor(private readonly auditReportsService: AuditReportsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all audit reports (supports ?taskId=&auditRequestId= filters)' })
  @ApiQuery({ name: 'taskId', required: false })
  @ApiQuery({ name: 'auditRequestId', required: false })
  findAll(@Query('taskId') taskId?: string, @Query('auditRequestId') auditRequestId?: string) {
    return this.auditReportsService.findAll({ taskId, auditRequestId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get audit report by ID' })
  findOne(@Param('id') id: string) {
    return this.auditReportsService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Submit audit report (updates milestone status on pass/fail)' })
  create(@Body() dto: CreateAuditReportDto) {
    return this.auditReportsService.create(dto);
  }
}

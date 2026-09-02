import { Controller, Get, Patch, Body, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { RevenueService } from './revenue.service';
import { UpdateFeeConfigDto } from './dto/update-fee-config.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { ROLES } from '../../common/constants/roles';

/**
 * The Admin's view of the revenue model. Deliberately Admin-only: SuperUser
 * runs operations and does not need access to platform finances.
 */
@ApiTags('Revenue')
@Controller('revenue')
@UseGuards(RoleGuard)
@ApiHeader({ name: 'role', required: true, description: 'Admin role required' })
export class RevenueController {
  constructor(private readonly revenue: RevenueService) {}

  @Get('summary')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Headline figures: revenue, volume, take rate, escrow held' })
  summary() {
    return this.revenue.summary();
  }

  @Get('by-fee-type')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Revenue broken down by fee type' })
  byFeeType() {
    return this.revenue.byFeeType();
  }

  @Get('timeseries')
  @Roles(ROLES.ADMIN)
  @ApiQuery({ name: 'period', required: false, enum: ['day', 'week', 'month'] })
  @ApiOperation({ summary: 'Revenue over time' })
  timeseries(@Query('period') period?: string) {
    return this.revenue.timeseries(period || 'day');
  }

  @Get('by-user')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Per-user gross earned, fees paid and net received' })
  byUser() {
    return this.revenue.byUser();
  }

  @Get('distribution')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'How every escrowed dollar splits between workers, reviewers and the platform' })
  distribution() {
    return this.revenue.distribution();
  }

  @Get('by-project')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Every project with its platform revenue' })
  byProject() {
    return this.revenue.byProject();
  }

  @Get('project/:taskId')
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Complete money flow for one project',
    description: 'What the client paid, what the worker and reviewers took, split by audit vs dispute, and what the platform kept.',
  })
  projectBreakdown(@Param('taskId') taskId: string) {
    return this.revenue.projectBreakdown(taskId);
  }

  @Get('fee-config')
  @Roles(ROLES.ADMIN)
  @ApiOperation({ summary: 'Current fee rates' })
  getFeeConfig() {
    return this.revenue.getFeeConfig();
  }

  @Patch('fee-config')
  @Roles(ROLES.ADMIN)
  @ApiOperation({
    summary: 'Tune fee rates',
    description: 'Applies to future charges only — existing revenue keeps the rate it was charged at.',
  })
  updateFeeConfig(@Body() dto: UpdateFeeConfigDto) {
    return this.revenue.updateFeeConfig(dto);
  }
}

import { Controller, Get, Post, Patch, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto, SubmitDeliverableDto } from './dto/update-milestone.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(RoleGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all milestones (supports ?taskId= filter)' })
  @ApiQuery({ name: 'taskId', required: false })
  findAll(@Query('taskId') taskId?: string) {
    return this.milestonesService.findAll({ taskId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get milestone by ID' })
  findOne(@Param('id') id: string) {
    return this.milestonesService.findById(id);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Create a new milestone' })
  create(@Body() dto: CreateMilestoneDto) {
    return this.milestonesService.create(dto);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker', 'superuser')
  @ApiOperation({ summary: 'Update a milestone' })
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto) {
    return this.milestonesService.update(id, dto);
  }

  @Post(':id/submit')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('worker')
  @ApiOperation({ summary: 'Submit deliverable for a milestone' })
  submit(@Param('id') id: string, @Body() dto: SubmitDeliverableDto) {
    return this.milestonesService.submitDeliverable(id, dto.deliverable);
  }

  @Post(':id/approve')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Approve deliverable and release escrow payment' })
  approve(@Param('id') id: string) {
    return this.milestonesService.approveDeliverable(id);
  }
}

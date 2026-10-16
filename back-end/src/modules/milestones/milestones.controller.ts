import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { MilestonesService } from './milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto, SubmitDeliverableDto } from './dto/update-milestone.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Milestones')
@Controller('milestones')
@UseGuards(RoleGuard)
export class MilestonesController {
  constructor(private readonly milestonesService: MilestonesService) {}

  @Get()
  @ApiOperation({ summary: 'Get all milestones (supports ?taskId= filter)' })
  @ApiQuery({ name: 'taskId', required: false })
  findAll(@CurrentActor() actor: Actor, @Query('taskId') taskId?: string) {
    return this.milestonesService.findAll({ taskId }, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get milestone by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.milestonesService.findById(id, actor);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Create a new milestone' })
  create(@Body() dto: CreateMilestoneDto, @CurrentActor() actor: Actor) {
    return this.milestonesService.create(dto, actor);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'worker')
  @ApiOperation({ summary: 'Update a milestone' })
  update(@Param('id') id: string, @Body() dto: UpdateMilestoneDto, @CurrentActor() actor: Actor) {
    return this.milestonesService.update(id, dto, actor);
  }

  @Delete(':id')
  @Roles('client')
  @ApiOperation({ summary: 'Remove a milestone that has not started, before anyone is hired' })
  remove(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.milestonesService.remove(id, actor);
  }

  @Post(':id/submit')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('worker')
  @ApiOperation({ summary: 'Submit deliverable for a milestone' })
  submit(@Param('id') id: string, @Body() dto: SubmitDeliverableDto, @CurrentActor() actor: Actor) {
    return this.milestonesService.submitDeliverable(id, dto.deliverable, actor);
  }

  @Post(':id/approve')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Approve deliverable and release escrow payment' })
  approve(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.milestonesService.approveDeliverable(id, actor);
  }
}

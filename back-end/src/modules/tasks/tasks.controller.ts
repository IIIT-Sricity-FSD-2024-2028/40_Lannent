import { Controller, Get, Post, Patch, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentActor } from '../../common/decorators/actor.decorator';
import type { Actor } from '../../common/decorators/actor.decorator';

@ApiTags('Tasks')
@Controller('tasks')
@UseGuards(RoleGuard)
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Get()
  @ApiOperation({ summary: 'Get all tasks (supports filtering)' })
  @ApiQuery({ name: 'clientId', required: false })
  @ApiQuery({ name: 'workerId', required: false })
  @ApiQuery({ name: 'status', required: false })
  findAll(
    @CurrentActor() actor: Actor,
    @Query('clientId') clientId?: string,
    @Query('workerId') workerId?: string,
    @Query('status') status?: string,
  ) {
    return this.tasksService.findAll({ clientId, workerId, status }, actor);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.findById(id, actor);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Post a new project (clients only — the budget comes out of their own wallet)' })
  create(@Body() dto: CreateTaskDto, @CurrentActor() actor: Actor) {
    return this.tasksService.create(dto, actor);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Edit your own task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto, @CurrentActor() actor: Actor) {
    return this.tasksService.update(id, dto, actor);
  }

  @Get(':id/cancellation-quote')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({
    summary: 'What cancelling this project would cost and refund',
    description: 'Only a project nobody has been hired for can be cancelled. The fee depends on how long it has been live.',
  })
  cancellationQuote(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.cancellationQuote(id, actor);
  }

  @Get(':id/non-delivery')
  @Roles('client')
  @ApiOperation({ summary: 'Whether the contract can be ended because the worker stopped delivering' })
  nonDelivery(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.nonDeliveryStatus(id, actor);
  }

  @Post(':id/end-for-non-delivery')
  @Roles('client')
  @ApiOperation({
    summary: 'End a contract the worker stopped delivering on',
    description: 'Paid milestones stay paid; undelivered milestones are cancelled and refunded. No fee.',
  })
  endForNonDelivery(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.endForNonDelivery(id, actor);
  }

  @Post(':id/cancel-draft')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({
    summary: 'Abandon a draft project',
    description: 'Cancels a project still awaiting its technical audit and refunds any audit escrow.',
  })
  cancelDraft(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.cancelDraft(id, actor);
  }

  @Delete(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Delete a project that never started' })
  remove(@Param('id') id: string, @CurrentActor() actor: Actor) {
    return this.tasksService.delete(id, actor);
  }
}

import { Controller, Get, Post, Patch, Delete, Param, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { RoleGuard } from '../../common/guards/role.guard';
import { Roles } from '../../common/decorators/roles.decorator';

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
    @Query('clientId') clientId?: string,
    @Query('workerId') workerId?: string,
    @Query('status') status?: string,
    @Headers('user-id') userId?: string,
  ) {
    // viewerId lets a client see their own draft projects in an unfiltered
    // listing; drafts stay hidden from everyone else.
    return this.tasksService.findAll({ clientId, workerId, status, viewerId: userId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get task by ID' })
  findOne(@Param('id') id: string) {
    return this.tasksService.findById(id);
  }

  @Post()
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Create a new task' })
  create(@Body() dto: CreateTaskDto) {
    return this.tasksService.create(dto);
  }

  @Patch(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({ summary: 'Update a task' })
  update(@Param('id') id: string, @Body() dto: UpdateTaskDto) {
    return this.tasksService.update(id, dto);
  }

  @Post(':id/cancel-draft')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client')
  @ApiOperation({
    summary: 'Abandon a draft project',
    description: 'Cancels a project still awaiting its technical audit and refunds any audit escrow.',
  })
  cancelDraft(@Param('id') id: string) {
    return this.tasksService.cancelDraft(id);
  }

  @Delete(':id')
  @ApiHeader({ name: 'role', required: true, description: 'User role required' })
  @Roles('client', 'superuser')
  @ApiOperation({ summary: 'Delete a task' })
  remove(@Param('id') id: string) {
    return this.tasksService.delete(id);
  }
}

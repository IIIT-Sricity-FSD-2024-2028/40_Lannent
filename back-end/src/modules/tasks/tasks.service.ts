import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { TasksRepository } from './tasks.repository';

/**
 * TasksService — Business Logic Layer
 *
 * Handles validation and error handling.
 * Delegates all data-access operations to TasksRepository.
 */
@Injectable()
export class TasksService {
  constructor(private readonly tasksRepository: TasksRepository) {}

  findAll(query?: { clientId?: string; workerId?: string; status?: string }) {
    return this.tasksRepository.findAll(query);
  }

  findById(id: string) {
    const task = this.tasksRepository.findById(id);
    if (!task) throw new NotFoundException(`Task with id "${id}" not found`);
    return task;
  }

  create(dto: CreateTaskDto) {
    const task = {
      id: this.tasksRepository.generateId(),
      status: 'open',
      progress: 0,
      workerId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      currency: dto.currency || 'USD',
      skills: dto.skills || [],
      auditEnabled: dto.auditEnabled || false,
      ...dto,
    };
    return this.tasksRepository.insert(task);
  }

  update(id: string, dto: UpdateTaskDto) {
    const updated = this.tasksRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Task with id "${id}" not found`);
    return updated;
  }

  delete(id: string) {
    const deleted = this.tasksRepository.deleteById(id);
    if (!deleted) throw new NotFoundException(`Task with id "${id}" not found`);
    return { deleted: true };
  }

  resetToSeed() {
    this.tasksRepository.resetToSeed();
  }
}

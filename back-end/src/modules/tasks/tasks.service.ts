import { Injectable, NotFoundException } from '@nestjs/common';
import { SEED_TASKS } from '../seed/seed.data';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TasksService {
  private tasks: any[] = JSON.parse(JSON.stringify(SEED_TASKS));
  private counter = 100;

  private generateId(): string {
    return 't_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { clientId?: string; workerId?: string; status?: string }) {
    let result = this.tasks;
    if (query?.clientId) result = result.filter(t => t.clientId === query.clientId);
    if (query?.workerId) result = result.filter(t => t.workerId === query.workerId);
    if (query?.status) result = result.filter(t => t.status === query.status);
    return result;
  }

  findById(id: string) {
    const task = this.tasks.find(t => t.id === id);
    if (!task) throw new NotFoundException(`Task with id "${id}" not found`);
    return task;
  }

  create(dto: CreateTaskDto) {
    const task = {
      id: this.generateId(),
      status: 'open',
      progress: 0,
      workerId: null,
      createdAt: new Date().toISOString().slice(0, 10),
      currency: dto.currency || 'USD',
      skills: dto.skills || [],
      auditEnabled: dto.auditEnabled || false,
      ...dto,
    };
    this.tasks.push(task);
    return task;
  }

  update(id: string, dto: UpdateTaskDto) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new NotFoundException(`Task with id "${id}" not found`);
    this.tasks[idx] = { ...this.tasks[idx], ...dto };
    return this.tasks[idx];
  }

  delete(id: string) {
    const idx = this.tasks.findIndex(t => t.id === id);
    if (idx === -1) throw new NotFoundException(`Task with id "${id}" not found`);
    this.tasks.splice(idx, 1);
    return { deleted: true };
  }

  resetToSeed() {
    this.tasks = JSON.parse(JSON.stringify(SEED_TASKS));
  }
}

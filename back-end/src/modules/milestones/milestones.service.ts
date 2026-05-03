import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { SEED_MILESTONES } from '../seed/seed.data';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class MilestonesService {
  private milestones: any[] = JSON.parse(JSON.stringify(SEED_MILESTONES));
  private counter = 100;

  constructor(
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
  ) {}

  private generateId(): string {
    return 'm_' + Date.now() + '_' + (this.counter++);
  }

  findAll(query?: { taskId?: string }) {
    let result = this.milestones;
    if (query?.taskId) result = result.filter(m => m.taskId === query.taskId);
    return result;
  }

  findById(id: string) {
    const ms = this.milestones.find(m => m.id === id);
    if (!ms) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return ms;
  }

  create(dto: CreateMilestoneDto) {
    const ms = {
      id: this.generateId(),
      status: 'pending',
      submittedAt: null,
      approvedAt: null,
      deliverable: null,
      progress: 0,
      priority: dto.priority || 'Medium',
      dueDate: dto.dueDate || null,
      ...dto,
    };
    this.milestones.push(ms);
    return ms;
  }

  update(id: string, dto: UpdateMilestoneDto) {
    const idx = this.milestones.findIndex(m => m.id === id);
    if (idx === -1) throw new NotFoundException(`Milestone with id "${id}" not found`);
    this.milestones[idx] = { ...this.milestones[idx], ...dto };
    return this.milestones[idx];
  }

  submitDeliverable(id: string, deliverable?: any) {
    const ms = this.findById(id);
    ms.status = 'submitted';
    ms.submittedAt = new Date().toISOString().slice(0, 10);
    if (deliverable) ms.deliverable = deliverable;

    // If task has auditEnabled, create audit request
    try {
      const task = this.tasksService.findById(ms.taskId);
      if (task && task.auditEnabled) {
        let workerName = 'Worker';
        try { workerName = this.usersService.findById(ms.workerId)?.name || 'Worker'; } catch {}
        this.auditRequestsService.create({
          taskId: ms.taskId,
          milestoneId: id,
          workerId: ms.workerId,
          clientId: task.clientId,
          expertId: undefined,
          status: 'Pending',
          severity: 'Medium',
          project: task.title,
          worker: workerName,
          milestone: ms.title,
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
        });
      }
    } catch {}

    return ms;
  }

  approveDeliverable(id: string) {
    const ms = this.findById(id);
    ms.status = 'completed';
    ms.approvedAt = new Date().toISOString().slice(0, 10);
    ms.progress = 100;

    // Create release transaction and pay worker
    try {
      this.transactionsService.create({
        type: 'milestone-release',
        amount: ms.budget,
        fromId: 'escrow',
        toId: ms.workerId,
        taskId: ms.taskId,
        milestoneId: id,
        description: `Payment for ${ms.title}`,
        status: 'completed',
      });
      this.usersService.addToWallet(ms.workerId, ms.budget);
    } catch {}

    // Check task completion
    this.checkTaskCompletion(ms.taskId);

    return ms;
  }

  checkTaskCompletion(taskId: string) {
    if (!taskId) return;
    try {
      const task = this.tasksService.findById(taskId);
      const allMilestones = this.milestones.filter(m => m.taskId === taskId);
      if (!allMilestones.length) return;

      const done = allMilestones.filter(m =>
        ['completed', 'approved', 'audit-passed', 'done'].includes(m.status)
      ).length;
      const pct = Math.round((done / allMilestones.length) * 100);

      this.tasksService.update(taskId, {
        progress: pct,
        status: pct === 100 ? 'completed' : 'in-progress',
      });
    } catch {}
  }

  resetToSeed() {
    this.milestones = JSON.parse(JSON.stringify(SEED_MILESTONES));
  }
}

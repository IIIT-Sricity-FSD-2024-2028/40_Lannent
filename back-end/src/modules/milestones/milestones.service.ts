import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { MilestonesRepository } from './milestones.repository';
import { TasksService } from '../tasks/tasks.service';
import { UsersService } from '../users/users.service';
import { TransactionsService } from '../transactions/transactions.service';
import { AuditRequestsService } from '../audit-requests/audit-requests.service';
import { NotificationsService } from '../notifications/notifications.service';

/**
 * MilestonesService — Business Logic Layer
 *
 * Handles submission, approval, audit-request creation, and task-completion checks.
 * Delegates all data-access operations to MilestonesRepository.
 */
@Injectable()
export class MilestonesService {
  constructor(
    private readonly milestonesRepository: MilestonesRepository,
    @Inject(forwardRef(() => TasksService)) private tasksService: TasksService,
    @Inject(forwardRef(() => UsersService)) private usersService: UsersService,
    @Inject(forwardRef(() => TransactionsService)) private transactionsService: TransactionsService,
    @Inject(forwardRef(() => AuditRequestsService)) private auditRequestsService: AuditRequestsService,
    @Inject(forwardRef(() => NotificationsService)) private notificationsService: NotificationsService,
  ) {}

  findAll(query?: { taskId?: string }) {
    return this.milestonesRepository.findAll(query);
  }

  findById(id: string) {
    const ms = this.milestonesRepository.findById(id);
    if (!ms) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return ms;
  }

  create(dto: CreateMilestoneDto) {
    const ms = {
      id: this.milestonesRepository.generateId(),
      status: 'pending',
      submittedAt: null,
      approvedAt: null,
      deliverable: null,
      progress: 0,
      priority: dto.priority || 'Medium',
      dueDate: dto.dueDate || null,
      ...dto,
    };
    return this.milestonesRepository.insert(ms);
  }

  update(id: string, dto: UpdateMilestoneDto) {
    const updated = this.milestonesRepository.update(id, dto);
    if (!updated) throw new NotFoundException(`Milestone with id "${id}" not found`);
    return updated;
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
      const allMilestones = this.milestonesRepository.filterByTaskId(taskId);
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
    this.milestonesRepository.resetToSeed();
  }
}
